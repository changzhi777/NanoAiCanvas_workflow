#!/usr/bin/env python3
"""
阿嬷的情书 · 取景地寻迹 — 短视频制作管线
Pipeline: storyboard → GPT-Image-2 → photo resize → zoompan → xfade → output

特性:
  - 无文字叠加（文案单独输出）
  - 实拍照片 + AI 动画插画穿插
  - Ken Burns zoompan 缓慢缩放
  - xfade 过渡（修正 offset 累计）
"""

import asyncio
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import httpx
from PIL import Image, ImageEnhance

# ─── 配置 ────────────────────────────────────────────────
WUYINKEJI_API_KEY = os.environ.get("WUYINKEJI_API_KEY", "")
if not WUYINKEJI_API_KEY:
    print("❌ 请设置环境变量 WUYINKEJI_API_KEY", file=sys.stderr)
    sys.exit(1)
WUYINKEJI_BASE = "https://api.wuyinkeji.com"

PHOTO_DIR = Path(__file__).resolve().parent.parent / "11"
STORYBOARD_FILE = PHOTO_DIR / "storyboard.json"
OUTPUT_FILE = PHOTO_DIR / "ahma_love_letter.mp4"
COPYWRITING_FILE = PHOTO_DIR / "文案.md"
TMP_DIR = PHOTO_DIR / "tmp_segments"

RESOLUTION = (1920, 1080)
FPS = 30
TRANSITION_DURATION = 0.6
ZOOM_FACTOR = 1.15

FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "ffprobe"


# ─── GPT-Image-2 via wuyinkeji ───────────────────────────
async def generate_gpt_image(prompt: str, output_path: Path, max_retries: int = 2) -> bool:
    """调用 wuyinkeji GPT-Image-2 API（含重试，间隔 5s）"""
    for attempt in range(1, max_retries + 1):
        print(f"  🎨 GPT-Image-2 生成 (第{attempt}/{max_retries}次): {prompt[:60]}...")
        if await _generate_gpt_image_once(prompt, output_path):
            return True
        if attempt < max_retries:
            print(f"  ⏳ 5s 后重试...")
            await asyncio.sleep(5)
    return False


async def _generate_gpt_image_once(prompt: str, output_path: Path) -> bool:
    """单次调用 wuyinkeji GPT-Image-2 API：提交 → 轮询 → 下载"""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            # Step 1: 提交任务
            resp = await client.post(
                f"{WUYINKEJI_BASE}/api/async/image_gpt",
                headers={"Content-Type": "application/json"},
                json={
                    "key": WUYINKEJI_API_KEY,
                    "prompt": prompt,
                    "size": "1K",
                },
            )
            result = resp.json()

            if result.get("code") != 200:
                print(f"  ❌ 提交失败: {result.get('msg', 'Unknown')}")
                return False

            task_id = result.get("data", {}).get("id", "")
            if not task_id:
                print(f"  ❌ 无任务ID: {result}")
                return False

            print(f"  ⏳ 任务ID: {task_id}, 轮询中...")

            # Step 2: 轮询
            for attempt in range(40):  # 最多等 ~120s
                await asyncio.sleep(3)
                poll_resp = await client.get(
                    f"{WUYINKEJI_BASE}/api/async/detail",
                    params={"key": WUYINKEJI_API_KEY, "id": task_id},
                )
                poll_data = poll_resp.json()
                data = poll_data.get("data", {})
                status = data.get("status", 0)

                if status == 2:
                    # 成功
                    result_data = data.get("result", "")
                    if isinstance(result_data, str):
                        image_url = result_data
                    elif isinstance(result_data, list) and result_data:
                        image_url = result_data[0] if isinstance(result_data[0], str) else result_data[0].get("url", "")
                    elif isinstance(result_data, dict):
                        image_url = result_data.get("url", "")
                    else:
                        image_url = str(result_data)

                    if not image_url:
                        print(f"  ❌ 无图片URL: {data}")
                        return False

                    # Step 3: 下载
                    img_resp = await client.get(image_url, timeout=60)
                    output_path.write_bytes(img_resp.content)
                    print(f"  ✅ 已保存: {output_path.name}")
                    return True

                elif status != 0:
                    print(f"  ❌ 任务失败: status={status}, msg={data.get('result', '')}")
                    return False

                # status=0 继续等待
                if attempt % 5 == 4:
                    print(f"  ... 仍在生成中 ({(attempt+1)*3}s)")

            print(f"  ❌ 超时（120s）")
            return False

    except Exception as e:
        print(f"  ❌ 异常: {e}")
        return False


# ─── 图像处理 ─────────────────────────────────────────────
def resize_to_resolution(img_path: Path, output_path: Path, resolution=RESOLUTION):
    """统一缩放到目标分辨率，保持比例 + 中心裁剪"""
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    tw, th = resolution

    scale = max(tw / w, th / h)
    new_w, new_h = int(w * scale + 0.5), int(h * scale + 0.5)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    left = (new_w - tw) // 2
    top = (new_h - th) // 2
    img = img.crop((left, top, left + tw, top + th))

    # AI 图片增加电影感调色
    if "ai_" in output_path.name:
        img = ImageEnhance.Color(img).enhance(1.12)
        img = ImageEnhance.Contrast(img).enhance(1.08)

    img.save(output_path, quality=95)
    return output_path


# ─── FFmpeg zoompan 片段 ──────────────────────────────────
def make_zoompan_segment(
    img_path: Path, output_path: Path, duration: float, zoom_in: bool = True
):
    """用 zoompan 生成缓慢缩放的单张图片视频片段"""
    total_frames = int(duration * FPS)

    if zoom_in:
        zoom_expr = f"min(zoom+{(ZOOM_FACTOR-1)/total_frames:.8f},{ZOOM_FACTOR})"
    else:
        zoom_expr = f"if(eq(on,0),{ZOOM_FACTOR},max(zoom-{(ZOOM_FACTOR-1)/total_frames:.8f},1.0))"

    x_expr = "iw/2-(iw/zoom/2)"
    y_expr = "ih/2-(ih/zoom/2)"
    pre_scale_w = int(RESOLUTION[0] * 1.5)
    pre_scale_h = int(RESOLUTION[1] * 1.5)

    cmd = [
        FFMPEG, "-y", "-loglevel", "error",
        "-loop", "1", "-i", str(img_path),
        "-vf",
        (
            f"scale={pre_scale_w}:{pre_scale_h}:flags=lanczos,"
            f"zoompan=z='{zoom_expr}':x='{x_expr}':y='{y_expr}':"
            f"d={total_frames}:s={RESOLUTION[0]}x{RESOLUTION[1]}:fps={FPS},"
            f"format=yuv420p"
        ),
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return output_path


# ─── 获取视频时长 ─────────────────────────────────────────
def get_duration(path: Path) -> float:
    result = subprocess.run(
        [FFPROBE, "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


# ─── xfade 拼接（修正 offset 累计）────────────────────────
def concat_with_xfade(segments: list[Path], output_path: Path, transition: float):
    """
    用 xfade 滤镜平滑过渡拼接。
    offset 公式: offset[i] = sum(dur[0..i]) - i * transition - transition
    """
    if len(segments) == 1:
        subprocess.run(
            [FFMPEG, "-y", "-i", str(segments[0]), "-c", "copy", str(output_path)],
            check=True, capture_output=True, text=True,
        )
        return output_path

    durations = [get_duration(s) for s in segments]

    inputs = []
    for seg in segments:
        inputs.extend(["-i", str(seg)])

    filter_parts = []
    # 累计偏移量: 每个 xfade 使总时长减少 transition
    cumulative = durations[0]  # 第一段完整时长
    offset = cumulative - transition
    filter_parts.append(
        f"[0:v][1:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[v01]"
    )
    last_label = "v01"

    for i in range(2, len(segments)):
        cumulative += durations[i - 1]  # 加上一段时长
        cumulative -= transition        # 减去过渡重叠
        offset = cumulative - transition
        next_label = f"v0{i}"
        filter_parts.append(
            f"[{last_label}][{i}:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[{next_label}]"
        )
        last_label = next_label

    filter_str = ";".join(filter_parts)

    cmd = [
        FFMPEG, "-y", "-loglevel", "error",
        *inputs,
        "-filter_complex", filter_str,
        "-map", f"[{last_label}]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return output_path


# ─── 文案生成 ─────────────────────────────────────────────
def generate_copywriting(storyboard: dict, output_path: Path):
    """生成分镜头文案文档"""
    lines = []
    lines.append(f"# {storyboard['title']}\n")
    lines.append(f"> {storyboard['theme']}\n")
    lines.append(f"\n## 故事解读\n")
    lines.append(f"{storyboard['story_interpretation']}\n")
    lines.append(f"\n## 分镜头文案\n")
    lines.append(f"| 镜头 | 时长 | 类型 | 取景地 | 旁白 |")
    lines.append(f"|------|------|------|--------|------|")

    for shot in storyboard["shots"]:
        stype = "🎬 实拍" if shot["scene_type"] == "photo" else "🎨 AI插画"
        narration = shot.get("narration", "")
        lines.append(
            f"| {shot['shot_id']} | {shot['duration']}s | {stype} | {shot['location']} | {narration} |"
        )

    lines.append(f"\n## 旁白全文\n")
    for shot in storyboard["shots"]:
        n = shot.get("narration", "")
        if n:
            lines.append(f"**[{shot['shot_id']}]** {n}\n")

    lines.append(f"\n## 取景地 → 照片对应\n")
    for shot in storyboard["shots"]:
        if shot["scene_type"] == "photo":
            pf = shot.get("photo_file", "")
            lines.append(f"- 镜头 {shot['shot_id']} → `{pf}` — {shot['location']}")
        else:
            lines.append(f"- 镜头 {shot['shot_id']} → 🎨 GPT-Image-2 生成 — {shot['location']}")

    lines.append(f"\n---\n*生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}*")
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ 文案已保存: {output_path}")


# ─── 主流程 ───────────────────────────────────────────────
async def main():
    import argparse
    import shutil

    parser = argparse.ArgumentParser(description="阿嬷的情书·视频制作管线")
    parser.add_argument("--cleanup", action="store_true", help="完成后清理临时文件")
    args = parser.parse_args()

    storyboard = json.loads(STORYBOARD_FILE.read_text(encoding="utf-8"))
    shots = storyboard["shots"]
    print(f"📋 分镜头脚本: {storyboard['title']}")
    print(f"   镜头数: {len(shots)}, 总时长: {sum(s['duration'] for s in shots)}s\n")

    TMP_DIR.mkdir(exist_ok=True)
    for f in TMP_DIR.glob("*"):
        f.unlink()

    # Step 1: 准备图片（照片串行 + AI 并发）
    print("━━━ Step 1: 准备图片素材 ━━━")
    prepared_images = {}

    # 1a: 照片 — 串行 resize（CPU 密集）
    anim_tasks = []
    for shot in shots:
        sid = shot["shot_id"]
        if shot["scene_type"] == "photo":
            photo_file = shot.get("photo_file", "")
            src = PHOTO_DIR / photo_file
            if not src.exists():
                print(f"  ⚠️ 照片不存在: {src}, 跳过")
                continue
            dst = TMP_DIR / f"photo_{sid:02d}.jpg"
            resize_to_resolution(src, dst)
            prepared_images[sid] = dst
            print(f"  📷 [{sid}] 照片就绪: {photo_file}")
        else:
            prompt = shot.get("animation_prompt", "")
            dst = TMP_DIR / f"ai_{sid:02d}.jpg"
            anim_tasks.append((sid, prompt, dst))

    # 1b: AI 插画 — 并发生成
    if anim_tasks:
        print(f"\n  🎨 并发生成 {len(anim_tasks)} 张 AI 插画...")
        results = await asyncio.gather(
            *[generate_gpt_image(p, d) for _, p, d in anim_tasks]
        )
        for (sid, _, dst), success in zip(anim_tasks, results):
            if success:
                resize_to_resolution(dst, dst)
                prepared_images[sid] = dst
            else:
                print(f"  ⚠️ [{sid}] GPT-Image-2 失败，跳过")
                shot["skip"] = True

    print()

    # Step 2: zoompan 片段
    print("━━━ Step 2: 生成 Ken Burns 缩放片段 ━━━")
    segments = []
    active_shots = [s for s in shots if s.get("shot_id") in prepared_images]

    for i, shot in enumerate(active_shots):
        sid = shot["shot_id"]
        img = prepared_images[sid]
        seg = TMP_DIR / f"seg_{i:02d}.mp4"
        zoom_in = (i % 2 == 0)
        make_zoompan_segment(img, seg, shot["duration"], zoom_in=zoom_in)
        segments.append(seg)
        direction = "推近" if zoom_in else "拉远"
        print(f"  🎬 [{sid}] {shot['duration']}s {direction} → {seg.name}")

    print()

    # Step 3: xfade 拼接
    print("━━━ Step 3: 拼接 + 过渡（修正 offset）━━━")
    # 14 个片段分 3 组 xfade，再合拼
    group_size = 5
    groups = [segments[i:i+group_size] for i in range(0, len(segments), group_size)]
    group_outputs = []

    for gi, group in enumerate(groups):
        if len(group) == 1:
            group_outputs.append(group[0])
            continue
        gout = TMP_DIR / f"group_{gi:02d}.mp4"
        concat_with_xfade(group, gout, TRANSITION_DURATION)
        gdur = get_duration(gout)
        print(f"  🔗 分组 {gi}: {len(group)} 片段, {gdur:.1f}s → {gout.name}")
        group_outputs.append(gout)

    # 最终拼接各组
    if len(group_outputs) == 1:
        subprocess.run(
            [FFMPEG, "-y", "-i", str(group_outputs[0]), "-c", "copy", str(OUTPUT_FILE)],
            check=True, capture_output=True, text=True,
        )
    else:
        concat_with_xfade(group_outputs, OUTPUT_FILE, TRANSITION_DURATION)

    final_dur = get_duration(OUTPUT_FILE)
    final_size = OUTPUT_FILE.stat().st_size / 1024 / 1024
    print(f"\n✅ 视频已生成: {OUTPUT_FILE}")
    print(f"   时长: {final_dur:.1f}s, 大小: {final_size:.1f} MB")

    # Step 4: 文案
    print("\n━━━ Step 4: 生成文案 ━━━")
    generate_copywriting(storyboard, COPYWRITING_FILE)

    print(f"\n🏁 全部完成！")

    # 清理临时文件
    if args.cleanup:
        shutil.rmtree(TMP_DIR, ignore_errors=True)
        print(f"🧹 已清理临时目录: {TMP_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
