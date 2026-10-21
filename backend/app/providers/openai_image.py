"""OpenAI 兼容图像 Provider（国内中转站通用）

适配任何提供 `POST /v1/images/generations` 的服务（API易 / APINebula / UU / 302 / 官方等）。
配置（BackendKeyMapping.mcp_config）:
  {"base_url": "https://api.example.com", "model": "gemini-nano-banana-2.1", "timeout": 180}

与速创的差异：OpenAI Images 是同步接口。本 Provider 在后台 asyncio 任务中执行，
立即返回 `sync_<uuid>` 任务号，状态通过进程内 _JOBS 表查询（单进程部署足够）。
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
import uuid

import httpx

from .base import BaseImageProvider

logger = logging.getLogger(__name__)

# 进程内同步任务状态表
_JOBS: dict[str, dict] = {}

_OPENAI_SIZES = {
    ("1K", "1:1"): "1024x1024",
    ("1K", "16:9"): "1536x1024",
    ("1K", "9:16"): "1024x1536",
}


def sync_status(task_id: str) -> dict | None:
    """同步 Provider 任务状态（供通用轮询逻辑优先查询）"""
    return _JOBS.get(task_id)


def _public_url(filename: str) -> str:
    base = os.environ.get("NANOAI_PUBLIC_BASE", "https://inkforge.com.cn/nanoai").rstrip("/")
    return f"{base}/asset-uploads/{filename}"


def _save_b64(b64: str) -> str:
    upload_dir = os.environ.get(
        "ASSET_UPLOAD_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "asset-uploads"),
    )
    os.makedirs(upload_dir, exist_ok=True)
    name = f"relay_{uuid.uuid4().hex}.png"
    with open(os.path.join(upload_dir, name), "wb") as f:
        f.write(base64.b64decode(b64))
    return _public_url(name)


class OpenAIImageProvider(BaseImageProvider):
    """OpenAI Images API 兼容 Provider（同步 → 后台任务）"""

    def __init__(self, api_key: str, config: dict = None):
        super().__init__(api_key, config)
        cfg = config or {}
        self.base_url = (cfg.get("base_url") or "https://api.openai.com").rstrip("/")
        self.model = cfg.get("model") or "gpt-image-1"
        self.timeout = float(cfg.get("timeout", 180))
        self.api_key = api_key

    async def generate_image(self, params: dict) -> str:
        task_id = f"sync_{uuid.uuid4().hex}"
        _JOBS[task_id] = {"status": "pending", "images": None, "error": None}
        asyncio.create_task(self._run(task_id, params))
        return task_id

    async def _run(self, task_id: str, params: dict) -> None:
        try:
            prompt = params.get("prompt", "")
            size = _OPENAI_SIZES.get((params.get("size", "1K"), params.get("aspect_ratio", "1:1")))
            body: dict = {"model": self.model, "prompt": prompt, "n": 1}
            if size:
                body["size"] = size
            urls = params.get("urls") or []
            if urls:
                # 部分中转支持 image 字段传 URL（非标准扩展，失败时由调用方换 Provider）
                body["image"] = urls[0] if len(urls) == 1 else urls

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/v1/images/generations",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()

            item = (data.get("data") or [{}])[0]
            url = item.get("url")
            if not url and item.get("b64_json"):
                url = _save_b64(item["b64_json"])
            if not url:
                raise RuntimeError(str(data.get("error") or "Provider 未返回图片"))
            _JOBS[task_id] = {"status": "success", "images": [{"url": url}], "error": None}
            logger.info("OpenAI-compatible image done: %s", url[:80])
        except Exception as e:  # noqa: BLE001
            logger.warning("OpenAI-compatible image failed: %s", e)
            _JOBS[task_id] = {"status": "failed", "images": None, "error": str(e)}

    async def get_task_status(self, task_id: str) -> dict:
        return _JOBS.get(task_id) or {"status": "failed", "error": "任务不存在", "images": None}
