"""
TVC 图片/视频 Provider 工厂
统一管理 3 个图片 Provider + 3 个视频 Provider
"""
import httpx
import asyncio
from typing import Callable, Optional

from app.config import Settings


# ==================== 图片 Provider ====================

def _enhance_image_prompt(
    base_prompt: str = "",
    image_desc: str = None,
    camera_movement: str = None,
    style: str = None,
    enhance_cfg: dict = None,
) -> str:
    """结构化 prompt 增强：prefix_markers + image_description(cached) + 镜头 + base_prompt + 风格 + suffix_markers。

    base_prompt 是必传真值（来自 breakdown.character_ref_prompt 等），不会丢。
    image_desc/camera/style 可选（缓存/req 字段），未提供则跳过对应段。
    """
    if not enhance_cfg:
        return base_prompt
    parts = []
    # 1. 统一英文前缀 markers（image models 期待逗号分隔的英文修饰词列表）
    if enhance_cfg.get("prefix_markers"):
        parts.append(", ".join(enhance_cfg["prefix_markers"]))
    # 2. 镜头维度（短句）
    if enhance_cfg.get("include_camera") and camera_movement:
        parts.append(f"cinematic camera: {camera_movement}")
    # 3. 基础 prompt（核心）
    if base_prompt:
        parts.append(base_prompt)
    # 4. 风格
    if enhance_cfg.get("include_style") and style:
        parts.append(f"style: {style}")
    # 5. 统一英文后缀 markers
    if enhance_cfg.get("suffix_markers"):
        parts.append(", ".join(enhance_cfg["suffix_markers"]))
    # 6. 图像描述（中文）作独立段，避免污染 marker 列表
    if enhance_cfg.get("include_image_description") and image_desc:
        parts.append(f"参考风格（中文）：{image_desc}")
    return ", ".join(parts)


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


def get_image_provider(image_model: str, settings: Settings, enhance_cfg: dict = None) -> Callable:
    """image_model: gpt-image-2 / minimax / (default) jimeng"""
    factories = {
        "gpt-image-2": _gen_one_gpt_image_2,
        "minimax": _gen_one_minimax,
    }
    factory = factories.get(image_model, _gen_one_jimeng)
    # 闭包：让 provider 拿到 enhance_cfg（避免改 factory 签名）
    base_factory = factory(settings)
    if not enhance_cfg:
        return base_factory
    from app.services.image_description_cache import ImageDescriptionCache  # 提到模块级逻辑外

    async def _describe_via_m3(image_url: str) -> Optional[str]:
        """闭包：cache miss 时调 M3 视觉端点描述。"""
        # 这里不能再 import 全套 tvc_engine（循环依赖），用最小直接调用
        import os
        import httpx
        settings_env_key = os.environ.get("MINIMAX_API_KEY", "")
        if not settings_env_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.minimax.cn/anthropic/v1/messages",
                    headers={
                        "x-api-key": settings_env_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "MiniMax-M3",
                        "max_tokens": 300,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "用 100-200 字中文描述这张图的核心元素：产品/人物/场景/颜色/风格/构图/光线。"},
                                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_url.split(",", 1)[1] if image_url.startswith("data:") else image_url}},
                            ],
                        }],
                    },
                )
            if resp.status_code == 200:
                return "".join(b.get("text", "") for b in resp.json().get("content", []) if b.get("type") == "text").strip()
        except Exception:
            pass
        return None

    async def _gen_enhanced(subtask, prompt):
        # image_description：M3 缓存复用（与 Step 1 视觉描述共享 cache）
        img_desc = None
        if enhance_cfg.get("include_image_description"):
            try:
                # 优先复用 req.reference_image 缓存（character-ref 复用同图）
                ref = subtask.get("reference_image") or ""
                if ref:
                    img_desc = await ImageDescriptionCache.get_or_describe(
                        ref, describe_fn=_describe_via_m3
                    )
            except Exception:
                pass
        enhanced = _enhance_image_prompt(
            base_prompt=prompt,
            image_desc=img_desc,
            camera_movement=None,  # 当前 Step 4 未传（req 上有但未透传）
            style=None,
            enhance_cfg=enhance_cfg,
        )
        return await base_factory(subtask, enhanced)
    return _gen_enhanced


# ==================== 视频 Provider ====================

async def _poll_wuyin_video(api_key: str, base_url: str, task_id: str, max_wait: int = 600) -> str:
    """轮询速创异步任务（与生图同构：GET detail，status=2 成功）→ 返回视频 URL。"""
    interval = 10
    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval
            resp = await client.get(f"{base_url}/api/async/detail?key={api_key}&id={task_id}")
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
                    raise Exception(f"视频生成成功但无 URL: {data}")
                return url
            if status not in (0, 1):
                raise Exception(f"视频生成失败 status={status} msg={data.get('message', '')}")
    raise Exception(f"视频生成超时 {max_wait}s (task: {task_id})")


def _submit_video_minimax(
    settings: Settings, resolution: str = "768P", model: str = "MiniMax-H3"
) -> Callable:
    """调速创代理的 MiniMax H3 视频生成（首帧图驱动，计费走速创账户）。"""
    api_key = settings.WUYINKEJI_API_KEY
    base_url = settings.WUYINKEJI_API_BASE_URL.rstrip("/")

    async def _run(shot_num: int, first_url: str, last_url: str, duration: int, prompt: str = "") -> dict:
        if not api_key or not first_url:
            raise Exception(f"缺少 WUYINKEJI_API_KEY 或首帧图片 (shot {shot_num})")

        text_prompt = prompt or f"TVC镜头{shot_num}，{duration}秒，流畅过渡，电影级画质"
        body = {
            "prompt": text_prompt,
            "first_frame": first_url,
            "resolution": resolution if resolution in ("768P", "2K") else "768P",
            "duration": str(max(4, min(15, duration))),
            "ratio": "16:9",
        }
        if last_url:
            body["last_frame"] = last_url

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/api/async/video_minimax_h3",
                json=body,
                headers={"Authorization": api_key, "Content-Type": "application/json"},
            )
        if resp.status_code != 200:
            raise Exception(f"MiniMax H3 submit error: {resp.status_code} {resp.text}")
        result = resp.json()
        if result.get("code") != 200:
            raise Exception(f"MiniMax H3 submit failed: {result.get('msg', 'unknown')}")
        task_id = result.get("data", {}).get("id", "")
        if not task_id:
            raise Exception(f"No task id in MiniMax H3 response: {result}")

        video_url = await _poll_wuyin_video(api_key, base_url, task_id)
        return {"video_url": video_url, "provider_task_id": task_id}

    return _run


def _submit_video_seedance(settings: Settings, resolution: str = "720p") -> Callable:
    """Seedance 走字节 ARK 官方 API（速创无 Seedance，勿混淆）。"""
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


def get_video_provider(video_model: str, settings: Settings, resolution: str = "720p") -> tuple[Callable, str]:
    """minimax 主路（videoModel 含 minimax，不区分大小写）/ Seedance 兜底，均走速创代理"""
    if video_model and "minimax" in video_model.lower():
        return _submit_video_minimax(settings, resolution=resolution, model=video_model), "MiniMax H3"
    return _submit_video_seedance(settings, resolution=resolution), "Seedance 2.0"
