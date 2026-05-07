"""
Wuyinkeji 图片生成 Provider
调用 https://api.wuyinkeji.com API
"""
import httpx
from typing import Dict, Any, List
from .base import BaseImageProvider


class WuyinkejiProvider(BaseImageProvider):
    """Wuyinkeji 图片生成 Provider"""

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        super().__init__(api_key, config)
        self.base_url = self.get_config("base_url", "https://api.wuyinkeji.com")
        self.timeout = self.get_config("timeout", 60)

    async def generate_image(self, params: Dict[str, Any]) -> str:
        """
        提交图片生成任务
        POST /api/async/image_nanoBanana2 or /api/async/image_gpt
        """
        model_type = params.get("model_type", "nano-banana2")
        prompt = params.get("prompt", "")
        size = params.get("size", "1K")
        urls = params.get("urls", [])

        # 选择端点
        endpoint_map = {
            "nano-banana2": "/api/async/image_nanoBanana2",
            "nano-banana-pro": "/api/async/image_nanoBanana2",
            "gpt-image-2": "/api/async/image_gpt",
        }
        endpoint = endpoint_map.get(model_type, "/api/async/image_nanoBanana2")

        # 构建请求体
        request_body = {
            "key": self.api_key,
            "prompt": prompt,
            "size": size,
            "urls": urls,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}{endpoint}",
                json=request_body
            )
            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                raise Exception(result.get("msg", "Unknown error"))

            return result.get("data", {}).get("id", "")

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询任务状态
        GET /api/async/detail?id={task_id}
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/api/async/detail?id={task_id}",
                headers={"Authorization": self.api_key}
            )
            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                return {
                    "task_id": task_id,
                    "status": "failed",
                    "error": result.get("msg", "Unknown error")
                }

            data = result.get("data", {})
            status = data.get("status", 0)

            # status: 0=处理中, 2=成功, 其他=失败
            if status == 0:
                return {
                    "task_id": task_id,
                    "status": "pending",
                    "images": [],
                }
            elif status == 2:
                result_data = data.get("result", {})
                images = []
                if isinstance(result_data, str):
                    images.append({"url": result_data})
                elif isinstance(result_data, list):
                    for item in result_data:
                        if isinstance(item, str):
                            images.append({"url": item})
                        elif isinstance(item, dict):
                            images.append(item)
                return {
                    "task_id": task_id,
                    "status": "success",
                    "images": images,
                }
            else:
                return {
                    "task_id": task_id,
                    "status": "failed",
                    "error": data.get("error", "Unknown error"),
                    "images": []
                }
