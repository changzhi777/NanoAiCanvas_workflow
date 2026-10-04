"""SRT 字幕生成器——dialogue_timeline → SRT 文件 + 容器烧录。

时间轴权威源：脚本的 dialogue_timeline（单一真相源，与 H3 <d> 台词同变量）。
内置：语速校验（3.5 字/秒）、自动换行（14 字/行）、末行截断。
"""
import asyncio
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)

# 中文语速参考（字/秒）
SPEECH_RATE_MIN = 2.0
SPEECH_RATE_MAX = 6.0
SPEECH_RATE_DEFAULT = 3.5

# 字幕自动换行（768px 宽 / 52px 字号 ≈ 14 字/行）
MAX_CHARS_PER_LINE = 14


def _fmt_ts(seconds: float) -> str:
    """秒 → SRT 时间戳 00:00:01,000"""
    ms = int(round(seconds * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _wrap_text(text: str, max_chars: int = MAX_CHARS_PER_LINE) -> str:
    """超长台词自动折行（优先在标点断开）"""
    if len(text) <= max_chars:
        return text
    # 找最近的标点断点
    break_chars = "，。！？；：、…—"
    best_break = max_chars
    for i in range(min(max_chars, len(text) - 1), 0, -1):
        if text[i] in break_chars:
            best_break = i + 1
            break
    else:
        best_break = max_chars
    return text[:best_break] + "\n" + text[best_break:]


def _validate_speech_rate(entries: list[dict]) -> list[dict]:
    """语速校验：duration/char_count 超出 2-6 字/秒时修正至 3.5 字/秒"""
    corrected = []
    for e in entries:
        text = e["text"].replace("\n", "")
        char_count = len(text)
        duration = e["end"] - e["start"]
        if char_count > 0 and duration > 0:
            rate = char_count / duration
            if rate > SPEECH_RATE_MAX:
                # 语速过快 → 扩展时长
                new_duration = char_count / SPEECH_RATE_DEFAULT
                e = {**e, "end": e["start"] + new_duration}
            elif rate < SPEECH_RATE_MIN:
                # 语速过慢 → 压缩时长
                new_duration = char_count / SPEECH_RATE_DEFAULT
                e = {**e, "end": e["start"] + max(new_duration, 0.5)}
        corrected.append(e)
    return corrected


def generate_srt(srt_entries: list[dict], video_duration: float) -> str:
    """srt_entries [{text, start, end}] → SRT 文本

    内置：语速校验 + 自动换行 + 末行截断。
    """
    if not srt_entries:
        return ""
    # 语速校验
    entries = _validate_speech_rate(srt_entries)
    # 生成 SRT
    lines = []
    for i, e in enumerate(entries):
        text = _wrap_text(e["text"])
        start = max(0, e["start"])
        end = min(e["end"], video_duration)  # 末行截断
        if end <= start:
            continue  # 跳过无效条目
        lines.append(f"{i + 1}")
        lines.append(f"{_fmt_ts(start)} --> {_fmt_ts(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


async def burn_subtitles(video_path: str, srt_content: str,
                         output_path: str = None) -> str:
    """容器内 ffmpeg 烧录字幕（底部 10%，白字黑边，veryfast）。

    返回烧录后视频路径。失败抛异常（上层降级用干净版）。
    """
    if output_path is None:
        base, ext = os.path.splitext(video_path)
        output_path = f"{base}_subtitled{ext}"

    # SRT 写临时文件
    srt_file = tempfile.NamedTemporaryFile(mode="w", suffix=".srt", delete=False,
                                            encoding="utf-8")
    srt_file.write(srt_content)
    srt_file.close()

    try:
        # force_style: 底部 MarginV=30（约 10% 高度），52px，白字黑边
        style = ("FontSize=24,MarginV=30,PrimaryColour=&H00FFFFFF,"
                 "OutlineColour=&H00000000,Outline=3,Bold=1")
        cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-i", video_path,
            "-vf", f"subtitles={srt_file.name}:force_style='{style}'",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-c:a", "copy", "-movflags", "+faststart",
            output_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        except asyncio.TimeoutError:
            proc.kill()
            raise RuntimeError("subtitle burn timeout after 120s")
        if proc.returncode != 0:
            raise RuntimeError(f"subtitle burn failed: {stderr.decode()[:200]}")
        return output_path
    finally:
        os.unlink(srt_file.name)
