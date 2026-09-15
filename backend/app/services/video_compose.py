"""TVC 视频合成 service — FFmpeg filter 构建与执行

拆分自 workflow_tasks.py compose 端点，核心逻辑为纯函数（可单测）：

- xfade 转场链式叠加（P0）
- BGM afade + loudnorm（P1）
- 质量档 crf/preset（P2）
- 多规格输出

设计原则：filter 构建与 subprocess 执行分离，前者纯函数无副作用。
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ==================== 常量映射 ====================

RESOLUTION_MAP = {
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
    "2k": "2560x1440",
}

# 前端 transition 值 → ffmpeg xfade transition 名；None = 硬切（纯 concat）
XFADE_MAP: dict[str, str | None] = {
    "cut": None,
    "fade": "fade",
    "dissolve": "dissolve",
    "fadeblack": "fadeblack",
    "fadewhite": "fadewhite",
    "wipeleft": "wipeleft",
    "wiperight": "wiperight",
    "slideup": "slideup",
    "slidedown": "slidedown",
    "circleopen": "circleopen",
    "circleclose": "circleclose",
    "radial": "radial",
}

QUALITY_MAP = {
    "high": {"crf": "18", "preset": "slow"},
    "standard": {"crf": "23", "preset": "fast"},
    "draft": {"crf": "28", "preset": "veryfast"},
}

DEFAULT_FADE_DURATION = 0.5  # 秒


@dataclass
class ComposeOptions:
    """合成选项（对齐 ComposeRequest）"""
    resolution: str = "720p"
    quality: str = "standard"
    transition: str = "fade"
    fade_duration: float = DEFAULT_FADE_DURATION
    bgm_volume: float = 0.3
    bgm_fade_in: float = 1.0
    bgm_fade_out: float = 1.5
    output_format: str = "mp4"
    normalize_fps: int = 30


@dataclass
class ComposeResult:
    outputs: dict[str, str] = field(default_factory=dict)  # {"720p": path, "1080p": path}
    duration: float = 0.0


# ==================== 纯函数：filter 构建 ====================


def resolve_resolution(resolution: str) -> str:
    """'720p' → '1280x720'；已是 WxH 格式原样返回"""
    if "x" in resolution:
        return resolution
    return RESOLUTION_MAP.get(resolution.lower(), "1280x720")


def resolve_transition(transition: str) -> str | None:
    """前端 transition 值 → xfade 名；未知值降级为 fade；'cut' → None"""
    if transition in XFADE_MAP:
        return XFADE_MAP[transition]
    return "fade"


def quality_args(quality: str) -> dict[str, str]:
    return QUALITY_MAP.get(quality, QUALITY_MAP["standard"])


def build_normalize_filter(resolution: str) -> str:
    """单段标准化 filter：scale + pad + 统一像素格式/帧率（xfade 兼容硬要求）"""
    w, h = resolution.split("x")
    return (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"setsar=1,format=yuv420p"
    )


def build_xfade_chain(
    durations: list[float],
    transition: str = "fade",
    fade_duration: float = DEFAULT_FADE_DURATION,
) -> str | None:
    """N 段视频 xfade 链式 filter_complex。

    返回 None 表示不叠转场（硬切，走 concat demuxer）。

    示例（3 段，每段 5s，fade 0.5s）：
      [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
      [v01][2:v]xfade=transition=fade:duration=0.5:offset=9.0[vout]

    offset 语义：第 k 次转场的起始时间 = 前 k 段总时长（扣除已消耗的转场时长）- fade_duration
    """
    xfade_name = resolve_transition(transition)
    if xfade_name is None or len(durations) < 2:
        return None

    # fade 不得超过最短片段的一半（避免吃穿）
    min_dur = min(durations)
    fade = max(0.1, min(fade_duration, min_dur * 0.4))

    parts: list[str] = []
    prev_label = "[0:v]"
    # 累积的"已消耗时长"：每叠一次转场，总长缩短 fade 秒
    cumulative = durations[0]
    for i in range(1, len(durations)):
        out_label = f"[v{i:02d}]" if i < len(durations) - 1 else "[vout]"
        offset = max(0.1, cumulative - fade)
        parts.append(
            f"{prev_label}[{i}:v]xfade=transition={xfade_name}:"
            f"duration={fade:.2f}:offset={offset:.2f}{out_label}"
        )
        cumulative = cumulative - fade + durations[i]
        prev_label = out_label

    return ";".join(parts)


def build_bgm_filter(
    bgm_volume: float = 0.3,
    fade_in: float = 1.0,
    fade_out: float = 1.5,
    total_duration: float = 0.0,
    has_original_audio: bool = False,
) -> str:
    """BGM 处理 filter：volume + afade in/out + loudnorm（响度统一）+ alimiter（防削波）。

    has_original_audio=False（TVC 分镜视频通常无音轨）：BGM 单独成轨
    has_original_audio=True：BGM 与原声 amix
    """
    vol = max(0.0, min(1.0, bgm_volume))
    chain = [f"volume={vol:.2f}"]
    if fade_in > 0:
        chain.append(f"afade=t=in:st=0:d={fade_in:.2f}")
    if fade_out > 0 and total_duration > fade_out:
        st = total_duration - fade_out
        chain.append(f"afade=t=out:st={st:.2f}:d={fade_out:.2f}")
    # 响度归一化（EBU R128）+ 限幅
    chain.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    chain.append("alimiter=limit=0.95")
    bgm_chain = ",".join(chain)

    if has_original_audio:
        return f"[1:a]{bgm_chain}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
    return f"[1:a]{bgm_chain}[aout]"


# ==================== 执行：subprocess 封装 ====================


def _run_ffmpeg(args: list[str], timeout: int = 600) -> tuple[int, str]:
    """同步跑 ffmpeg；返回 (returncode, stderr_tail)"""
    try:
        proc = subprocess.run(args, capture_output=True, timeout=timeout)
        return proc.returncode, proc.stderr.decode(errors="ignore")[-800:]
    except subprocess.TimeoutExpired:
        return -1, f"ffmpeg timeout after {timeout}s"


def probe_duration(path: str) -> float:
    """ffprobe 时长（秒）"""
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
            capture_output=True,
            timeout=15,
        )
        return float(proc.stdout.decode().strip() or "0")
    except Exception as e:
        logger.warning(f"probe_duration failed for {path}: {e}")
        return 0.0


def probe_has_audio(path: str) -> bool:
    """检测视频是否含音轨"""
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "quiet", "-select_streams", "a", "-show_entries", "stream=codec_type",
             "-of", "csv=p=0", path],
            capture_output=True,
            timeout=15,
        )
        return bool(proc.stdout.decode().strip())
    except Exception:
        return False


def normalize_video(
    input_path: str,
    output_path: str,
    resolution: str = "720p",
    quality: str = "standard",
    fps: int = 30,
) -> bool:
    """标准化：scale+pad+yuv420p+fps，去除音轨（合成阶段统一处理音频）"""
    q = quality_args(quality)
    args = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", build_normalize_filter(resolve_resolution(resolution)),
        "-r", str(fps),
        "-c:v", "libx264", "-preset", q["preset"], "-crf", q["crf"],
        "-an",
        output_path,
    ]
    code, err = _run_ffmpeg(args, timeout=180)
    if code != 0:
        logger.error(f"normalize failed: {err}")
    return code == 0


def concat_demuxer(normalized: list[str], output_path: str, tmpdir: str) -> bool:
    """硬切拼接（无转场路径）"""
    concat_list = os.path.join(tmpdir, "concat.txt")
    with open(concat_list, "w") as f:
        for nf in normalized:
            f.write(f"file '{nf}'\n")
    args = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list, "-c", "copy", output_path,
    ]
    code, err = _run_ffmpeg(args, timeout=180)
    if code != 0:
        logger.error(f"concat failed: {err}")
    return code == 0


def xfade_concat(
    normalized: list[str],
    durations: list[float],
    output_path: str,
    transition: str = "fade",
    fade_duration: float = DEFAULT_FADE_DURATION,
    quality: str = "standard",
    fps: int = 30,
) -> bool:
    """xfade 转场拼接（重编码）"""
    filter_complex = build_xfade_chain(durations, transition, fade_duration)
    if not filter_complex:
        return False
    q = quality_args(quality)
    args = ["ffmpeg", "-y"]
    for nf in normalized:
        args += ["-i", nf]
    args += [
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-r", str(fps),
        "-c:v", "libx264", "-preset", q["preset"], "-crf", q["crf"],
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    code, err = _run_ffmpeg(args, timeout=600)
    if code != 0:
        logger.error(f"xfade failed: {err}")
    return code == 0


def mix_bgm(
    video_path: str,
    bgm_path: str,
    output_path: str,
    bgm_volume: float = 0.3,
    bgm_fade_in: float = 1.0,
    bgm_fade_out: float = 1.5,
    total_duration: float = 0.0,
) -> bool:
    """BGM 混音：volume + afade + loudnorm + alimiter"""
    has_orig = probe_has_audio(video_path)
    filter_complex = build_bgm_filter(bgm_volume, bgm_fade_in, bgm_fade_out, total_duration, has_orig)
    args = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", bgm_path,
        "-filter_complex", filter_complex,
    ]
    if has_orig:
        args += ["-map", "0:v", "-map", "[aout]"]
    else:
        args += ["-map", "0:v", "-map", "[aout]", "-shortest"]
    args += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output_path]
    code, err = _run_ffmpeg(args, timeout=300)
    if code != 0:
        logger.error(f"bgm mix failed: {err}")
    return code == 0


def rescale_video(input_path: str, output_path: str, resolution: str, quality: str = "standard") -> bool:
    """从合成母版出其他规格（P2 多规格输出）"""
    q = quality_args(quality)
    args = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", build_normalize_filter(resolve_resolution(resolution)),
        "-c:v", "libx264", "-preset", q["preset"], "-crf", q["crf"],
        "-c:a", "copy",
        output_path,
    ]
    code, err = _run_ffmpeg(args, timeout=600)
    if code != 0:
        logger.error(f"rescale failed: {err}")
    return code == 0


def generate_srt(cues: list[dict]) -> str:
    """字幕 cue 列表 → SRT 内容。

    cues: [{"text": "...", "start": 0.0, "end": 2.5}]
    """
    def _ts(sec: float) -> str:
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        ms = int((sec - int(sec)) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    for i, cue in enumerate(cues, 1):
        lines.append(str(i))
        lines.append(f"{_ts(cue['start'])} --> {_ts(cue['end'])}")
        lines.append(cue["text"])
        lines.append("")
    return "\n".join(lines)


def burn_subtitles(input_path: str, srt_path: str, output_path: str, quality: str = "standard") -> bool:
    """字幕烧录（SRT → hardsub）"""
    q = quality_args(quality)
    # 转义路径中的特殊字符（ffmpeg filter 语法）
    escaped = srt_path.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    args = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", f"subtitles='{escaped}':force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,MarginV=40'",
        "-c:v", "libx264", "-preset", q["preset"], "-crf", q["crf"],
        "-c:a", "copy",
        output_path,
    ]
    code, err = _run_ffmpeg(args, timeout=600)
    if code != 0:
        logger.error(f"subtitle burn failed: {err}")
    return code == 0


# ==================== 编排 ====================


async def compose_pipeline(
    video_paths: list[str],
    tmpdir: str,
    opts: ComposeOptions,
    bgm_path: str | None = None,
    subtitles: list[dict] | None = None,
) -> ComposeResult:
    """完整合成管线（在已下载好的本地文件上执行）。

    步骤：normalize → xfade/concat → BGM → 字幕 → 多规格
    所有 ffmpeg 调用走 to_thread 避免阻塞事件循环。
    """
    loop = asyncio.get_running_loop()

    # 1. normalize
    normalized: list[str] = []
    for i, vp in enumerate(video_paths):
        np_ = os.path.join(tmpdir, f"norm_{i:03d}.mp4")
        ok = await loop.run_in_executor(
            None, normalize_video, vp, np_, opts.resolution, opts.quality, opts.normalize_fps
        )
        if not ok:
            raise RuntimeError(f"视频 {i+1} 格式化失败")
        normalized.append(np_)

    # 2. 时长探测（xfade offset 计算依据）
    durations = [probe_duration(p) for p in normalized]
    if any(d <= 0 for d in durations):
        durations = [5.0] * len(normalized)  # 探测失败兜底

    # 3. 拼接（xfade 优先，失败降级 concat）
    merged = os.path.join(tmpdir, f"merged.{opts.output_format}")
    use_xfade = resolve_transition(opts.transition) is not None and len(normalized) >= 2
    if use_xfade:
        ok = await loop.run_in_executor(
            None, xfade_concat, normalized, durations, merged,
            opts.transition, opts.fade_duration, opts.quality, opts.normalize_fps,
        )
        if not ok:
            logger.warning("xfade failed, falling back to concat demuxer")
            use_xfade = False
    if not use_xfade:
        ok = await loop.run_in_executor(None, concat_demuxer, normalized, merged, tmpdir)
        if not ok:
            raise RuntimeError("视频拼接失败")

    # 4. BGM
    final = merged
    if bgm_path:
        total = probe_duration(merged)
        mixed = os.path.join(tmpdir, f"mixed.{opts.output_format}")
        ok = await loop.run_in_executor(
            None, mix_bgm, merged, bgm_path, mixed,
            opts.bgm_volume, opts.bgm_fade_in, opts.bgm_fade_out, total,
        )
        if ok:
            final = mixed
        else:
            logger.warning("BGM mix failed, using silent video")

    # 5. 字幕
    if subtitles:
        total = probe_duration(final)
        if total > 0:
            srt_path = os.path.join(tmpdir, "subs.srt")
            with open(srt_path, "w", encoding="utf-8") as f:
                f.write(generate_srt(subtitles))
            subbed = os.path.join(tmpdir, f"subbed.{opts.output_format}")
            ok = await loop.run_in_executor(None, burn_subtitles, final, srt_path, subbed, opts.quality)
            if ok:
                final = subbed
            else:
                logger.warning("subtitle burn failed, skipping")

    # 6. 多规格输出
    outputs: dict[str, str] = {}
    if opts.resolution == "all":
        # 母版 720p（normalize 已按 720p 处理）；再出 1080p
        master = os.path.join(tmpdir, f"master.{opts.output_format}")
        shutil.copy2(final, master)
        outputs["720p"] = master
        hd = os.path.join(tmpdir, f"hd.{opts.output_format}")
        ok = await loop.run_in_executor(None, rescale_video, master, hd, "1080p", opts.quality)
        if ok:
            outputs["1080p"] = hd
    else:
        outputs[opts.resolution] = final

    return ComposeResult(outputs=outputs, duration=probe_duration(final))
