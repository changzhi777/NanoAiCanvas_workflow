"""
Wuyinkeji 图片生成 Provider
调用 https://api.wuyinkeji.com API
鉴权：Authorization header（不再用 ?key= query）
"""
import httpx
from typing import Dict, Any, List
from .base import BaseImageProvider


def _wuyin_headers(api_key: str) -> Dict[str, str]:
    """速创 API 鉴权 header：Authorization + Content-Type"""
    return {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }


class WuyinkejiProvider(BaseImageProvider):
    """Wuyinkeji 图片生成 Provider"""

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        super().__init__(api_key, config)
        self.base_url = self.get_config("base_url", "https://api.wuyinkeji.com")
        self.timeout = self.get_config("timeout", 60)

    async def generate_image(self, params: Dict[str, Any]) -> str:
        """
        提交图片生成任务
        NanoBanana2/GPT-Image-2/2.5：统一 Authorization header 鉴权
        """
        model_type = params.get("model_type", "nano-banana2")
        prompt = params.get("prompt", "")
        size = params.get("size", "1K")
        urls = params.get("urls", [])

        # 选择端点（速创新规范：gpt-image-2.5 / nano-banana2.1 独立端点）
        endpoint_map = {
            "nano-banana2": "/api/async/image_nanoBanana2",
            "nano-banana-pro": "/api/async/image_nanoBanana2",
            "gpt-image-2": "/api/async/image_gpt",
            "gpt-image-2.5": "/api/async/image_gpt_2.5",
            "nano-banana2.1": "/api/async/NanoBanana2.1",
            "minimax-h3": "/api/async/video_minimax_h3",
        }
        endpoint = endpoint_map.get(model_type, "/api/async/image_nanoBanana2")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            if model_type == "minimax-h3":
                # MiniMax H3 图生视频：首帧/尾帧/参考图 + 分辨率/比例/时长
                body = {"prompt": prompt}
                for k in ("first_frame", "last_frame", "resolution", "ratio", "duration"):
                    v = params.get(k)
                    if v not in (None, ""):
                        body[k] = v
                imgs = params.get("images") or []
                if imgs:
                    body["images"] = ",".join(imgs) if isinstance(imgs, list) else imgs
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=_wuyin_headers(self.api_key),
                    json=body,
                )
            elif model_type == "nano-banana2.1":
                # NanoBanana2.1：JSON body，参数驼峰（imageSize/aspectRatio），key 走 Authorization header
                # 首个支持比例参数的端点（auto/1:1/.../21:9/1:4/1:8/4:1/8:1）
                body = {
                    "prompt": prompt,
                    "imageSize": size,
                    "aspectRatio": params.get("aspect_ratio", "auto") or "auto",
                }
                if urls:
                    body["urls"] = ",".join(urls) if isinstance(urls, list) else urls
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=_wuyin_headers(self.api_key),
                    json=body,
                )
            elif model_type == "gpt-image-2.5":
                # GPT-Image-2.5：只认 prompt / aspectRatio / urls（size 会报“未绑定的参数”）
                # 局部重绘：mask 为黑底白区蒙版（白=可改），速创原生透传给 GPT 编辑通道
                body = {"prompt": prompt}
                ar = params.get("aspect_ratio") or "auto"
                if ar and ar != "auto":
                    body["aspectRatio"] = ar
                if urls:
                    body["urls"] = ",".join(urls) if isinstance(urls, list) else urls
                mask = params.get("mask")
                if mask:
                    body["mask"] = mask
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=_wuyin_headers(self.api_key),
                    json=body,
                )
            elif model_type == "gpt-image-2":
                # GPT-Image-2：JSON body，key 通过 Authorization header
                body = {"prompt": prompt, "size": size}
                if urls:
                    body["urls"] = ",".join(urls) if isinstance(urls, list) else urls
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=_wuyin_headers(self.api_key),
                    json=body,
                )
            else:
                # NanoBanana2：form-encoded，key 通过 Authorization header（不再用 ?key= query）
                form_data = {"prompt": prompt, "size": size}
                if urls:
                    form_data["urls"] = ",".join(urls) if isinstance(urls, list) else urls
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers={"Authorization": self.api_key},
                    data=form_data,
                )

            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                raise Exception(result.get("msg", "Unknown error"))

            return result.get("data", {}).get("id", "")

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询任务状态
        GET /api/async/detail?key=...&id=...  →  改为 Authorization header
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/api/async/detail",
                params={"id": task_id},
                headers=_wuyin_headers(self.api_key),
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
