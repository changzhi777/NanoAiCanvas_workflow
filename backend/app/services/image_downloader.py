"""下载外部图片到本地存储，解决临时URL过期问题。"""
import asyncio
import logging
import os
import uuid
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import aiofiles
import httpx
from PIL import Image

logger = logging.getLogger(__name__)

_PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
ASSET_UPLOAD_DIR = os.environ.get(
    "ASSET_UPLOAD_DIR",
    os.path.join(_PROJECT_ROOT, "chat-uploads", "assets"),
)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
DOWNLOAD_TIMEOUT = 60
THUMBNAIL_SIZE = (256, 256)
THUMBNAIL_PREFIX = "thumb_"

EXT_WHITELIST = frozenset(
    ("png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "mp4", "webm", "mp3", "wav")
)

CT_MAP = {
    "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
    "image/webp": "webp", "image/svg+xml": "svg", "image/bmp": "bmp",
    "video/mp4": "mp4", "video/webm": "webm",
    "audio/mpeg": "mp3", "audio/wav": "wav",
}

THUMBABLE_TYPES = frozenset(("image", "storyboard_shot"))
DOWNLOADABLE_TYPES = frozenset(("image", "video", "storyboard_shot"))


def _ensure_dir() -> None:
    Path(ASSET_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def _ext_from_url(url: str, content_type: str = "") -> str:
    path = urlparse(url).path
    if "." in path.split("/")[-1]:
        ext = path.rsplit(".", 1)[-1].split("?")[0].lower()
        if ext in EXT_WHITELIST:
            return ext
    return CT_MAP.get(content_type, "png")


def is_external_url(url: str) -> bool:
    if not url:
        return False
    if url.startswith(("/asset-uploads/", "/chat-uploads/")):
        return False
    return url.startswith(("http://", "https://"))


async def _generate_thumbnail(content: bytes, ext: str) -> bytes | None:
    """生成缩略图，仅支持图片格式。"""
    try:
        img = Image.open(BytesIO(content))
        img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

        # 确保格式兼容
        save_format = "PNG" if ext in ("png", "svg", "bmp") else "JPEG"
        buf = BytesIO()
        img.save(buf, format=save_format, quality=85)
        return buf.getvalue()
    except Exception as e:
        logger.warning("Thumbnail generation failed: %s", e)
        return None


async def _save_file(filepath: str, content: bytes) -> None:
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)


async def download_image(url: str, asset_type: str = "image") -> tuple[str, str]:
    """下载外部图片到本地，返回 (本地URL, 文件名)。失败时返回原始URL。"""
    if not is_external_url(url):
        return url, ""

    _ensure_dir()

    file_id = uuid.uuid4().hex
    try:
        async with httpx.AsyncClient(timeout=DOWNLOAD_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            if len(resp.content) > MAX_FILE_SIZE:
                raise ValueError(f"File too large: {len(resp.content)} bytes")

            content_type = resp.headers.get("content-type", "")
            ext = _ext_from_url(url, content_type)
            filename = f"{file_id}.{ext}"

            filepath = os.path.join(ASSET_UPLOAD_DIR, filename)
            await _save_file(filepath, resp.content)

            # 图片类型自动生成缩略图
            thumbnail_url: str | None = None
            if asset_type in THUMBABLE_TYPES and ext not in ("svg",):
                thumb_content = await _generate_thumbnail(resp.content, ext)
                if thumb_content:
                    thumb_ext = "jpg" if ext in ("jpg", "jpeg") else "png"
                    thumb_filename = f"{THUMBNAIL_PREFIX}{file_id}.{thumb_ext}"
                    thumb_filepath = os.path.join(ASSET_UPLOAD_DIR, thumb_filename)
                    await _save_file(thumb_filepath, thumb_content)
                    thumbnail_url = f"/asset-uploads/{thumb_filename}"

            local_url = f"/asset-uploads/{filename}"
            logger.info("Downloaded %s -> %s (thumb: %s)", url[:60], filename, thumbnail_url is not None)
            return local_url, thumbnail_url or local_url

    except Exception as e:
        logger.warning("Download failed for %s: %s", url[:80], e)
        return url, url
