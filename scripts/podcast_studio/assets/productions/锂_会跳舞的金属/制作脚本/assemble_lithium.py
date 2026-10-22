"""锂篇总装 —— 图卡微动 + H3 高光 + 文字动效 + 旁白 + BGM + 字幕。

时间轴来自 narration_timeline.json（9 句，153.3s）。
"""
import json
import math
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/lithium_science")
FF = "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/bin/ffmpeg"
W, H, FPS = 1280, 720, 30
FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
EQ_FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
CARD_DIR = HERE / "cards"
WORK = HERE / "work"
WORK.mkdir(exist_ok=True)

tl = json.loads((HERE / "narration_timeline.json").read_text(encoding="utf-8"))
lines = tl["lines"]
TOTAL = tl["total"]
GAP = 0.3

def pad(e):
    return GAP if e["id"] < len(lines) - 1 else 0.0


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())


def font(sz, path=FONT):
    return ImageFont.truetype(path, sz)


def card_img(name):
    im = Image.open(CARD_DIR / f"{name}.png").convert("RGB")
    sw, sh = im.size
    s = max(W / sw, H / sh)
    im = im.resize((int(sw * s + 0.5), int(sh * s + 0.5)), Image.LANCZOS)
    nw, nh = im.size
    return im.crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))


def base_frame(img, t, dur_s, scale_amp=0.02):
    s = 1.0 + scale_amp * (0.5 - 0.5 * math.cos(2 * math.pi * t / max(dur_s, 0.1)))
    nw, nh = int(W * s), int(H * s)
    im = img.resize((nw, nh), Image.LANCZOS)
    return im.crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))


def text(d, xy, s, sz=48, fill=(60, 45, 30, 255), anchor="la", stroke=3, path=FONT):
    d.text(xy, s, font=font(sz, path), fill=fill, anchor=anchor,
           stroke_width=stroke, stroke_fill=(255, 252, 245, 230))


def ease(p):
    p = max(0.0, min(1.0, p))
    return 1 - (1 - p) ** 3


def render_frames(tag, dur_s, frame_fn, fps=FPS):
    fd = WORK / f"f_{tag}"
    fd.mkdir(exist_ok=True)
    n = max(int(round(dur_s * fps)), 1)
    for i in range(n):
        frame_fn(i / fps, i).save(fd / f"f{i:05d}.png")
    out = WORK / f"{tag}.mp4"
    subprocess.run([FF, "-y", "-v", "error", "-framerate", str(fps),
                    "-i", str(fd / "f%05d.png"), "-c:v", "libx264", "-crf", "18",
                    "-preset", "veryfast", "-pix_fmt", "yuv420p", str(out)], check=True)
    for f in fd.glob("*.png"):
        f.unlink()
    fd.rmdir()
    print(f"  ✓ {tag} {dur_of(out):.2f}s", flush=True)
    return out


def dur_of(p):
    return dur(p)


def h3_clip(src, dur_s, tag):
    out = WORK / f"{tag}.mp4"
    subprocess.run([FF, "-y", "-v", "error", "-i", str(src), "-t", f"{dur_s:.3f}",
                    "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}",
                    "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
                    "-pix_fmt", "yuv420p", str(out)], check=True)
    print(f"  ✓ {tag} {dur_of(out):.2f}s (H3)", flush=True)
    return out


shots = []
idx = {e["id"]: e for e in lines}

# ---- S0 螺旋 + S1 元素卡（line 0）----
l0 = idx[0]
helix_src = HERE / "h3_helix2.mp4"
if helix_src.exists():
    shots.append(h3_clip(helix_src, 6.0, "S0_helix"))
    rest = (l0["end"] - l0["start"] + pad(l0)) - 6.0
else:
    # 程序化螺旋兜底：旋转 + 放大 + 上移
    hero = card_img("S0_hero")
    D0 = 6.0
    def s0_frame(t, i):
        p = t / D0
        scl = 1.0 + 0.10 * p
        im = hero.resize((int(W * scl), int(H * scl)), Image.LANCZOS)
        im = im.rotate(-2.0 + 4.0 * p, resample=Image.BICUBIC)
        cx, cy = im.width // 2, im.height // 2
        oy = int(18 * p)
        ox = int(10 * math.sin(math.pi * p))
        box = (cx - W // 2 + ox, cy - H // 2 - oy,
               cx + W // 2 + ox, cy + H // 2 - oy)
        im = im.crop(box)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(ov)
        for k in range(26):
            lf = (t * 0.35 + k * 0.13) % 1.0
            x = int(W * 0.5 + math.sin(k * 2.1) * 220 + 40 * math.sin(t + k))
            y = int(H * 0.75 - lf * H * 0.6)
            r = 1 + (k % 3)
            dr.ellipse([x - r, y - r, x + r, y + r], fill=(255, 250, 235, 120))
        return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
    shots.append(render_frames("S0_helix_prog", D0, s0_frame))
    rest = (l0["end"] - l0["start"] + pad(l0)) - D0
img = card_img("S1_element")


def s1_frame(t, i, d=rest):
    im = base_frame(img, t, d)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    a = int(255 * ease(t / 0.8))
    text(dr, (70, 60), "Li", 120, (70, 50, 30, a))
    text(dr, (240, 92), "3", 56, (150, 110, 60, a))
    text(dr, (240, 150), "锂", 52, (70, 50, 30, a))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S1_element", rest, s1_frame))

# ---- S2 发现史（line 1）----
l1 = idx[1]
img = card_img("S2_discovery")
d1 = l1["end"] - l1["start"] + pad(l1)


def s2_frame(t, i):
    im = base_frame(img, t, d1)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    year = 1817 * ease(min(t / 1.6, 1.0))
    text(dr, (W - 80, 70), f"{int(year)}", 84, (70, 50, 30, 255), anchor="ra")
    text(dr, (W - 80, 170), "透锂长石 · 瑞典", 34, (110, 85, 55, 255), anchor="ra")
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S2_discovery", d1, s2_frame))

# ---- S3 密度对比（line 2）----
l2 = idx[2]
img = card_img("S3_density")
d2 = l2["end"] - l2["start"] + pad(l2)


def s3_frame(t, i):
    im = base_frame(img, t, d2)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    text(dr, (250, 90), "锂  0.53 g/cm³", 40, (60, 95, 140, 255), anchor="ma", path=EQ_FONT)
    text(dr, (1030, 90), "铁  7.87 g/cm³", 40, (90, 70, 60, 255), anchor="ma", path=EQ_FONT)
    text(dr, (640, 640), "最轻的金属", 44, (150, 100, 40, 255), anchor="ma")
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S3_density", d2, s3_frame))

# ---- S4 切锂（line 3）----
l3 = idx[3]
img = card_img("S4_cut")
d3 = l3["end"] - l3["start"] + pad(l3)


def s4_frame(t, i):
    # 三段式时间流：整体缓推 + 断面高光脉冲
    p = t / d3
    zoom = 1.0 + 0.06 * p
    im = img.resize((int(W * zoom), int(H * zoom)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2,
                  (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    gl = int(40 + 40 * math.sin(2 * math.pi * t / 1.6))
    dr.ellipse([520, 180, 980, 420], fill=(255, 250, 235, max(gl, 0)))
    ov = ov.filter(ImageFilter.GaussianBlur(30))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S4_cut", d3, s4_frame))

# ---- S5 遇水（line 4）：H3 6s + 程序化剩余 ----
l4 = idx[4]
d4 = l4["end"] - l4["start"] + pad(l4)
b = HERE / "sample_b_h3_v2.mp4"
h3_part = min(6.0, d4)
shots.append(h3_clip(b, h3_part, "S5_h3"))
rest5 = d4 - h3_part
if rest5 > 0.2:
    water = card_img("S1_element") if not (HERE / "lithium_water_card.png").exists() else None
    src = HERE / "lithium_water_card.png"
    im0 = Image.open(src).convert("RGB")
    sw, sh = im0.size
    s = max(W / sw, H / sh)
    im0 = im0.resize((int(sw * s + .5), int(sh * s + .5)), Image.LANCZOS)
    im0 = im0.crop(((im0.width - W) // 2, (im0.height - H) // 2,
                    (im0.width - W) // 2 + W, (im0.height - H) // 2 + H))
    CX, CY = int(W * .5), int(H * .403)

    def s5_frame(t, i):
        im = base_frame(im0, t, rest5, 0.015)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(ov)
        for k in range(4):
            ph = ((t / 2.2) + k / 4.0) % 1.0
            r = 16 + ph * 170
            aa = int(150 * (1 - ph))
            dr.ellipse([CX - r * 1.9, CY - r * .55, CX + r * 1.9, CY + r * .55],
                       outline=(255, 255, 255, aa), width=2)
        for bb in range(34):
            life = (t * .5 + bb * .091) % 1.0
            bx = CX + math.sin(bb * 1.7 + t * .8) * 34 + (bb % 7 - 3) * 5
            by = int(H * .60 - life * (H * .60 - H * .405))
            rad = 2 + (bb % 4)
            if life < .9:
                dr.ellipse([bx - rad, by - rad, bx + rad, by + rad],
                           fill=(255, 255, 255, 190), outline=(100, 175, 220, 220), width=1)
        # 安全角标
        dr.rectangle([24, H - 64, 360, H - 24], fill=(40, 30, 20, 150))
        text(dr, (40, H - 58), "专业实验 · 请勿模仿", 28, (255, 245, 230, 255), stroke=0)
        return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")

    shots.append(render_frames("S5_prog", rest5, s5_frame))

# ---- S6 方程式（line 5）----
l5 = idx[5]
img = card_img("S6_equation_bg")
d5 = l5["end"] - l5["start"] + pad(l5)


def s6_frame(t, i):
    im = base_frame(img, t, d5, 0.012)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    a = int(255 * ease(t / 1.0))
    text(dr, (W // 2, 300), "2Li + 2H₂O → 2LiOH + H₂↑", 58, (60, 45, 30, a), anchor="mm", path=EQ_FONT)
    a2 = int(255 * ease((t - 1.2) / 0.8))
    text(dr, (W // 2, 400), "锂遇水 → 氢氧化锂 + 氢气", 40, (120, 90, 55, a2), anchor="mm")
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S6_equation", d5, s6_frame))

# ---- S7 电池（line 6）----
l6 = idx[6]
img = card_img("S7_battery")
d6 = l6["end"] - l6["start"] + pad(l6)


def s7a_frame(t, i):
    im = base_frame(img, t, d6)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    text(dr, (70, 70), "锂电池", 52, (70, 50, 30, 255))
    text(dr, (70, 140), "磷酸铁锂 · 三元锂", 34, (120, 90, 55, 255))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S7_battery", d6, s7a_frame))

# ---- S7 储能站（line 7）----
l7 = idx[7]
img = card_img("S7_storage_c")
d7 = l7["end"] - l7["start"] + pad(l7)


def s7b_frame(t, i):
    im = base_frame(img, t, d7)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    e1 = ease(t / 1.4)
    dr.rectangle([50, 56, 600, 320], fill=(255, 251, 243, 205))
    text(dr, (80, 78), f"{4.3 * e1:.1f} 亿度", 58, (70, 50, 30, 255))
    text(dr, (80, 168), "≈ 20 万户全年用电", 34, (120, 90, 55, 255))
    text(dr, (80, 224), "佛山宝塘储能站", 28, (150, 110, 60, 255))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S7_storage", d7, s7b_frame))

# ---- S8 金句（line 8）----
l8 = idx[8]
img = card_img("S8_quote_bg")
d8 = l8["end"] - l8["start"] + pad(l8)


def s8_frame(t, i):
    im = base_frame(img, t, d8, 0.015)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    a = int(255 * ease(t / 1.2))
    text(dr, (W // 2, 300), "轻，也可以很有力量", 64, (70, 50, 30, a), anchor="mm")
    a2 = int(255 * ease((t - 1.4) / 0.8))
    text(dr, (W // 2, 400), "锂 · Li", 36, (150, 110, 60, a2), anchor="mm")
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


shots.append(render_frames("S8_quote", d8, s8_frame))

# ---- 拼接 ----
vl = WORK / "v.txt"
vl.write_text("\n".join(f"file '{s.resolve()}'" for s in shots), encoding="utf-8")
video = WORK / "video.mp4"
subprocess.run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(vl),
                "-c", "copy", str(video)], check=True)
print(f"✓ 视频轨 {dur_of(video):.2f}s / 旁白 {TOTAL}s", flush=True)

# ---- 总装：旁白 + BGM 0.12 + 字幕 ----
bgm = "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/assets/bgm/tech_clean.mp3"
final = HERE / "锂_会跳舞的金属.mp4"
style = ("PlayResX=1280,PlayResY=720,FontSize=30,MarginV=44,Outline=3,"
         "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=1")
subprocess.run([FF, "-y", "-v", "error",
                "-i", str(video), "-i", str(HERE / "narration_full.wav"),
                "-stream_loop", "-1", "-i", bgm,
                "-filter_complex",
                "[1:a]volume=1.0[v];[2:a]volume=0.12[b];"
                "[v][b]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]",
                "-map", "0:v", "-map", "[a]",
                "-vf", f"subtitles={HERE / 'narration.srt'}:force_style='{style}'",
                "-shortest", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast",
                "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", str(final)],
               check=True)
print(f"✓ 成片 {final} {dur_of(final):.2f}s", flush=True)
