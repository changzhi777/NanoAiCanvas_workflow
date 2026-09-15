"""COS 对象存储：外链资源转存到腾讯云 COS

env 配置（全配齐才启用，否则调用方降级本地 asset-uploads）：
- COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
- COS_BASE_URL（可选，CDN 自定义域名；默认 {bucket}.cos.{region}.myqcloud.com）

用法：
    url = await transfer_to_cos(source_url, "tvc/task_xxx/shot1")
    # COS 未配置/失败 → 返回 None，调用方 fallback image_downloader.download_image()
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid

import httpx

logger = logging.getLogger(__name__)

DOWNLOAD_TIMEOUT = 120
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB

_REQUIRED_ENV = ("COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET", "COS_REGION")


def is_cos_enabled() -> bool:
    """4 个必需配置齐备才启用"""
    return all(os.environ.get(k) for k in _REQUIRED_ENV)


def _ext_from_url(url: str, content_type: str = "") -> str:
    """复用 image_downloader 的扩展名推断"""
    from app.services.image_downloader import _ext_from_url as f
    return f(url, content_type)


def _public_base() -> str:
    bucket = os.environ["COS_BUCKET"]
    region = os.environ["COS_REGION"]
    return os.environ.get("COS_BASE_URL") or f"https://{bucket}.cos.{region}.myqcloud.com"


async def transfer_to_cos(source_url: str, key_hint: str = "") -> str | None:
    """下载 source_url → 上传 COS → 返回公网 URL；未配置/失败返回 None（调用方降级）。"""
    if not is_cos_enabled():
        return None

    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        logger.warning("cos-python-sdk-v5 未安装，COS 转存跳过")
        return None

    try:
        async with httpx.AsyncClient(timeout=DOWNLOAD_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(source_url)
            resp.raise_for_status()
            content = resp.content

        if len(content) > MAX_FILE_SIZE:
            logger.warning(f"文件过大跳过 COS 转存: {len(content)}B > {MAX_FILE_SIZE}B")
            return None

        ext = _ext_from_url(source_url, resp.headers.get("content-type", ""))
        key = key_hint or f"tvc/{uuid.uuid4().hex}"
        if not key.endswith(f".{ext}"):
            key = f"{key}.{ext}"

        config = CosConfig(
            Region=os.environ["COS_REGION"],
            SecretId=os.environ["COS_SECRET_ID"],
            SecretKey=os.environ["COS_SECRET_KEY"],
        )
        client = CosS3Client(config)
        bucket = os.environ["COS_BUCKET"]

        # SDK 是同步的 → 线程池执行避免阻塞事件循环
        await asyncio.to_thread(
            client.put_object, Bucket=bucket, Body=content, Key=key
        )

        url = f"{_public_base().rstrip('/')}/{key}"
        logger.info(f"COS 转存成功: {source_url[:60]} -> {url}")
        return url
    except Exception as e:
        logger.warning(f"COS 转存失败 {source_url[:60]}: {e}")
        return None


async def transfer_with_fallback(source_url: str, key_hint: str = "", asset_type: str = "image") -> str:
    """转存统一入口：COS 优先 → 本地 asset-uploads 降级 → 原 URL 兜底。

    返回值替换原 URL 使用（绝不抛异常）。
    """
    from app.services.image_downloader import is_external_url, download_image

    if not is_external_url(source_url):
        return source_url

    cos_url = await transfer_to_cos(source_url, key_hint)
    if cos_url:
        return cos_url

    # 降级：本地 asset-uploads（image_downloader 已有完整实现）
    local_url, _ = await download_image(source_url, asset_type)
    return local_url or source_url
