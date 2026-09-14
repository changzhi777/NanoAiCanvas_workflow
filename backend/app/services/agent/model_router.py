# Nanoai Team8 Agent System — Model Router
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import logging
import time
from typing import AsyncIterator

import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

# Agent → (model_id, tier) 映射
AGENT_MODEL_MAP = {
    "producer": ("glm-4-flash", "cloud"),
    "screenwriter": ("glm-4-flash", "cloud"),
    "director": ("glm-4-flash", "cloud"),
    "art_director": ("glm-4-flash", "cloud"),
    "character_designer": ("glm-4-flash", "cloud"),
    "scene_designer": ("glm-4-flash", "cloud"),
    "voice_director": ("glm-4-flash", "cloud"),
    "editor": ("glm-4-flash", "cloud"),
    "composer": ("glm-4-flash", "cloud"),
}

def _get_settings():
    return get_settings()


# Tier → base_url + api_key 来源（延迟读取配置）
TIER_CONFIG = {
    "cloud": {
        "base_url": lambda: _get_settings().GLM_API_BASE_URL,
        "api_key": lambda: _get_settings().GLM_API_KEY,
    },
    "local": {
        "base_url": lambda: "http://localhost:11434/v1",
        "api_key": lambda: "local",
    },
}


class ModelRouter:
    def __init__(self):
        self._health_cache: dict[str, bool] = {}
        self._health_ts: float = 0

    def _resolve_model(self, agent_name: str, override_model: str | None = None) -> tuple[str, str, str]:
        """返回 (base_url, api_key, model_id)"""
        if override_model:
            model_id = override_model
            tier = "cloud"
        else:
            model_id, tier = AGENT_MODEL_MAP.get(agent_name, ("glm-4-flash", "cloud"))

        cfg = TIER_CONFIG[tier]
        return cfg["base_url"](), cfg["api_key"](), model_id

    async def chat_completion(
        self,
        messages: list[dict],
        agent_name: str = "producer",
        model: str | None = None,
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 120.0,
    ) -> AsyncIterator[dict] | dict:
        base_url, api_key, model_id = self._resolve_model(agent_name, model)
        url = f"{base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model_id,
            "messages": messages,
            "stream": stream,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if stream:
            return self._stream_response(url, headers, payload, timeout)
        return await self._single_response(url, headers, payload, timeout)

    async def _single_response(self, url: str, headers: dict, payload: dict, timeout: float) -> dict:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def _stream_response(self, url: str, headers: dict, payload: dict, timeout: float) -> AsyncIterator[bytes]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes():
                    yield chunk

    async def health_check(self) -> dict[str, bool]:
        if time.time() - self._health_ts < 60:
            return self._health_cache

        result = {}
        for tier_name, cfg in TIER_CONFIG.items():
            try:
                base_url = cfg["base_url"]()
                api_key = cfg["api_key"]()
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        f"{base_url}/models",
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
                    result[tier_name] = resp.status_code == 200
            except Exception:
                result[tier_name] = False

        self._health_cache = result
        self._health_ts = time.time()
        return result

    @staticmethod
    def extract_usage(response: dict) -> tuple[int, int]:
        """从 LLM 响应中提取 token 用量"""
        usage = response.get("usage", {})
        return usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
