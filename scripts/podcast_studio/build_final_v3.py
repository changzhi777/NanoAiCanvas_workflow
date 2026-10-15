"""V3 终版组装 —— 数字人首尾 + 图卡中段 + 解说原声全片 + BGM + 字幕。

时间线（ASR 实测）：
  0-15s      digital_open（数字人开场，音轨静音用解说原声覆盖）
  15-215s    9+ 张知识图卡轮播（按段落轴切）
  215-230s   digital_close（数字人收尾）
音轨：胡总解说 mp3 全片原声（音色一致）+ 《流光》BGM 0.18
字幕：external.srt（词级精确）
"""
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
OUT = HERE / "out"
FF = str(HERE / "bin" / "ffmpeg")
FFPROBE = "ffprobe"   # 系统自带（读时长够用）
W, H, FPS = 1280, 720, 30
OPEN_END = 15.0          # 数字人开场覆盖 0-15s
CLOSE_START = 214.8      # 数字人收尾起点

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg: {r.stderr[-400:]}")

def dur_of(p):
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())

# ---- timeline（ASR 段轴）----
tl = json.loads((OUT / "timeline.json").read_text(encoding="utf-8"))
lines = tl["lines"]           # 11 段 {start,end,text}
n = len(lines)
starts = [l["start"] for l in lines]
starts[0] = 0.0
total = dur_of(HERE / "assets" / "voice" / "huzong_narration.mp3")
print(f"解说总长 {total:.1f}s / {n} 段")

work = OUT / "work_v3"
work.mkdir(parents=True, exist_ok=True)

# ---- 视频段计划 ----
# 段0+段1前半: digital_open (0-15s)
# 段10末 15s: digital_close
# 中间: 图卡按 ASR 段轴轮换
cards_v3 = sorted((OUT / "cards_v3").glob("v3_*.png"))
def find_card(code):
    for p in cards_v3:
        if p.name.split("_")[1].startswith(code):
            return str(p)
    return str(cards_v3[0])
# 中段图卡序列（按段 1余-段9 轮换，长段拆两张）
SEQ = []
for i in range(1, n):    # 段 1..9（段 10 由 close 覆盖）
    s = max(starts[i], OPEN_END)
    e = starts[i + 1] if i + 1 < n else CLOSE_START
    if e - s < 0.5:
        continue
    bank = ["B1", "B2", "C1", "C2", "B3", "C3", "B4", "C4", "C5"][(i - 1) % 9]
    SEQ.append({"start": s, "end": e, "card": find_card(bank)})

seg_plan = [{"type": "hero", "video": str(OUT / "digital_open.mp4"), "start": 0, "end": OPEN_END}]
for s in SEQ:
    seg_plan.append({"type": "card", "card": s["card"], "start": s["start"], "end": s["end"]})
seg_plan.append({"type": "hero", "video": str(OUT / "digital_close.mp4"), "start": CLOSE_START, "end": total})

# ---- 渲染各段 ----
clips = []
for i, sp in enumerate(seg_plan):
    dur = sp["end"] - sp["start"]
    clip = work / f"seg_{i:02d}.mp4"
    if clip.exists():
        clips.append(clip)
        continue
    if sp["type"] == "hero":
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"fps={FPS},format=yuv420p")
        run([FF, "-y", "-stream_loop", "-1", "-i", sp["video"],
             "-vf", vf, "-t", f"{dur:.3f}",
             "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    else:
        vf = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,"
              f"crop={W * 2}:{H * 2},"
              f"zoompan=z='min(zoom+0.0005,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
              f"d={int(dur * FPS) + 1}:s={W}x{H}:fps={FPS},format=yuv420p")
        run([FF, "-y", "-loop", "1", "-i", sp["card"],
             "-vf", vf, "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    clips.append(clip)
    print(f"  ✓ 段{i:02d} {dur:.1f}s [{'爆点' if sp['type']=='hero' else '图卡'}]", flush=True)

# ---- 视频拼接 ----
vlist = work / "v.txt"
vlist.write_text("\n".join(f"file '{c}'" for c in clips), encoding="utf-8")
video = work / "video.mp4"
run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(vlist), "-c", "copy", str(video)])
print(f"✓ 视频轨 {dur_of(video):.1f}s", flush=True)

# ---- 字幕 ----
srt = OUT / "final.srt"
if not srt.exists():
    srt = HERE / "out" / "external.srt"
srt = pathlib.Path(srt)
srt_work = OUT / "sub.srt"   # cwd=out，相对路径可见
srt_work.write_text(srt.read_text(encoding="utf-8"), encoding="utf-8")

# ---- BGM ----
bgm = HERE / "assets" / "bgm" / "awakening.mp3"
has_bgm = bgm.exists()
narr = HERE / "assets" / "voice" / "huzong_narration.mp3"

# ---- 总装：视频 + 解说全片原声 + BGM 0.18 + 字幕烧录 ----
final = OUT / "final_v3_digital.mp4"
sub_style = "PlayResX=1280,PlayResY=720,FontSize=36,MarginV=50,Outline=3,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=1"
cmd = [FF, "-y", "-i", "work/video.mp4", "-i", str(narr)]
if has_bgm:
    cmd += ["-stream_loop", "-1", "-i", str(bgm)]
    mix = (f"[1:a]volume=1.0[v];[2:a]volume=0.18[b];"
           f"[v][b]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]")
    cmd += ["-filter_complex", mix, "-map", "0:v", "-map", "[a]"]
else:
    cmd += ["-map", "0:v", "-map", "1:a"]
cmd += ["-vf", f"subtitles=sub.srt:force_style='{sub_style}'",
        "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "aac", "-b:a", "128k", "final_v3_digital.mp4"]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=900, cwd=OUT)
if r.returncode != 0:
    raise RuntimeError(f"总装失败: {r.stderr[-400:]}")
print(f"✓ V3 成片 {final}  {dur_of(final):.1f}s", flush=True)
