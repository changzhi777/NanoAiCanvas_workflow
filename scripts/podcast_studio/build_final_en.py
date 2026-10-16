"""Henry VIII 英文版终装 —— Tudor 图卡 + 数字人口型首尾 + 英文 TTS 三段 + 风笛 BGM + 双语字幕。

时间线（en_timeline.json，全片 180.8s）：
  0-14.12s     lipsync_henry_open（数字人对口型·开场）
  14.12-169.78s Tudor 图卡轮播（seg1-8 主卡；seg3 = 总卡 + 六王后竖版连播）
  169.78-180.8s lipsync_henry_close（数字人对口型·收束+CTA）
音轨：lipsync_open 音轨 + tts_en_mid + lipsync_close 音轨（全片英文播音员 @0.95）
BGM：bagpipes.mp3 风笛 0.15 垫全片（stream_loop）
字幕：en_bilingual.srt 中英双语烧录
"""
import json
import pathlib
import subprocess

HERE = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
OUT = HERE / "out"
FF = str(HERE / "bin" / "ffmpeg")
W, H, FPS = 1280, 720, 30
BGM_GAIN = 0.15

def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900, cwd=cwd)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg: {r.stderr[-400:]}")

def dur_of(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())

tl = json.loads((OUT / "en_timeline.json").read_text(encoding="utf-8"))
lines = {ln["id"]: ln for ln in tl["lines"]}
t_open = tl["t_open"]                       # 14.125
total = tl["total"]                         # 180.8
close_start = total - dur_of(OUT / "lipsync_henry_close.mp4")   # ~169.78
starts = {i: lines[i]["start"] for i in range(1, 9)}
starts[9] = close_start

work = OUT / "work_en"
work.mkdir(parents=True, exist_ok=True)

# ---- 图卡路径 ----
card = lambda d, n: str(OUT / d / f"{n}.png")
TUDOR = {i: card("cards_tudor", f"tudor_{i}_"
         + ["renaissance_prince", "break_with_rome", "six_wives", "price_of_defiance",
            "father_of_navy", "aging_tyrant", "immortal_image", "time_judges"][i - 1])
         for i in range(1, 9)}
QUEENS = [card("cards_queens", q) for q in
          ["queen1_catherine_aragon", "queen2_anne_boleyn", "queen3_jane_seymour",
           "queen4_anne_of_cleves", "queen5_catherine_howard", "queen6_catherine_parr"]]

# ---- 段计划：lipsync_open → 图卡（seg1-8 连续覆盖）→ lipsync_close ----
seg_plan = [{"type": "lipsync", "video": str(OUT / "lipsync_henry_open.mp4"),
             "start": 0.0, "end": t_open}]
# seg3 拆三张：总卡 6.6s + 王后 6 连播
S3, S4 = starts[3], starts[4]
s3_total_end = S3 + 6.6
seg_plan.append({"type": "card", "card": TUDOR[3], "start": S3, "end": s3_total_end})
q_dur = (S4 - s3_total_end) / 6
for j, q in enumerate(QUEENS):
    seg_plan.append({"type": "card_portrait", "card": q,
                     "start": s3_total_end + j * q_dur,
                     "end": s3_total_end + (j + 1) * q_dur})
for i in [1, 2, 4, 5, 6, 7, 8]:
    seg_plan.append({"type": "card", "card": TUDOR[i], "start": starts[i],
                     "end": starts[i + 1]})
seg_plan = sorted(seg_plan, key=lambda s: s["start"])
seg_plan.append({"type": "lipsync", "video": str(OUT / "lipsync_henry_close.mp4"),
                 "start": close_start, "end": total})

# ---- 渲染各段 ----
clips = []
for i, sp in enumerate(seg_plan):
    dur = sp["end"] - sp["start"]
    clip = work / f"seg_{i:02d}.mp4"
    if clip.exists():
        clips.append(clip)
        continue
    if sp["type"] == "lipsync":
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"fps={FPS},format=yuv420p")
        run([FF, "-y", "-i", sp["video"], "-vf", vf, "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    else:
        if sp["type"] == "card_portrait":   # 王后竖版：crop 偏上保脸
            vf = (f"scale={W}:{int(W * 4 / 3)}:force_original_aspect_ratio=increase,"
                  f"crop={W}:{H}:0:'(ih-oh)*0.18',"
                  f"zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':"
                  f"y='ih/5-(ih/zoom/5)':d={int(dur * FPS) + 1}:s={W}x{H}:fps={FPS},"
                  f"format=yuv420p")
        else:
            vf = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,"
                  f"crop={W * 2}:{H * 2},"
                  f"zoompan=z='min(zoom+0.0005,1.12)':x='iw/2-(iw/zoom/2)':"
                  f"y='ih/2-(ih/zoom/2)':d={int(dur * FPS) + 1}:s={W}x{H}:fps={FPS},"
                  f"format=yuv420p")
        run([FF, "-y", "-loop", "1", "-i", sp["card"], "-vf", vf, "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", str(clip)])
    clips.append(clip)
    print(f"  ✓ 段{i:02d} {dur:.1f}s [{'口型' if sp['type']=='lipsync' else sp['type']}]", flush=True)

# ---- 视频拼接 ----
vlist = work / "v.txt"
vlist.write_text("\n".join(f"file '{c}'" for c in clips), encoding="utf-8")
video = work / "video.mp4"
run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(vlist), "-c", "copy", str(video)])
print(f"✓ 视频轨 {dur_of(video):.1f}s", flush=True)

# ---- 音轨三段拼（统一 wav 防混合容器炸）----
for src, dst in [(OUT / "lipsync_henry_open.mp4", work / "a_open.wav"),
                 (OUT / "tts_en" / "tts_en_mid.mp3", work / "a_mid.wav"),
                 (OUT / "lipsync_henry_close.mp4", work / "a_close.wav")]:
    run([FF, "-y", "-i", str(src), "-vn", "-ar", "44100", "-ac", "2",
         "-c:a", "pcm_s16le", str(dst)])
alist = work / "a.txt"
alist.write_text("\n".join([f"file '{work / n}'" for n in
                            ("a_open.wav", "a_mid.wav", "a_close.wav")]), encoding="utf-8")
voice = work / "voice_full.wav"
run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(alist),
     "-c:a", "pcm_s16le", str(voice)])
print(f"✓ 音轨 {dur_of(voice):.1f}s", flush=True)

# ---- 总装：BGM 风笛 + 双语字幕 ----
bgm = HERE / "assets" / "bgm" / "bagpipes.mp3"
final = OUT / "final_henry8_en.mp4"
sub_style = ("PlayResX=1280,PlayResY=720,FontSize=30,MarginV=46,Outline=3,"
             "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=1")
cmd = [FF, "-y", "-i", str(video), "-i", str(voice)]
cmd += ["-stream_loop", "-1", "-i", str(bgm)]
mix = (f"[1:a]volume=1.0[v];[2:a]volume={BGM_GAIN}[b];"
       f"[v][b]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]")
cmd += ["-filter_complex", mix, "-map", "0:v", "-map", "[a]",
        "-vf", f"subtitles={OUT / 'en_bilingual.srt'}:force_style='{sub_style}'",
        "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "aac", "-b:a", "128k", str(final)]
run(cmd)
print(f"✓ Henry VIII 英文版成片 {final}  {dur_of(final):.1f}s", flush=True)
