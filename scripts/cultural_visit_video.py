#!/usr/bin/env python3
"""
文化探访短视频制作器
====================
1. 读取目录中的照片
2. 使用 MiniMax 多模态 API 分析照片并生成文案
3. 使用 FFmpeg 合成幻灯片视频（Ken Burns + crossfade + 字幕）

用法:
  python3 scripts/cultural_visit_video.py [--dir PATH] [--output PATH]

依赖: PIL/Pillow, httpx, FFmpeg
"""

import argparse
import asyncio
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
from io import BytesIO
from pathlib import Path

import httpx

# ==================== 配置 ====================

MINIMAX_API_KEY = os.environ.get(
    "MINIMAX_API_KEY",
    "sk-cp-aIaZxfNKycyf5hDWkLHQZEuC5ur3vnDKfYSy32T4exf-kwLlccs5SrvNSUQy67XWWZ872YQwKk5R_AiGtdma1JJkwpAnLGuHnd-Yvvncj_EUBXhtLc0Vi0o",
)
MINIMAX_BASE_URL = "https://api.minimaxi.com/v1"
MINIMAX_MODEL = "MiniMax-M3"  # M3 支持多模态视觉，M2.7 不支持

# 视频参数
PHOTO_DURATION = 4.0          # 每张照片展示时长（秒）
TRANSITION_DURATION = 0.5     # 转场时长（秒）
RESOLUTION = (1920, 1080)
FPS = 30
FONT_SIZE = 36
FONT_COLOR = "white"
BORDER_COLOR = "black@0.6"

# 图片预处理参数
IMAGE_MAX_WIDTH = 1024        # 发给 API 的图片最大宽度
SLIDESHOW_WIDTH = 1920        # 视频中图片宽度
SLIDESHOW_HEIGHT = 1080       # 视频中图片高度

# 字体（macOS 自带中文字体）
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"

# 批量分析参数
BATCH_SIZE = 1                # 每批发送多少张照片给 API（M3 逐张更可靠）


def _repair_json(raw: str) -> str:
    """修复常见的 JSON 格式问题（trailing comma、未转义引号等）"""
    import re as _re
    s = raw
    s = _re.sub(r',\s*([}\]])', r'\1', s)           # trailing comma
    s = _re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', s)  # control chars
    return s


# ==================== Phase 1: MiniMax 多模态分析 ====================

def resize_image_to_base64(img_path: str, max_width: int = IMAGE_MAX_WIDTH) -> str:
    """读取图片，缩放到指定宽度，返回 base64 data URL"""
    from PIL import Image

    img = Image.open(img_path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    ratio = max_width / img.width
    if ratio < 1:
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


async def analyze_photo_batch(
    client: httpx.AsyncClient,
    photos: list[Path],
    batch_idx: int,
    total_batches: int,
) -> list[dict]:
    """
    调用 MiniMax 多模态 API 分析一批照片，返回每张照片的文案描述。

    返回: [{"filename": "xxx.jpg", "caption": "描述文字", "narration": "旁白"}, ...]
    """
    print(f"  📸 批次 {batch_idx + 1}/{total_batches}: 分析 {len(photos)} 张照片...")

    # 构建多模态消息
    content_parts = []
    for photo in photos:
        data_url = resize_image_to_base64(str(photo))
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": data_url},
        })

    content_parts.append({
        "type": "text",
        "text": (
            "请分析这张'文化探访历史街区'实践活动照片。"
            "直接输出 JSON，不要任何思考或解释：\n"
            '{"title": "10-15字标题", "description": "20-40字描述"}'
        ),
    })

    payload = {
        "model": MINIMAX_MODEL,
        "messages": [{"role": "user", "content": content_parts}],
        "max_tokens": 2000,
        "temperature": 0.7,
    }

    try:
        resp = await client.post(
            f"{MINIMAX_BASE_URL}/text/chatcompletion_v2",
            json=payload,
            timeout=120,
        )

        if resp.status_code != 200:
            print(f"  ❌ API 返回 {resp.status_code}: {resp.text[:300]}")
            # 降级：返回空描述
            return [
                {"filename": p.name, "title": "", "description": ""}
                for p in photos
            ]

        data = resp.json()
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", -1) not in (0, 200):
            print(f"  ⚠️ MiniMax 错误: {base_resp.get('status_msg', 'unknown')}")
            return [
                {"filename": p.name, "title": "", "description": ""}
                for p in photos
            ]

        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()
        if not content:
            content = msg.get("reasoning_content", "").strip()

        if not content:
            print("  ⚠️ API 返回空内容")
            return [
                {"filename": p.name, "title": "", "description": ""}
                for p in photos
            ]

        # 从 M3 回复中提取 JSON（单张返回对象，多张返回数组）
        import re

        # 尝试提取 JSON 对象 { ... }
        obj_match = re.search(r'\{[^{}]*"title"[^{}]*\}', content)
        if obj_match:
            try:
                entry = json.loads(obj_match.group())
            except json.JSONDecodeError:
                entry = json.loads(_repair_json(obj_match.group()))
            return [{
                "filename": photos[0].name,
                "title": entry.get("title", ""),
                "description": entry.get("description", ""),
            }] if len(photos) == 1 else [
                {"filename": p.name, "title": "", "description": ""}
                for p in photos
            ]

        # 尝试提取 JSON 数组 [ ... ]
        all_matches = list(re.finditer(r'\[\s*\{[\s\S]*?\}\s*\]', content))
        json_str = all_matches[-1].group() if all_matches else None
        if not json_str:
            first_bracket = content.find('[')
            last_bracket = content.rfind(']')
            if first_bracket >= 0 and last_bracket > first_bracket:
                json_str = content[first_bracket:last_bracket + 1]

        if json_str:
            results = None
            for attempt_str in [json_str, _repair_json(json_str)]:
                try:
                    results = json.loads(attempt_str)
                    break
                except json.JSONDecodeError:
                    continue

            if results and isinstance(results, list):
                output = []
                for i, photo in enumerate(photos):
                    entry = next((r for r in results if r.get("index") == i), results[i] if i < len(results) else {})
                    output.append({
                        "filename": photo.name,
                        "title": entry.get("title", ""),
                        "description": entry.get("description", ""),
                    })
                print(f"  ✅ 批次 {batch_idx + 1} 完成")
                return output

        print(f"  ⚠️ JSON 解析失败: {content[:150]}")
        return [
            {"filename": p.name, "title": "", "description": ""}
            for p in photos
        ]

        print(f"  ✅ 批次 {batch_idx + 1} 完成")
        return output

    except Exception as e:
        print(f"  ❌ 批次 {batch_idx + 1} 异常: {e}")
        return [
            {"filename": p.name, "title": "", "description": ""}
            for p in photos
        ]


async def generate_overall_narrative(
    client: httpx.AsyncClient,
    captions: list[dict],
) -> str:
    """根据所有照片的文案，生成一段整体旁白"""
    print("\n📝 生成整体旁白...")

    summary = "\n".join(
        f"{i + 1}. {c.get('title', '')}: {c.get('description', '')}"
        for i, c in enumerate(captions)
    )

    payload = {
        "model": MINIMAX_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "你是一个擅长写中学生社会实践报告的助手。",
            },
            {
                "role": "user",
                "content": (
                    "以下是文化探访历史街区的照片描述清单：\n\n"
                    f"{summary}\n\n"
                    "请写一段 200-300 字的探访总结旁白，适合作为短视频开头和结尾的画外音。"
                    "要求：\n1. 体现历史街区的文化价值\n"
                    "2. 中学生视角，有感悟和收获\n"
                    "3. 语言优美但不过于华丽"
                ),
            },
        ],
        "max_tokens": 800,
        "temperature": 0.7,
    }

    try:
        resp = await client.post(
            f"{MINIMAX_BASE_URL}/text/chatcompletion_v2",
            json=payload,
            timeout=60,
        )
        data = resp.json()
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()
        if not content and msg.get("reasoning_content"):
            content = msg.get("reasoning_content", "").strip()
        print("  ✅ 旁白生成完成")
        return content
    except Exception as e:
        print(f"  ⚠️ 旁白生成失败: {e}")
        return ""


async def analyze_all_photos(photo_dir: Path) -> tuple[list[dict], str]:
    """分析所有照片，返回文案列表和整体旁白"""
    photos = sorted(
        [f for f in photo_dir.iterdir()
         if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
    )

    print(f"📁 发现 {len(photos)} 张照片")

    # 分批处理
    batches = [photos[i:i + BATCH_SIZE] for i in range(0, len(photos), BATCH_SIZE)]
    print(f"📦 分为 {len(batches)} 批，每批最多 {BATCH_SIZE} 张\n")

    all_captions = []
    async with httpx.AsyncClient(
        headers={
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
            "Content-Type": "application/json",
        }
    ) as client:
        tasks = [
            analyze_photo_batch(client, batch, idx, len(batches))
            for idx, batch in enumerate(batches)
        ]
        results = await asyncio.gather(*tasks)
        for batch_result in results:
            all_captions.extend(batch_result)

        # 生成整体旁白
        narration = await generate_overall_narrative(client, all_captions)

    return all_captions, narration


# ==================== Phase 2: FFmpeg 视频合成 ====================

def escape_drawtext(text: str) -> str:
    """转义 FFmpeg drawtext 滤镜中的特殊字符"""
    # FFmpeg drawtext 转义顺序很重要
    text = text.replace("\\", "\\\\")
    text = text.replace(":", "\\:")
    text = text.replace("'", "\\'")
    text = text.replace("%", "\\%")
    return text


def burn_text_on_image(
    photo_path: str,
    title: str,
    desc: str,
    output_path: str,
) -> str:
    """
    使用 PIL 将标题和描述文字烧录到图片上。
    文字带有半透明背景条 + 白色/黄色文字 + 描边。
    返回: 修改后的图片路径
    """
    from PIL import Image, ImageDraw, ImageFont

    img = Image.open(photo_path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 缩放到视频尺寸（保持比例，裁剪居中）
    src_w, src_h = img.size
    target_ratio = SLIDESHOW_WIDTH / SLIDESHOW_HEIGHT
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        # 图片更宽 → 裁剪左右
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        # 图片更高 → 裁剪上下
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    img = img.resize((SLIDESHOW_WIDTH, SLIDESHOW_HEIGHT), Image.LANCZOS)

    draw = ImageDraw.Draw(img, "RGBA")

    # 加载字体
    try:
        font_title = ImageFont.truetype(FONT_PATH, 52)
        font_desc = ImageFont.truetype(FONT_PATH, 36)
    except (IOError, OSError):
        font_title = ImageFont.load_default()
        font_desc = ImageFont.load_default()

    # 绘制底部半透明渐变背景条
    bar_height = 200
    bar_top = SLIDESHOW_HEIGHT - bar_height
    for y in range(bar_height):
        alpha = int(160 * (y / bar_height))
        draw.line([(0, bar_top + y), (SLIDESHOW_WIDTH, bar_top + y)], fill=(0, 0, 0, alpha))

    # 绘制标题（黄色，带描边）
    y_offset = SLIDESHOW_HEIGHT - 150
    if title:
        bbox = draw.textbbox((0, 0), title, font=font_title)
        text_w = bbox[2] - bbox[0]
        x = (SLIDESHOW_WIDTH - text_w) // 2
        # 描边
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2)]:
            draw.text((x + dx, y_offset + dy), title, font=font_title, fill=(0, 0, 0, 220))
        draw.text((x, y_offset), title, font=font_title, fill=(255, 220, 80))
        y_offset += 70

    # 绘制描述（白色，带描边）
    if desc:
        # 长文本截断或换行（每行最多 30 字）
        lines = []
        if len(desc) > 30:
            mid = desc[:30].rfind("，") or desc[:30].rfind("、") or 30
            lines = [desc[:mid], desc[mid:].lstrip("，、")]
        else:
            lines = [desc]

        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_desc)
            text_w = bbox[2] - bbox[0]
            x = (SLIDESHOW_WIDTH - text_w) // 2
            for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
                draw.text((x + dx, y_offset + dy), line, font=font_desc, fill=(0, 0, 0, 200))
            draw.text((x, y_offset), line, font=font_desc, fill=(255, 255, 255))
            y_offset += 48

    img.save(output_path, quality=95)
    return output_path


def _resize_crop_photo(photo_path: str, output_path: str) -> str:
    """仅裁剪缩放到视频尺寸，不烧录文字（--no-text 模式使用）"""
    from PIL import Image

    img = Image.open(photo_path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    src_w, src_h = img.size
    target_ratio = SLIDESHOW_WIDTH / SLIDESHOW_HEIGHT
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    img = img.resize((SLIDESHOW_WIDTH, SLIDESHOW_HEIGHT), Image.LANCZOS)
    img.save(output_path, quality=95)
    return output_path


def make_segment(
    photo_path: str,
    caption: dict,
    segment_idx: int,
    tmp_dir: str,
    no_text: bool = False,
) -> str:
    """
    将单张照片生成为一段视频片段。
    流程: PIL 烧录文字（可选）→ FFmpeg zoompan（Ken Burns）
    返回: 视频片段文件路径
    """
    title = caption.get("title", "")
    desc = caption.get("description", "")

    # Step 1: PIL 烧录文字到图片（--no-text 时跳过，仅裁剪缩放）
    annotated_path = os.path.join(tmp_dir, f"img_{segment_idx:03d}.jpg")
    if no_text:
        _resize_crop_photo(photo_path, annotated_path)
    else:
        burn_text_on_image(photo_path, title, desc, annotated_path)

    # Step 2: FFmpeg zoompan
    output_path = os.path.join(tmp_dir, f"segment_{segment_idx:03d}.mp4")
    frames = int(PHOTO_DURATION * FPS)

    filter_str = (
        f"zoompan=z='min(zoom+0.0012,1.3)':"
        f"d={frames}:fps={FPS}:s={SLIDESHOW_WIDTH}x{SLIDESHOW_HEIGHT}"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", annotated_path,
        "-vf", filter_str,
        "-t", str(PHOTO_DURATION),
        "-r", str(FPS),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-an",  # 无音频
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠️ 片段 {segment_idx} 生成失败: {result.stderr[-300:]}")
        # 降级：简单缩放无 zoompan 效果
        fallback_cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", annotated_path,
            "-vf", f"scale={SLIDESHOW_WIDTH}:{SLIDESHOW_HEIGHT}",
            "-t", str(PHOTO_DURATION),
            "-r", str(FPS),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-an",
            output_path,
        ]
        subprocess.run(fallback_cmd, capture_output=True, text=True)

    return output_path


def concat_segments(
    segment_paths: list[str],
    output_path: str,
    transition: str = "fade",
) -> str:
    """
    将多个视频片段拼接为最终视频，带 crossfade 转场。

    使用 xfade 滤镜实现转场，或直接 concat（无转场）。
    """
    if len(segment_paths) == 1:
        import shutil
        shutil.copy2(segment_paths[0], output_path)
        return output_path

    print(f"\n🎬 合成 {len(segment_paths)} 个片段（转场: {transition}）...")

    if transition == "none":
        # 简单 concat
        list_path = os.path.join(os.path.dirname(segment_paths[0]), "concat_list.txt")
        with open(list_path, "w") as f:
            for p in segment_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", list_path,
            "-c", "copy",
            output_path,
        ]
        subprocess.run(cmd, capture_output=True, text=True)
        return output_path

    # xfade 转场拼接（单次 re-encode，所有片段在一个 filter_complex 中）
    # 构建 filter_chain: [0:v][1:v]xfade...[v01]; [v01][2:v]xfade...[v02]; ...
    n = len(segment_paths)
    tmp_dir = os.path.dirname(segment_paths[0])

    if n > 8:
        # 片段过多时，xfade filter_complex 会很慢，用 concat 代替
        print(f"\n🎬 片段较多（{n}），使用快速拼接（无转场）...")
        list_path = os.path.join(tmp_dir, "concat_all.txt")
        with open(list_path, "w") as f:
            for p in segment_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", list_path,
            "-c", "copy",
            output_path,
        ]
        subprocess.run(cmd, capture_output=True, text=True)
        return output_path

    # 片段 ≤8 时用 xfade
    print(f"\n🎬 合成 {n} 个片段（转场: {transition}）...")
    inputs = []
    for p in segment_paths:
        inputs.extend(["-i", p])

    # 构建 filter_complex
    filter_parts = []
    prev_label = "0:v"
    acc_duration = PHOTO_DURATION
    for i in range(1, n):
        offset = acc_duration - TRANSITION_DURATION
        out_label = f"v{i:02d}" if i < n - 1 else "vout"
        filter_parts.append(
            f"[{prev_label}][{i}:v]xfade=transition={transition}:duration={TRANSITION_DURATION}:offset={offset}[{out_label}]"
        )
        prev_label = out_label
        acc_duration += PHOTO_DURATION - TRANSITION_DURATION

    filter_complex = ";".join(filter_parts)

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-an",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠️ xfade 失败，降级为 concat: {result.stderr[-200:]}")
        list_path = os.path.join(tmp_dir, "concat_all.txt")
        with open(list_path, "w") as f:
            for p in segment_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", output_path,
        ], capture_output=True, text=True)
        print(f"  🔗 已拼接 {i + 1}/{len(segment_paths)}", end="\r")

    print()  # 换行

    # 复制最终结果到输出路径
    import shutil
    shutil.copy2(current, output_path)
    return output_path


def add_bgm(video_path: str, bgm_path: str | None, output_path: str) -> str:
    """添加背景音乐"""
    if not bgm_path or not os.path.exists(bgm_path):
        return video_path

    print(f"🎵 添加背景音乐: {bgm_path}")
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", bgm_path,
        "-filter_complex", "[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]",
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-shortest",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        return output_path
    else:
        print(f"  ⚠️ BGM 添加失败: {result.stderr[-200:]}")
        return video_path


def compose_video(
    photo_dir: Path,
    captions: list[dict],
    output_path: str,
    bgm_path: str | None = None,
    transition: str = "fade",
    no_text: bool = False,
) -> str:
    """合成完整视频"""
    tmp_dir = tempfile.mkdtemp(prefix="cultural_visit_")
    print(f"\n📂 临时目录: {tmp_dir}")

    try:
        # Phase 1: 生成每个片段
        photos = sorted(
            [f for f in photo_dir.iterdir()
             if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
        )

        segment_paths = []
        for i, photo in enumerate(photos):
            caption = next(
                (c for c in captions if c.get("filename") == photo.name),
                {"filename": photo.name, "title": "", "description": ""},
            )
            print(f"  🎨 生成片段 {i + 1}/{len(photos)}: {photo.name}", end="\r")
            seg = make_segment(str(photo), caption, i, tmp_dir, no_text=no_text)
            segment_paths.append(seg)
        print()  # 换行

        # Phase 2: 拼接 + 转场
        merged_path = os.path.join(tmp_dir, "merged_final.mp4")
        concat_segments(segment_paths, merged_path, transition)

        # Phase 3: 添加 BGM
        if bgm_path:
            with_bgm = os.path.join(tmp_dir, "with_bgm.mp4")
            add_bgm(merged_path, bgm_path, with_bgm)
            merged_path = with_bgm

        # 复制到最终输出路径
        import shutil
        shutil.copy2(merged_path, output_path)

        # 获取视频信息
        duration = len(photos) * PHOTO_DURATION - (len(photos) - 1) * TRANSITION_DURATION
        print(f"\n✅ 视频合成完成！")
        print(f"   📁 输出: {output_path}")
        print(f"   ⏱️ 时长: {duration:.1f}s ({len(photos)} 张照片)")
        print(f"   📐 分辨率: {SLIDESHOW_WIDTH}x{SLIDESHOW_HEIGHT}")

        return output_path

    finally:
        # 清理临时目录
        import shutil
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass


# ==================== 主流程 ====================

def save_captions(captions: list[dict], narration: str, output_path: str):
    """保存文案到 JSON 文件"""
    data = {
        "theme": "文化探访 - 历史街区",
        "narration": narration,
        "photos": captions,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📝 文案已保存: {output_path}")


async def main():
    parser = argparse.ArgumentParser(description="文化探访短视频制作器")
    parser.add_argument(
        "--dir", default="/Users/mac/cz_code/NanoAiCanvas_workflow/11",
        help="照片目录路径",
    )
    parser.add_argument(
        "--output", default=None,
        help="输出视频路径（默认: 照片目录/cultural_visit.mp4）",
    )
    parser.add_argument("--bgm", default=None, help="背景音乐文件路径")
    parser.add_argument(
        "--transition", default="fade",
        choices=["fade", "wipeleft", "wiperight", "slideleft", "slideright", "zoom", "none"],
        help="转场效果",
    )
    parser.add_argument(
        "--skip-analysis", action="store_true",
        help="跳过 AI 分析，直接使用已有文案",
    )
    parser.add_argument(
        "--captions-file", default=None,
        help="已有文案 JSON 文件路径（配合 --skip-analysis 使用）",
    )
    parser.add_argument(
        "--no-text", action="store_true",
        help="不烧录文字到视频（生成无字幕版）",
    )
    args = parser.parse_args()

    photo_dir = Path(args.dir)
    if not photo_dir.exists():
        print(f"❌ 目录不存在: {photo_dir}")
        sys.exit(1)

    output_path = args.output or str(photo_dir / "cultural_visit.mp4")
    captions_path = str(photo_dir / "captions.json")

    start_time = time.time()

    # === Phase 1: AI 分析照片 ===
    if args.skip_analysis and args.captions_file:
        print(f"📖 加载已有文案: {args.captions_file}")
        with open(args.captions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        captions = data.get("photos", [])
        narration = data.get("narration", "")
    else:
        print("=" * 60)
        print("  🏛️  文化探访短视频制作器")
        print("  Phase 1: AI 多模态照片分析")
        print("=" * 60)

        captions, narration = await analyze_all_photos(photo_dir)
        save_captions(captions, narration, captions_path)

    analysis_time = time.time() - start_time
    print(f"\n⏱️ AI 分析耗时: {analysis_time:.1f}s")

    # === Phase 2: FFmpeg 视频合成 ===
    print("\n" + "=" * 60)
    print("  Phase 2: FFmpeg 视频合成")
    print("=" * 60)

    compose_video(
        photo_dir=photo_dir,
        captions=captions,
        output_path=output_path,
        bgm_path=args.bgm,
        transition=args.transition,
        no_text=args.no_text,
    )

    total_time = time.time() - start_time
    print(f"\n🎉 全部完成！总耗时: {total_time:.1f}s")
    print(f"   📁 视频文件: {output_path}")
    print(f"   📝 文案文件: {captions_path}")


if __name__ == "__main__":
    asyncio.run(main())
