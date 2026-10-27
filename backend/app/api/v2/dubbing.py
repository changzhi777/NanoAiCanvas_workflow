"""配音大师 API —— MiniMax 音色设计 + 文字转语音代理

前端通过此接口调用 MiniMax 语音能力，API Key 安全存储在后端
（settings.MINIMAX_API_KEY / MINIMAX_API_BASE_URL，与 minimax.py 同源）。

能力面（契约实证见 docs/minimax-voice-deep-dive.md）：
- 音色设计 /v1/voice_design：描述 prompt → voice_id + hex 试听音频
- 同步合成 /v1/t2a_v2：text ≤10000 字符，voice_setting 参数化（情绪/语速/音量/声调）
- 异步长文本 /v1/t2a_async_v2：text ≤50000 字符，task_id 轮询 → file_id 下载
- 音色管理 /v1/get_voice + /v1/delete_voice：system / voice_generation 两类
- 临时音色 7 天未用即删：音色库每次实时拉取（Redis 60s 缓存），列表即真实状态

音频产物统一 hex→bytes 落 asset_upload_dir/dubbing/ 并登记 assets 表（生成历史）。
"""

import os
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.config import get_settings
from app.api.auth import get_current_user_optional
from app.models import User

router = APIRouter(prefix="/api/v2/dubbing", tags=["dubbing"])

# 可选模型档位（对齐 C 端：hd 默认 / turbo 省钱快速）
TTS_MODELS = ["speech-2.8-hd", "speech-2.8-turbo", "speech-2.6-hd", "speech-2.6-turbo"]
DEFAULT_MODEL = "speech-2.8-hd"
EMOTIONS = ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent", "whisper"]
LANGUAGES = ["Chinese", "Chinese,Yue", "English", "Japanese", "Korean", "auto"]

SYNC_TEXT_MAX = 10000
ASYNC_TEXT_MAX = 50000
PREVIEW_TEXT_MAX = 500

VOICE_CACHE_TTL = 60  # 音色库缓存秒数（7 天过期的音色靠刷新列表自然淘汰）


def _auth_headers() -> dict:
    settings = get_settings()
    if not settings.MINIMAX_API_KEY:
        raise HTTPException(status_code=503, detail="MiniMax API Key 未配置")
    return {
        "Content-Type": "application/json;charset=utf-8",
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
    }


async def _post_upstream(path: str, payload: dict) -> dict:
    """统一上游 POST + base_resp 错误映射"""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.MINIMAX_API_BASE_URL}{path}",
                headers=_auth_headers(),
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="MiniMax API 超时")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"MiniMax API 错误: {resp.text[:300]}")
    data = resp.json()
    base = data.get("base_resp", {})
    if base.get("status_code", -1) not in (0, 200):
        raise HTTPException(status_code=502, detail=f"MiniMax: {base.get('status_msg', '未知错误')}")
    return data


def _dubbing_dir() -> str:
    """配音产物目录（复用 asset-uploads 静态挂载）"""
    base = os.environ.get(
        "ASSET_UPLOAD_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "chat-uploads", "assets"),
    )
    d = os.path.join(base, "dubbing")
    os.makedirs(d, exist_ok=True)
    return d


def _save_audio(data: bytes, ext: str = "mp3") -> str:
    """音频字节落盘，返回可访问 URL 路径（/asset-uploads 静态挂载）"""
    name = f"dubbing-{uuid.uuid4().hex[:12]}.{ext}"
    with open(os.path.join(_dubbing_dir(), name), "wb") as f:
        f.write(data)
    return f"/asset-uploads/dubbing/{name}"


async def _register_asset(user: Optional[User], url: str, name: str, meta: dict) -> None:
    """生成产物登记 assets 表（未登录跳过——历史仅供登录用户）"""
    if user is None:
        return
    from app.database import async_session_maker
    from app.models.asset import Asset, AssetType

    try:
        async with async_session_maker() as db:
            db.add(Asset(
                user_id=user.id,
                type=AssetType.AUDIO,
                name=name[:255],
                url=url,
                category="dubbing",
                meta_data=meta,
            ))
            await db.commit()
    except Exception:
        pass  # 历史登记失败不影响生成主流程


# —— 音色设计 ——

class VoiceDesignRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="音色描述")
    preview_text: str = Field(..., min_length=1, max_length=PREVIEW_TEXT_MAX, description="试听文本")
    voice_id: Optional[str] = None


@router.post("/voice-design")
async def voice_design(req: VoiceDesignRequest):
    """文字描述设计新音色，返回 voice_id 与试听音频 URL"""
    data = await _post_upstream(
        "/voice_design",
        {"prompt": req.prompt, "preview_text": req.preview_text,
         **({"voice_id": req.voice_id} if req.voice_id else {})},
    )
    audio_url = None
    trial_hex = data.get("trial_audio")
    if trial_hex:
        try:
            audio_url = _save_audio(bytes.fromhex(trial_hex))
        except ValueError:
            audio_url = None
    return {"voice_id": data.get("voice_id"), "trial_audio_url": audio_url}


# —— 同步合成 ——

class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=SYNC_TEXT_MAX)
    voice_id: str = Field(..., min_length=1)
    model: str = DEFAULT_MODEL
    emotion: Optional[str] = None
    speed: float = Field(1.0, ge=0.5, le=2.0)
    vol: float = Field(1.0, gt=0, le=10)
    pitch: int = Field(0, ge=-12, le=12)
    language_boost: Optional[str] = None
    subtitle: bool = True


@router.post("/tts")
async def text_to_speech(req: TtsRequest, current_user: Optional[User] = Depends(get_current_user_optional)):
    """同步文字转语音（≤10000 字符），音频落盘并登记资产历史"""
    if req.model not in TTS_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {req.model}")
    if req.emotion and req.emotion not in EMOTIONS:
        raise HTTPException(status_code=400, detail=f"不支持的情绪: {req.emotion}")

    voice_setting = {
        "voice_id": req.voice_id,
        "speed": req.speed,
        "vol": req.vol,
        "pitch": req.pitch,
    }
    if req.emotion:
        voice_setting["emotion"] = req.emotion
    payload = {
        "model": req.model,
        "text": req.text,
        "voice_setting": voice_setting,
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        "subtitle_enable": req.subtitle,
        "output_format": "hex",
    }
    if req.language_boost:
        payload["language_boost"] = req.language_boost

    data = await _post_upstream("/t2a_v2", payload)
    inner = data.get("data") or {}
    audio_hex = inner.get("audio")
    if not audio_hex:
        raise HTTPException(status_code=502, detail="MiniMax 未返回音频数据")

    audio_url = _save_audio(bytes.fromhex(audio_hex))
    extra = data.get("extra_info", {}) or {}
    subtitle_url = inner.get("subtitle_file")
    meta = {
        "source": "dubbing",
        "voice_id": req.voice_id,
        "model": req.model,
        "emotion": req.emotion,
        "speed": req.speed,
        "vol": req.vol,
        "pitch": req.pitch,
        "usage_characters": extra.get("usage_characters"),
    }
    name = f"配音_{req.text[:20]}_{req.model}"
    await _register_asset(current_user, audio_url, name, meta)
    return {
        "audio_url": audio_url,
        "subtitle_url": subtitle_url,
        "audio_length_ms": extra.get("audio_length"),
        "usage_characters": extra.get("usage_characters"),
    }


# —— 异步长文本 ——

class TtsAsyncRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=ASYNC_TEXT_MAX)
    voice_id: str = Field(..., min_length=1)
    model: str = DEFAULT_MODEL
    speed: float = Field(1.0, ge=0.5, le=2.0)
    vol: float = Field(1.0, gt=0, le=10)
    pitch: int = Field(0, ge=-12, le=12)


@router.post("/tts-async")
async def text_to_speech_async(req: TtsAsyncRequest):
    """长文本异步合成（≤50000 字符），返回 task_id 供轮询"""
    if req.model not in TTS_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {req.model}")
    data = await _post_upstream(
        "/t2a_async_v2",
        {
            "model": req.model,
            "text": req.text,
            "voice_setting": {"voice_id": req.voice_id, "speed": req.speed, "vol": req.vol, "pitch": req.pitch},
            "audio_setting": {"audio_sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        },
    )
    return {"task_id": data.get("task_id"), "file_id": data.get("file_id")}


async def _download_file(file_id: int, current_user: Optional[User], text_hint: str = "长文配音") -> str:
    """file_id → files/retrieve 拿 download_url → 拉取落盘 → 登记资产"""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"{settings.MINIMAX_API_BASE_URL}/files/retrieve",
            headers=_auth_headers(),
            params={"file_id": file_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"文件检索失败: {resp.text[:200]}")
    body = resp.json()
    if body.get("base_resp", {}).get("status_code", -1) not in (0, 200):
        raise HTTPException(status_code=502, detail=f"文件检索失败: {body['base_resp'].get('status_msg')}")
    download_url = (body.get("file") or {}).get("download_url")
    if not download_url:
        raise HTTPException(status_code=502, detail="上游未返回下载地址")

    async with httpx.AsyncClient(timeout=300) as client:
        audio_resp = await client.get(download_url)
    if audio_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="音频下载失败")

    url = _save_audio(audio_resp.content)
    await _register_asset(current_user, url, f"{text_hint}_{file_id}", {"source": "dubbing", "file_id": file_id})
    return url


@router.get("/tts-async/{task_id}")
async def query_tts_async(
    task_id: str,
    download: bool = Query(True, description="任务成功时是否拉取音频落盘"),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """查询异步任务状态；success 且 download=true 时落盘登记并返回 audio_url"""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"{settings.MINIMAX_API_BASE_URL}/query/t2a_async_query_v2",
            headers=_auth_headers(),
            params={"task_id": task_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"查询失败: {resp.text[:200]}")
    body = resp.json()
    if body.get("base_resp", {}).get("status_code", -1) not in (0, 200):
        raise HTTPException(status_code=502, detail=f"查询失败: {body['base_resp'].get('status_msg')}")

    status = body.get("status")
    out = {"task_id": task_id, "status": status, "file_id": body.get("file_id")}
    if status == "success" and download and body.get("file_id"):
        out["audio_url"] = await _download_file(body["file_id"], current_user)
    elif status == "failed":
        out["detail"] = body.get("base_resp", {}).get("status_msg", "任务失败")
    return out


# —— 音色库 ——

class _VoiceCache:
    """音色列表 Redis 缓存（不可用时直连）"""

    @staticmethod
    async def get(key: str):
        try:
            from app.redis import redis_client

            import json as _json
            raw = await redis_client.get(key)
            return _json.loads(raw) if raw else None
        except Exception:
            return None

    @staticmethod
    async def set(key: str, value: dict):
        try:
            from app.redis import redis_client

            import json as _json
            await redis_client.setex(key, VOICE_CACHE_TTL, _json.dumps(value, ensure_ascii=False))
        except Exception:
            pass

    @staticmethod
    async def clear():
        try:
            from app.redis import redis_client

            await redis_client.delete(f"dubbing:voices:all", "dubbing:voices:voice_generation")
        except Exception:
            pass


@router.get("/voices")
async def list_voices(voice_type: str = Query("all", pattern="^(system|voice_generation|all)$")):
    """音色库：system 系统音色 + voice_generation 设计音色（Redis 60s 缓存）"""
    cache_key = f"dubbing:voices:{voice_type}"
    cached = await _VoiceCache.get(cache_key)
    if cached is not None:
        return cached

    data = await _post_upstream("/get_voice", {"voice_type": voice_type})
    system = [
        {"voice_id": v.get("voice_id"), "voice_name": v.get("voice_name"), "description": v.get("description")}
        for v in (data.get("system_voice") or [])
    ]
    designed = [
        {"voice_id": v.get("voice_id"), "description": v.get("description"), "created_time": v.get("created_time")}
        for v in (data.get("voice_generation") or [])
    ]
    out = {"system": system, "designed": designed}
    await _VoiceCache.set(cache_key, out)
    return out


@router.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str):
    """删除设计音色（voice_generation 类），同时清缓存"""
    await _post_upstream("/delete_voice", {"voice_type": "voice_generation", "voice_id": voice_id})
    await _VoiceCache.clear()
    return {"voice_id": voice_id, "deleted": True}
