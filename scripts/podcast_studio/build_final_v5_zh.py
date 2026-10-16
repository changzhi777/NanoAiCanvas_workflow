"""V5 终版组装 —— 中文知识图卡（9 张）+ 数字人口型首尾 + 解说原声 + BGM。

时间线（胡总解说轴 230.5s）：
  0-15s      lipsync_open（数字人对口型·开场）
  15-215s    中文知识图卡轮播（每段一张，共 9 张）
  215-230.5s lipsync_close（数字人对口型·收束+感谢关注）
音轨：narr_open + narr_mid + narr_close 三段拼（全片音色一致）
BGM：流光 0.18 垫全片
字幕：external.srt（ASR 词级）
"""
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
OUT = HERE / "out"
FF = "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/bin/ffmpeg"
W, H, FPS = 1280, 720, 30
OPEN_END = 15.0
CLOSE_START = 214.8

def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900, cwd=cwd)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg: {r.stderr[-400:]}")

def dur_of(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())

tl = json.loads((OUT / "timeline.json").read_text(encoding="utf-8"))
lines = tl["lines"]
n = len(lines)
starts = [ln["start"] for ln in lines]
starts[0] = 0.0
total = dur_of(HERE / "assets" / "voice" / "huzong_narration.mp3")

work = OUT / "work_v5"
work.mkdir(parents=True, exist_ok=True)

# ---- 中文图卡映射（zh 系列 9 张，按段 1-9 顺序）----
zh_dir = OUT / "cards_v3_nb21_zh"
ZH_CARDS = ["zh_B1_机器接管劳动", "zh_B2_价值支点的崩塌", "zh_C1_虚拟世界的玻璃幕",
            "zh_C2_直面自己", "zh_B3_从向外到向内", "zh_C3_安静觉察",
            "zh_B4_觉知不可替代", "zh_C4_本自圆满", "zh_C5_只为成为自己"]
card_map = {p.name.rsplit(".", 1)[0]: str(p) for p in zh_dir.glob("zh_*.png")}

# ---- 段计划 ----
seg_plan = [{"type": "lipsync", "video": str(OUT / "lipsync_open.mp4"), "start": 0, "end": OPEN_END}]
for i in range(1, n):
    s = max(starts[i], OPEN_END)
    e = min(starts[i + 1] if i + 1 < n else CLOSE_START, total)
    if e - s < 0.5:
        continue
    seg_plan.append({"type": "card", "card": card_map[ZH_CARDS[(i - 1) % 9]],
                     "start": s, "end": e})
seg_plan.append({"type": "lipsync", "video": str(OUT / "lipsync_close.mp4"),
                 "start": CLOSE_START, "end": total})

# ---- 渲染各段 ----
clips = []
for i, sp in enumerate(seg_plan):
    dur = sp["end"] - sp["start"]
    clip = work / f"seg_{i:02d}.mp4"
    if clip.exists():
        clips.append(clip)
        continue
    vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
          f"fps={FPS},format=yuv420p")
    if sp["type"] == "lipsync":
        run([FF, "-y", "-i", sp["video"], "-vf", vf, "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    else:
        vf = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,"
              f"crop={W * 2}:{H * 2},"
              f"zoompan=z='min(zoom+0.0005,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
              f"d={int(dur * FPS) + 1}:s={W}x{H}:fps={FPS},format=yuv420p")
        run([FF, "-y", "-loop", "1", "-i", sp["card"], "-vf", vf, "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    clips.append(clip)
    print(f"  ✓ 段{i:02d} {dur:.1f}s [{'口型' if sp['type']=='lipsync' else '图卡'}]", flush=True)

# ---- 视频拼接 ----
vlist = work / "v.txt"
vlist.write_text("\n".join(f"file '{c}'" for c in clips), encoding="utf-8")
video = work / "video.mp4"
run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(vlist), "-c", "copy", str(video)])
print(f"✓ 视频轨 {dur_of(video):.1f}s", flush=True)

# ---- 音轨三段拼（先统一转 wav，避免混合容器/非标编码 concat 炸）----
for src, dst in [(OUT / "lipsync_open.mp4", work / "a_open.wav"),
                 (OUT / "narr_mid.mp3", work / "a_mid.wav"),
                 (OUT / "lipsync_close.mp4", work / "a_close.wav")]:
    run([FF, "-y", "-i", str(src), "-vn", "-ar", "44100", "-ac", "2",
         "-c:a", "pcm_s16le", str(dst)])
alist = work / "a.txt"
alist.write_text("\n".join([
    f"file '{work / 'a_open.wav'}'",
    f"file '{work / 'a_mid.wav'}'",
    f"file '{work / 'a_close.wav'}'",
]), encoding="utf-8")
voice = work / "voice_full.wav"
run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(alist),
     "-c:a", "pcm_s16le", str(voice)])
print(f"✓ 音轨 {dur_of(voice):.1f}s", flush=True)

# ---- 字幕 ----
srt = work / "sub.srt"
srt.write_text((OUT / "external.srt").read_text(encoding="utf-8"), encoding="utf-8")

# ---- 总装 ----
bgm = HERE / "assets" / "bgm" / "awakening.mp3"
final = OUT / "final_v5_zh_cards.mp4"
sub_style = "PlayResX=1280,PlayResY=720,FontSize=36,MarginV=50,Outline=3,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=1"
cmd = [FF, "-y", "-i", "work/video.mp4", "-i", "work/voice_full.wav"]
cmd += ["-stream_loop", "-1", "-i", str(bgm)]
mix = (f"[1:a]volume=1.0[v];[2:a]volume=0.18[b];"
       f"[v][b]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]")
cmd += ["-filter_complex", mix, "-map", "0:v", "-map", "[a]",
        "-vf", f"subtitles=sub.srt:force_style='{sub_style}'",
        "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "aac", "-b:a", "128k", "final_v5_zh_cards.mp4"]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=900, cwd=OUT)
if r.returncode != 0:
    raise RuntimeError(f"总装: {r.stderr[-400:]}")
print(f"✓ V5 成片 {final}  {dur_of(final):.1f}s", flush=True)
