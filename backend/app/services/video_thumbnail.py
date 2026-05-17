"""
视频关键帧提取服务
使用 FFmpeg 从视频中提取关键帧作为缩略图
"""
import os
import subprocess
import tempfile
import httpx
import logging

logger = logging.getLogger("video_thumbnail")


def extract_keyframe(video_path: str, output_path: str, timestamp: float = 1.0) -> bool:
    """从视频文件提取指定时间点的一帧作为缩略图"""
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "4",
        "-vf", "scale=480:-2",
        output_path,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=30)
        return proc.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        logger.error(f"FFmpeg keyframe extract failed: {e}")
        return False


def get_video_duration(video_path: str) -> float:
    """获取视频时长（秒）"""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", video_path]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=10)
        return float(proc.stdout.decode().strip() or "0")
    except Exception:
        return 0.0


async def download_and_extract(video_url: str, output_path: str) -> bool:
    """下载视频并提取关键帧，返回是否成功"""
    with tempfile.TemporaryDirectory() as tmpdir:
        local_video = os.path.join(tmpdir, "video.mp4")
        try:
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as http:
                resp = await http.get(video_url)
                resp.raise_for_status()
                with open(local_video, "wb") as f:
                    f.write(resp.content)
        except Exception as e:
            logger.error(f"Video download failed: {e}")
            return False

        duration = get_video_duration(local_video)
        # 选择 10% 或 1 秒处的帧，避免黑屏开头
        ts = max(1.0, duration * 0.1) if duration > 0 else 1.0

        return extract_keyframe(local_video, output_path, timestamp=ts)
