"""wm_video — 视频关键帧隐形水印（首帧+中帧 overlay，单命令重编码）。

实测依据：dwtDctSvd 嵌入帧经 H.264 crf23 转码 0 误码；本管线重编码 CRF18 更松。
方案：ffmpeg overlay 在 n=0 与中点帧全屏覆盖嵌入帧，音轨/其余帧透传，一次重编码。

用法：
    from wm_video import embed, detect
    embed("in.mp4", wm_bytes, "out.mp4")
    votes, frames = detect("out.mp4")   # votes: 命中帧数
"""
import pathlib
import subprocess

from wm_image import decode

FF = "ffmpeg"
PROBE = "ffprobe"


def _dur(path) -> float:
    r = subprocess.run([PROBE, "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    out = r.stdout.strip()
    if not out:
        raise FileNotFoundError(f"文件不存在或非视频: {path}")
    return float(out)


def _frames(path) -> int:
    r = subprocess.run([PROBE, "-v", "error", "-select_streams", "v:0",
                        "-show_entries", "stream=nb_frames", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except ValueError:                     # 部分容器无 nb_frames（N/A）
        return int(_dur(path) * _fps(path))


def _fps(path) -> float:
    r = subprocess.run([PROBE, "-v", "error", "-select_streams", "v:0",
                        "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    parts = r.stdout.strip().split("/")
    if len(parts) != 2 or not parts[0]:
        return 24.0                              # 防御默认（H3 标称帧率）
    num, den = parts
    return float(num) / float(den or 1)


def embed(video, wm: bytes, out, crf=18, all_frames: bool = False, **kw) -> str:
    """嵌入水印。

    all_frames=False：首帧+中点帧 overlay（快，秒级）
    all_frames=True ：全帧逐帧嵌入（deep 档：抗二压/抽帧，每帧含完整 RS 位流；
                      362 帧约 2 分钟 CPU）
    """
    from wm_image import embed as img_embed
    src = pathlib.Path(video)
    tmp = src.parent
    if not all_frames:
        f0, f1 = tmp / "_wm_f0.png", tmp / "_wm_f1.png"
        subprocess.run([FF, "-y", "-v", "error", "-i", str(src),
                        "-frames:v", "1", str(f0)], check=True)
        img_embed(f0, wm, f0)
        subprocess.run([FF, "-y", "-v", "error", "-ss", str(_dur(src) / 2),
                        "-i", str(src), "-frames:v", "1", str(f1)], check=True)
        img_embed(f1, wm, f1)

        mid = _frames(src) // 2
        mid_t = _dur(src) / 2
        vf = (f"[0:v][1:v]overlay=enable='eq(n,0)'[a];"
              f"[a][2:v]overlay=enable='eq(n,{mid})'[v]")
        subprocess.run([FF, "-y", "-v", "error", "-i", str(src), "-i", str(f0),
                        "-i", str(f1),
                        "-filter_complex", vf, "-map", "[v]", "-map", "0:a?",
                        "-force_key_frames", f"0,{mid_t:.3f}",
                        "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast",
                        "-pix_fmt", "yuv420p", "-c:a", "copy", str(out)],
                       check=True, timeout=3600)
        f0.unlink(missing_ok=True)
        f1.unlink(missing_ok=True)
        return str(out)

    # ---- 全帧模式：抽帧序列 → 逐帧嵌入 → 序列回写 + 音轨 ----
    frames_dir = tmp / "_wm_frames"
    frames_dir.mkdir(exist_ok=True)
    subprocess.run([FF, "-y", "-v", "error", "-i", str(src),
                    str(frames_dir / "f%05d.png")], check=True)
    pngs = sorted(frames_dir.glob("f*.png"))
    from wm_image import embed as img_embed
    wm_dir = tmp / "_wm_out"
    wm_dir.mkdir(exist_ok=True)
    for i, p in enumerate(pngs):
        img_embed(p, wm, wm_dir / p.name)
        if i % 60 == 0:
            print(f"    全帧嵌入 {i}/{len(pngs)}", flush=True)
    proc = subprocess.Popen(
        [FF, "-y", "-v", "error", "-framerate", "24", "-i", str(wm_dir / "f%05d.png"),
         "-i", str(src), "-map", "0:v", "-map", "1:a:0",
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast",
         "-pix_fmt", "yuv420p", "-c:a", "copy", str(out)],
        stdin=subprocess.PIPE)
    proc.communicate()
    for d in (frames_dir, wm_dir):
        for f in d.glob("*.png"):
            f.unlink()
        d.rmdir()
    return str(out)


def detect(video, samples: int = 3) -> tuple[int, list[dict], bytes | None]:
    """抽首/中/尾帧多基准解码投票。返回 (命中帧数, 各帧记录, 8B ID|None)。"""
    total = _frames(video)
    dur = _dur(video)
    points = sorted({0, total // 2, max(total - 1, 0)}) if samples == 3 else \
        [int(total * i / samples) for i in range(samples)]
    frames_report, payload = [], None
    for i, nf in enumerate(points):
        f = pathlib.Path(video).parent / f"_wm_chk{i}.png"
        subprocess.run([FF, "-y", "-v", "error", "-ss", str(min(nf / _fps(video), dur - 0.05)),
                        "-i", str(video), "-frames:v", "1", str(f)], check=True)
        hit, p, tries = decode(f)
        frames_report.append({"frame": nf, "hit": hit, "tries": tries})
        if hit and payload is None:
            payload = p
        f.unlink(missing_ok=True)
    votes = sum(1 for fr in frames_report if fr["hit"])
    return votes, frames_report, payload
