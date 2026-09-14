"""
Image Generator for GPT Image 2 Skill

Uses wuyinkeji.com GPT-Image API with shared httpx client.
"""

import uuid
import os
import asyncio
from typing import Dict, Any, Optional, Callable
import httpx


class ImageGenerationTask:
    def __init__(self, task_id: str, prompt: str, size: str = "1024x1024", quality: str = "standard"):
        self.task_id = task_id
        self.prompt = prompt
        self.size = size
        self.quality = quality
        self.status = "pending"
        self.progress = 0
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "status": self.status,
            "progress": self.progress,
            "result": self.result,
            "error": self.error
        }


WUYIN_BASE = "https://api.wuyinkeji.com"
WUYIN_KEY = os.getenv("WUYINKEJI_API_KEY", "eLGzPZw0935TCJm0fn890TsvAN")


class ImageGenerator:
    def __init__(self):
        self._tasks: Dict[str, ImageGenerationTask] = {}

    def create_task(self, prompt: str, size: str = "1024x1024", quality: str = "standard") -> ImageGenerationTask:
        task_id = str(uuid.uuid4())
        task = ImageGenerationTask(task_id, prompt, size, quality)
        self._tasks[task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[ImageGenerationTask]:
        return self._tasks.get(task_id)

    async def execute_task(self, task_id: str, api_key: Optional[str] = None, progress_callback: Optional[Callable] = None):
        task = self.get_task(task_id)
        if not task:
            return

        task.status = "processing"

        try:
            headers = {"Authorization": WUYIN_KEY, "Content-Type": "application/json"}

            async with httpx.AsyncClient(timeout=60.0) as client:
                # Submit generation
                task.progress = 20
                resp = await client.post(
                    f"{WUYIN_BASE}/api/async/image_gpt",
                    headers=headers,
                    json={"prompt": task.prompt, "size": "auto"},
                )
                if resp.status_code != 200:
                    raise Exception(f"API error {resp.status_code}: {resp.text[:200]}")

                data = resp.json()
                if data.get("code") != 200:
                    raise Exception(data.get("msg", "submit failed"))

                remote_id = data.get("data", {}).get("id")
                if not remote_id:
                    raise Exception("no task id from API")

                task.progress = 40

                # Poll for result (max 120s, every 3s)
                for i in range(40):
                    await asyncio.sleep(3)
                    poll_resp = await client.get(
                        f"{WUYIN_BASE}/api/async/detail",
                        headers={"Authorization": WUYIN_KEY},
                        params={"key": WUYIN_KEY, "id": remote_id},
                    )
                    if poll_resp.status_code != 200:
                        continue

                    poll_data = poll_resp.json()
                    if poll_data.get("code") != 200:
                        continue

                    result_info = poll_data.get("data", {})
                    status_val = result_info.get("status", 0)

                    if status_val == 2:
                        images = result_info.get("result", [])
                        if images:
                            url = images[0] if isinstance(images[0], str) else images[0].get("url", "")
                            task.result = {"url": url}
                            task.status = "completed"
                            task.progress = 100
                            return
                        raise Exception("completed but no image")

                    elif status_val == 0:
                        task.progress = min(90, 40 + i * 2)
                        continue

                    else:
                        raise Exception(result_info.get("message", "generation failed"))

                raise Exception("generation timeout (120s)")

        except Exception as e:
            task.status = "failed"
            task.error = str(e)


_generator: Optional[ImageGenerator] = None

def get_image_generator() -> ImageGenerator:
    global _generator
    if _generator is None:
        _generator = ImageGenerator()
    return _generator
