"""
草花互动 — 即梦（Jimeng/Volcengine）图片+视频生成 Provider
API 文档: https://www.volcengine.com/product/jimeng
"""
import httpx
from typing import Dict, Any
from .base import BaseImageProvider


class CaohuaJimengProvider(BaseImageProvider):
    """草花互动即梦 Provider — 支持图片和视频生成"""

    BASE_URL = "https://api.jimeng.jike.com/v1"

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        super().__init__(api_key, config)
        self.timeout = self.get_config("timeout", 120)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ---- 图片 ----

    async def generate_image(self, params: Dict[str, Any]) -> str:
        """提交图片生成任务，返回 task_id"""
        body: Dict[str, Any] = {
            "model": params.get("model", "jimeng-2.1"),
            "prompt": params.get("prompt", ""),
        }
        if params.get("negative_prompt"):
            body["negative_prompt"] = params["negative_prompt"]
        if params.get("size"):
            body["size"] = params["size"]
        if params.get("n"):
            body["n"] = params["n"]
        if params.get("seed"):
            body["seed"] = params["seed"]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.BASE_URL}/images/generations",
                json=body,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            # 即梦返回 id 或 data[0].id
            task_id = data.get("id") or data.get("data", [{}])[0].get("id", "")
            if not task_id:
                raise Exception(f"No task_id in response: {data}")
            return task_id

    # ---- 视频 ----

    async def generate_video(self, params: Dict[str, Any]) -> str:
        """提交视频生成任务，返回 task_id"""
        body: Dict[str, Any] = {
            "model": params.get("model", "jimeng-video-01"),
            "prompt": params.get("prompt", ""),
        }
        if params.get("image_url"):
            body["image_url"] = params["image_url"]
        if params.get("duration"):
            body["duration"] = params["duration"]
        if params.get("ratio"):
            body["ratio"] = params["ratio"]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.BASE_URL}/videos/generations",
                json=body,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            task_id = data.get("id") or data.get("data", [{}])[0].get("id", "")
            if not task_id:
                raise Exception(f"No task_id in response: {data}")
            return task_id

    # ---- 查询状态 ----

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """查询任务状态（自动判断图片/视频）"""
        # 先尝试图片，再尝试视频
        for endpoint in ["images", "videos"]:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/{endpoint}/{task_id}",
                    headers=self._headers(),
                )
                if resp.status_code == 404:
                    continue
                resp.raise_for_status()
                return self._normalize_status(resp.json())

        return {"task_id": task_id, "status": "failed", "error": "Task not found"}

    def _normalize_status(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """统一状态格式"""
        raw_status = data.get("status", "")
        images = []

        if raw_status in ("succeeded", "success", "complete"):
            # 提取图片/视频URL
            result_data = data.get("data", [])
            if isinstance(result_data, list):
                images = [
                    item.get("url", "")
                    for item in result_data
                    if item.get("url")
                ]
            elif isinstance(result_data, dict) and result_data.get("url"):
                images = [result_data["url"]]

            return {
                "task_id": data.get("id", ""),
                "status": "success",
                "images": images,
            }

        if raw_status in ("failed", "error"):
            return {
                "task_id": data.get("id", ""),
                "status": "failed",
                "error": data.get("error", {}).get("message", "Unknown error"),
            }

        # pending / processing / queued
        return {
            "task_id": data.get("id", ""),
            "status": "processing" if raw_status == "processing" else "pending",
        }
