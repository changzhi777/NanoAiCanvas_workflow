"""合成器 — 音频拼接 + KenBurns 图文卡 + SRT 烧录 + BGM 混音。

用法：
    from assemble import assemble
    assemble(timeline, cards, cfg)   # → out/final.mp4

原则：时长全部来自 timeline（ffprobe 实测），BGM 缺文件自动跳过不阻断。
"""
import json
import pathlib
import re
import shutil
import subprocess

HERE = pathlib.Path(__file__).parent

# 烧录字幕需要 libass；系统 ffmpeg 缺滤镜时用项目自带静态构建（bin/ffmpeg）
_BUNDLED = HERE / "bin" / "ffmpeg"
FFMPEG = str(_BUNDLED) if _BUNDLED.exists() else (shutil.which("ffmpeg") or "ffmpeg")
FFPROBE = shutil.which("ffprobe") or "ffprobe"


def _run(cmd: list[str]):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg 失败: {r.stderr[-400:]}")


def _has_filter(name: str) -> bool:
    """当前 ffmpeg 是否带指定滤镜（libass 烧录能力探测）。"""
    try:
        r = subprocess.run([FFMPEG, "-hide_banner", "-filters"],
                           capture_output=True, text=True, timeout=30)
        return name in r.stdout
    except Exception:
        return False


_TTS_MARK = re.compile(
    r"<#\d+(?:\.\d+)?#>"                                   # 停顿标记 <#0.5#>
    r"|\((?:laughs|chuckle|coughs|clear-throat|groans|breath|pant|inhale|exhale"
    r"|gasps|sniffs|sighs|snorts|burps|lip-smacking|humming|hissing|emm|sneezes)\)",
    re.IGNORECASE)


def _clean_for_subtitle(text: str) -> str:
    """剥离 TTS 控制标记 —— 字幕只显示给眼睛看的内容，标记是给引擎的。"""
    return _TTS_MARK.sub("", text)


def _split_sentences(text: str, start: float, end: float) -> list[tuple[float, float, str]]:
    """长段按句切条 + 超长句按逗号二级切分 + 按字数比例分配时间。

    竖屏字幕单条 ≤2 行（约 26 字），不糊满画面。
    """
    raw = [s for s in re.split(r"(?<=[。！？；])", text) if s.strip()]
    # 二级切分：超 26 字的句子按逗号/顿号切，再贪心合并到 ≤26 字
    chunks: list[str] = []
    for s in raw:
        if len(s) <= 26:
            chunks.append(s)
            continue
        buf = ""
        for p in [x for x in re.split(r"(?<=[，、])", s) if x.strip()]:
            if len(buf) + len(p) <= 26:
                buf += p
            else:
                if buf:
                    chunks.append(buf)
                buf = p
        if buf:
            chunks.append(buf)
    if len(chunks) <= 1:
        return [(start, end, text)]
    total = sum(len(c) for c in chunks) or 1
    out, t = [], start
    for c in chunks:
        d = (end - start) * len(c) / total
        out.append((t, round(t + d, 3), c))
        t += d
    return out


def build_srt(timeline: dict, path: pathlib.Path, sub_cfg: dict, wrap_width: int = 14):
    def ts(sec: float) -> str:
        ms = int(round(sec * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def wrap(text: str, width: int = sub_cfg.get("wrap", 14)) -> str:
        """长句折行（竖屏单行超 14 字会溢出画幅；生产 srt_generator 同款策略）。"""
        return "\n".join(text[i:i + width] for i in range(0, len(text), width))

    blocks, idx = [], 0
    for e in timeline["lines"]:
        clean = _clean_for_subtitle(e["text"])
        for (s, t, sent) in _split_sentences(clean, e["start"], e["end"]):
            idx += 1
            blocks.append(f"{idx}\n{ts(s)} --> {ts(t)}\n{wrap(sent)}\n")
    path.write_text("\n".join(blocks), encoding="utf-8")


def _kenburns_filter(idx: int, fps: int) -> str:
    """四种运动轮换：推近 / 拉远 / 左移 / 右移。"""
    z_in = (f"zoompan=z='min(zoom+0.0006,1.15)':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'")
    z_out = (f"zoompan=z='if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0006))':"
             f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'")
    pan_l = (f"zoompan=z='1.12':"
             f"x='(iw-iw/zoom)*(on/{fps * 12})':y='ih/2-(ih/zoom/2)'")
    pan_r = (f"zoompan=z='1.12':"
             f"x='(iw-iw/zoom)*(1-on/{fps * 12})':y='ih/2-(ih/zoom/2)'")
    return [z_in, z_out, pan_l, pan_r][idx % 4]


def _make_clip(image: str, duration: float, idx: int, size: tuple, fps: int, out: pathlib.Path):
    w, h = size
    # cover 行为：非 9:16 源图（如 image01 仅 1:1）按比例放大后居中裁切，避免拉伸变形
    vf = (f"scale={w * 4}:{h * 4}:force_original_aspect_ratio=increase,"
          f"crop={w * 4}:{h * 4},"
          + _kenburns_filter(idx, fps) +
          f":d={int(duration * fps) + 1}:s={w}x{h}:fps={fps},"
          f"format=yuv420p")
    _run([FFMPEG, "-y", "-loop", "1", "-i", image,
          "-filter_complex", vf, "-t", f"{duration:.3f}",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(out)])


def _concat_audio(timeline: dict, gap: float, sr: int, out: pathlib.Path) -> float:
    """句音频 + 静音间隔拼接 → voice.mp3；返回总时长。"""
    sil = out / "sil.mp3"
    _run([FFMPEG, "-y", "-f", "lavfi",
          "-i", f"anullsrc=r={sr}:cl=mono", "-t", f"{gap:.3f}",
          "-c:a", "libmp3lame", "-q:a", "4", str(sil)])
    lst = out / "audio_list.txt"
    lines = []
    for i, e in enumerate(timeline["lines"]):
        lines.append(f"file '{e['audio']}'")
        if i < len(timeline["lines"]) - 1:
            lines.append(f"file '{sil}'")
    lst.write_text("\n".join(lines), encoding="utf-8")
    _run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c:a", "libmp3lame", "-q:a", "2", str(out / "voice.mp3")])
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(out / "voice.mp3")],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def _make_hero_clip(video: str, duration: float, size: tuple, out: pathlib.Path):
    """爆点视频片段：cover 裁切到规格 + 截到指定时长（不足则循环补足）。"""
    w, h = size
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
          f"crop={w}:{h},fps=30,format=yuv420p")
    _run([FFMPEG, "-y", "-stream_loop", "-1", "-i", video,
          "-vf", vf, "-t", f"{duration:.3f}",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(out)])


def assemble(timeline: dict, cards: list[str], cfg: dict,
             hero_front: str | None = None, hero_back: str | None = None,
             external_audio: str | None = None,
             external_srt: str | None = None) -> pathlib.Path:
    out = HERE / "out"
    work = out / "work"
    work.mkdir(parents=True, exist_ok=True)
    d = cfg["defaults"]
    fps = 30
    size = tuple(d["image"].get("out_size", [720, 1280]))

    # 1. 片段构建：单口播按句、对谈按 groups 组，统一分段渲染
    #    段时长 = 内容时长 + 句间停顿（末段不含），与音频侧严格对齐；
    #    首/末段有爆点视频时：段首（或段尾）插 hero，剩余时长用插画补足
    clips = []
    gap = d["sentence_gap"]
    groups = timeline.get("groups")
    ext = timeline.get("mode") == "external"
    if ext:
        # 外部解说：段时长 = 下一段起点 - 本段起点（音轨段间真实停顿 1s 级，非 config 的 gap）
        starts = [ln["start"] for ln in timeline["lines"]]
        starts[0] = 0.0                      # 音轨头部空隙并入首段
        total = timeline["total"]
        n_lines = len(timeline["lines"])
        segs = [{"idx": i, "card": cards[i],
                 "dur": (starts[i + 1] if i + 1 < n_lines else total) - starts[i],
                 "first": i == 0, "last": i == n_lines - 1}
                for i in range(n_lines)]
    elif groups:
        segs = [{"idx": g["card"], "card": cards[gi],
                 "dur": (g["end"] - g["start"]) + (gap if gi < len(groups) - 1 else 0),
                 "first": gi == 0, "last": gi == len(groups) - 1}
                for gi, g in enumerate(groups)]
    else:
        n = len(timeline["lines"])
        segs = [{"idx": e["id"], "card": cards[e["id"]],
                 "dur": (e["end"] - e["start"]) + (gap if e["id"] < n - 1 else 0),
                 "first": e["id"] == 0, "last": e["id"] == n - 1}
                for e in timeline["lines"]]
    for s in segs:
        dur = s["dur"]
        hero = hero_front if s["first"] else (hero_back if s["last"] else None)
        if hero:
            hero_dur = min(float(cfg.get("hero", {}).get("duration", 6)), dur - 0.4)
            if hero_dur >= 2:
                hc = work / f"hero_{s['idx']:02d}.mp4"
                if not hc.exists():
                    _make_hero_clip(hero, hero_dur, size, hc)
                rest = dur - hero_dur
                rc = work / f"clip_{s['idx']:02d}_rest_{rest:.1f}s.mp4"
                if rest > 0.4:
                    if not rc.exists():
                        _make_clip(s["card"], rest, s["idx"], size, fps, rc)
                    # 首段 hero 打头，末段 hero 收尾
                    clips += [hc, rc] if s["first"] else [rc, hc]
                else:
                    clips.append(hc)
                print(f"  ✓ 片段 #{s['idx']:02d} 爆点 {hero_dur:.1f}s + 插画 {max(rest, 0):.1f}s")
                continue
        clip = work / f"clip_{s['idx']:02d}_{dur:.1f}s.mp4"
        if not clip.exists():
            _make_clip(s["card"], dur, s["idx"], size, fps, clip)
        clips.append(clip)
        print(f"  ✓ 片段 #{s['idx']:02d} {dur:.1f}s")

    # 2. 拼视频
    vlist = work / "video_list.txt"
    vlist.write_text("\n".join(f"file '{c}'" for c in clips), encoding="utf-8")
    video = work / "video.mp4"
    _run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(vlist),
          "-c", "copy", str(video)])

    # 3. 音轨：外部解说直用（跳过 TTS 拼接），否则拼接逐句音频
    if external_audio:
        voice_src = str(pathlib.Path(external_audio).resolve())  # ffmpeg cwd=out，必须绝对路径
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", voice_src], capture_output=True, text=True)
        voice_dur = float(r.stdout.strip())
        print(f"  ✓ 外部解说音轨 {voice_dur:.1f}s")
    else:
        voice_src = "work/voice.mp3"
        voice_dur = _concat_audio(timeline, d["sentence_gap"], d["audio"]["sample_rate"], work)
        print(f"  ✓ 口播音轨 {voice_dur:.1f}s")

    # 4. BGM（缺文件跳过）
    style = cfg["defaults"]["style"]
    bgm_name = cfg["styles"][style].get("bgm") or ""
    bgm = HERE / "assets" / "bgm" / bgm_name
    has_bgm = bool(bgm_name) and bgm.exists() and not cfg.get("_no_bgm")
    if not has_bgm:
        print(f"  ⚠ BGM 缺失（{bgm}），跳过混音")

    # 5. SRT：外部精确定时直用，否则按时间轴生成
    srt = out / "final.srt"
    if external_srt:
        shutil.copy(pathlib.Path(external_srt).resolve(), srt)
        print("  ✓ 外部精确定时字幕")
    else:
        build_srt(timeline, srt, d["subtitle"], wrap_width=d["subtitle"].get("wrap", 14))

    # 6. 总装：视频 + 口播 (+BGM) + 字幕
    #    烧录需 libass；探测不到则降级内嵌软字幕（任何环境都能出片）
    #    字幕滤镜路径转义是重灾区 → cwd 切到 out/ 用相对路径，零转义
    pr = d["subtitle"].get("playres", [1280, 720])
    sub_style = (f"PlayResX={pr[0]},PlayResY={pr[1]},"
                 f"FontSize={d['subtitle']['font_size']},MarginV={d['subtitle']['margin_v']},"
                 f"Outline={d['subtitle']['outline']},PrimaryColour=&H00FFFFFF,"
                 f"OutlineColour=&H00000000,Bold=1")
    burn_ok = _has_filter("subtitles")
    final = out / "final.mp4"
    # 输入区（索引必须稳定：video=0, voice=1, [bgm=2], [srt=last]）
    cmd = [FFMPEG, "-y", "-i", "work/video.mp4", "-i", voice_src]
    if has_bgm:
        cmd += ["-stream_loop", "-1", "-i", str(bgm)]
    srt_idx = None
    if not burn_ok:
        srt_idx = len([x for x in cmd if x == "-i"])
        cmd += ["-i", "final.srt"]
        print("  ⚠ 当前 ffmpeg 无 libass → 字幕改为内嵌软字幕（final.srt 同目录留档可后期烧录）")
    # 输出区
    if has_bgm:
        mix = (f"[1:a]volume=1.0[v];[2:a]volume={d['bgm_volume']}[b];"
               f"[v][b]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]")  # normalize=0：防 amix 按 1/n 衰减拉低人声
        cmd += ["-filter_complex", mix, "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    if srt_idx is not None:
        cmd += ["-map", f"{srt_idx}:s", "-c:s", "mov_text"]
    else:
        cmd += ["-vf", f"subtitles=final.srt:force_style='{sub_style}'"]
    cmd += ["-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-c:a", "aac", "-b:a", "128k", "final.mp4"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=out)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg 失败: {r.stderr[-400:]}")

    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(final)], capture_output=True, text=True)
    print(f"✓ 成片 {final}  {float(r.stdout.strip()):.1f}s")
    return final


if __name__ == "__main__":
    import argparse
    import yaml
    ap = argparse.ArgumentParser()
    ap.add_argument("--style", choices=["tech", "culture"], help="覆盖风格（决定 BGM 选曲）")
    ap.add_argument("--external-audio", help="外部解说音轨（跳过 TTS 拼接）")
    ap.add_argument("--external-srt", help="外部精确定时字幕（跳过 timeline 生成）")
    ap.add_argument("--no-bgm", action="store_true", help="不加 BGM（外部解说自带氛围时）")
    args = ap.parse_args()
    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))
    if args.style:
        cfg["defaults"]["style"] = args.style
    tl = json.loads((HERE / "out" / "timeline.json").read_text(encoding="utf-8"))
    cdir = HERE / "out" / "cards"
    cards = sorted(str(p) for p in cdir.glob("group_*.png")) or sorted(str(p) for p in cdir.glob("card_*.png"))
    hf = HERE / "out" / "hero_front.mp4"
    hb = HERE / "out" / "hero_back.mp4"
    if args.no_bgm:
        cfg["_no_bgm"] = True   # 真正不混那一路（非音量归零）
    assemble(tl, cards, cfg,
             hero_front=str(hf) if hf.exists() else None,
             hero_back=str(hb) if hb.exists() else None,
             external_audio=args.external_audio,
             external_srt=args.external_srt)
