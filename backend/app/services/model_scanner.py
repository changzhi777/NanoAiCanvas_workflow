"""
API Key 模型扫描服务
按 Provider 类型分发不同的模型检测逻辑
"""
import httpx
import logging
from typing import List

from app.models.api_key import APIKey, Provider

logger = logging.getLogger("model_scanner")

# 速创已知模型列表（速创无标准 /models 端点，用 probe 逐个测试）
WUYINKEJI_KNOWN_MODELS = [
    ("gpt-image-2", "/api/async/image_gpt"),
    ("nano-banana2", "/api/async/image_nanoBanana2"),
    ("nano-banana-pro", "/api/async/image_nanoBanana2"),
]


async def scan_models_for_key(key: APIKey, provider: Provider) -> List[str]:
    """扫描指定 Key 可用的模型列表"""
    if not provider or not provider.api_base_url:
        return []

    code = (provider.code or "").lower()
    base_url = provider.api_base_url.rstrip("/")
    api_key = key.api_key

    try:
        if code == "wuyinkeji":
            return await _scan_wuyinkeji(base_url, api_key)
        else:
            return await _scan_openai_compatible(base_url, api_key, code)
    except Exception as e:
        logger.error(f"Scan failed for key {key.id} (provider={code}): {e}")
        return []


async def _scan_openai_compatible(base_url: str, api_key: str, provider_code: str) -> List[str]:
    """OpenAI 兼容 /models 端点扫描"""
    models = []
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{base_url}/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_models = data.get("data", [])
                for m in raw_models:
                    model_id = m.get("id", "") if isinstance(m, dict) else str(m)
                    if model_id:
                        models.append(model_id)
        except Exception as e:
            logger.warning(f"OpenAI-compatible scan failed ({provider_code}): {e}")

    return sorted(models)


async def _scan_wuyinkeji(base_url: str, api_key: str) -> List[str]:
    """速创 API：逐个 probe 已知模型端点"""
    models = []
    async with httpx.AsyncClient(timeout=10) as client:
        for model_name, endpoint in WUYINKEJI_KNOWN_MODELS:
            try:
                if model_name == "gpt-image-2":
                    resp = await client.post(
                        f"{base_url}{endpoint}",
                        headers={"Content-Type": "application/json"},
                        json={"key": api_key, "prompt": "test", "size": "auto"},
                    )
                else:
                    resp = await client.post(
                        f"{base_url}{endpoint}?key={api_key}",
                        data={"prompt": "test", "size": "1K"},
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )

                if resp.status_code == 200:
                    result = resp.json()
                    # code=200 表示 Key 有权限，code!=200 可能是参数错误但仍说明 Key 有效
                    if result.get("code") == 200 or result.get("code"):
                        models.append(model_name)
                elif resp.status_code == 401 or resp.status_code == 403:
                    # Key 无权限
                    pass
                else:
                    # 其他错误（如 400 bad request）可能意味着端点存在但参数不对
                    models.append(model_name)
            except httpx.TimeoutException:
                pass
            except Exception as e:
                logger.debug(f"Wuyinkeji probe {model_name}: {e}")

    return sorted(models)
