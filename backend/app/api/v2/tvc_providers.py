"""
TVC 图片/视频 Provider 工厂
统一管理 3 个图片 Provider + 3 个视频 Provider
"""
import httpx
import asyncio
from typing import Callable

from app.config import Settings


# ==================== 图片 Provider ====================

def _gen_one_jimeng(settings: Settings) -> Callable:
    api_key = settings.JIMENG_API_KEY
    base_url = settings.JIMENG_API_BASE_URL

    async def _gen(subtask: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{subtask['id']}.png"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/image/generation",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "jimeng-image-01", "prompt": prompt, "size": "1K", "aspect_ratio": "16:9"},
            )
            if resp.status_code != 200:
                raise Exception(f"Jimeng image error: {resp.status_code}")
            data = resp.json()
            return {"image_url": data.get("data", {}).get("image_url", "")}

    return _gen


def _gen_one_gpt_image_2(settings: Settings) -> Callable:
    api_key = settings.WUYINKEJI_API_KEY
    base_url = settings.WUYINKEJI_API_BASE_URL.rstrip("/")

    async def _gen(subtask: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{subtask['id']}.png"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/api/async/image_gpt?key={api_key}",
                data={"prompt": prompt, "size": "auto"},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                raise Exception(f"GPT-Image-2 submit error: {resp.status_code}")
            result = resp.json()
            if result.get("code") != 200:
                raise Exception(f"GPT-Image-2 submit failed: {result.get('msg', 'unknown')}")

            task_uid = result.get("data", {}).get("id", "")
            if not task_uid:
                raise Exception("No task id in GPT-Image-2 response")

        max_wait = 180
        interval = 5
        elapsed = 0
        async with httpx.AsyncClient(timeout=30) as client:
            while elapsed < max_wait:
                await asyncio.sleep(interval)
                elapsed += interval
                resp = await client.get(
                    f"{base_url}/api/async/detail?key={api_key}&id={task_uid}"
                )
                if resp.status_code != 200:
                    continue
                data = resp.json().get("data", {})
                status = data.get("status", 0)

                if status == 2:
                    result_data = data.get("result", {})
                    url = ""
                    if isinstance(result_data, str):
                        url = result_data
                    elif isinstance(result_data, list) and result_data:
                        item = result_data[0]
                        url = item if isinstance(item, str) else item.get("url", "")
                    elif isinstance(result_data, dict):
                        url = result_data.get("url", "")
                    if not url:
                        raise Exception(f"GPT-Image-2 succeeded but no URL: {data}")
                    return {"image_url": url}

                if status not in (0, 1):
                    raise Exception(f"GPT-Image-2 failed with status={status}")

        raise Exception(f"GPT-Image-2 timeout after {max_wait}s (task: {task_uid})")

    return _gen


def _gen_one_minimax(settings: Settings) -> Callable:
    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_API_BASE_URL.rstrip("/")

    async def _gen(subtask: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{subtask['id']}.png"}

        body = {
            "model": "image-01",
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "n": 1,
            "response_format": "url",
            "prompt_optimizer": True,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{base_url}/image_generation",
                json=body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                raise Exception(f"MiniMax image error: {resp.status_code} {resp.text}")

            data = resp.json()
            base_resp = data.get("base_resp", {})
            if base_resp.get("status_code", 0) != 0:
                raise Exception(f"MiniMax image failed: {base_resp.get('status_msg', 'unknown')}")

            urls = data.get("data", {}).get("image_urls", [])
            if not urls:
                raise Exception(f"No image_urls in MiniMax response: {resp.text}")

            return {"image_url": urls[0]}

    return _gen


def get_image_provider(image_model: str, settings: Settings) -> Callable:
    factories = {
        "gpt-image-2": _gen_one_gpt_image_2,
        "minimax": _gen_one_minimax,
    }
    factory = factories.get(image_model, _gen_one_jimeng)
    return factory(settings)


# ==================== 视频 Provider ====================

def _submit_video_seedance(settings: Settings, resolution: str = "720p") -> Callable:
    from .tvc_polling import poll_seedance

    ark_key = settings.ARK_API_KEY
    ark_base = settings.ARK_API_BASE_URL.rstrip("/")
    model = "doubao-seedance-2-0-260128"

    async def _run(shot_num: int, first_url: str, last_url: str, duration: int, prompt: str = "") -> dict:
        if not ark_key or not first_url:
            raise Exception(f"缺少 ARK_API_KEY 或首帧图片 (shot {shot_num})")

        text_prompt = prompt or f"TVC镜头{shot_num}，{duration}秒，流畅过渡，电影级画质"
        content = [
            {"type": "text", "text": text_prompt},
            {"type": "image_url", "image_url": {"url": first_url}, "role": "first_frame"},
        ]
        if last_url:
            content.append({"type": "image_url", "image_url": {"url": last_url}, "role": "last_frame"})

        body = {
            "model": model,
            "content": content,
            "resolution": resolution,
            "duration": max(4, min(15, duration)),
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{ark_base}/contents/generations/tasks",
                json=body,
                headers={"Authorization": f"Bearer {ark_key}", "Content-Type": "application/json"},
            )
        if resp.status_code != 200:
            raise Exception(f"Seedance submit error: {resp.status_code} {resp.text}")

        task_id = resp.json().get("id", "")
        if not task_id:
            raise Exception(f"No task_id in Seedance response: {resp.text}")

        video_url = await poll_seedance(ark_key, ark_base, task_id)
        return {"video_url": video_url, "provider_task_id": task_id}

    return _run


VIDEO_PROVIDER_NAMES = {
    "seedance": "Seedance 2.0",
    "jimeng": "Seedance 2.0",
}


def get_video_provider(video_model: str, settings: Settings, resolution: str = "720p") -> tuple[Callable, str]:
    provider_name = VIDEO_PROVIDER_NAMES.get(video_model, "Seedance 2.0")
    return _submit_video_seedance(settings, resolution=resolution), provider_name
