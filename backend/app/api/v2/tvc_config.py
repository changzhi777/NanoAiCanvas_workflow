"""
TVC 工作流配置 API
- GET /api/v2/tvc-config/global — 获取全局配置
- PUT /api/v2/tvc-config/global — 管理员更新全局配置
- GET /api/v2/tvc-config/user — 获取用户配置
- PUT /api/v2/tvc-config/user — 用户保存配置
- POST /api/v2/tvc-config/resolve — 解析最终配置（用户 > 全局 > 硬编码默认）
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_maker
from app.api.auth import get_current_user, require_admin
from app.models import User
from app.models.tvc_config import TvcWorkflowConfig

router = APIRouter(prefix="/api/v2/tvc-config", tags=["tvc-config"])


# ==================== 硬编码默认值 ====================

DEFAULT_CONFIG = {
    "step1_script": {
        "model": "glm-5.1",
        "fallback_model": "abab6.5s-chat",
        "temperature": 1.0,
        "max_tokens": 8192,
    },
    "step2_optimize": {
        "model": "glm-4.5-air",
        "temperature": 0.7,
        "max_tokens": 4096,
    },
    "step3_breakdown": {
        "mode": "logic",
    },
    "step4_image": {
        "default_provider": "gpt-image-2",
        "timeout": 180,
        "max_retries": 3,
        "batch_size": 3,
        "prompt_enhance": {
            "include_image_description": True,
            "include_camera": True,
            "include_style": True,
            "prefix_markers": ["cinematic", "high detail"],
            "suffix_markers": ["sharp focus", "professional composition"],
        },
    },
    "step5_video": {
        "default_provider": "seedance",
        "timeout": 300,
        "max_retries": 3,
        "resolution": "768P",
        "duration": 6,
    },
    "step5_bgm": {
        "model": "music-2.6",
        "is_instrumental": True,
    },
}


# ==================== Schema ====================

class TvcConfigUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}  # 静默 pydantic 警告
    step1_script: Optional[dict] = None
    step2_optimize: Optional[dict] = None
    step3_breakdown: Optional[dict] = None
    step4_image: Optional[dict] = None
    step5_video: Optional[dict] = None
    step5_bgm: Optional[dict] = None

    @field_validator("step4_image", "step5_video", "step5_bgm", mode="before")
    @classmethod
    def _reject_non_dict(cls, v):
        """防御：admin PUT 错类型（如 step4_image='on' 字符串）→ 4xx 拒绝。"""
        if v is not None and not isinstance(v, dict):
            raise ValueError("must be a dict")
        return v


# ==================== Helpers ====================

def _merge_config(defaults: dict, override: dict) -> dict:
    """Deep merge: override 覆盖 defaults 的对应 key"""
    result = {}
    for key in defaults:
        if key in override and override[key]:
            if isinstance(defaults[key], dict) and isinstance(override[key], dict):
                result[key] = {**defaults[key], **override[key]}
            else:
                result[key] = override[key]
        else:
            result[key] = defaults[key]
    return result


def _config_to_dict(config: TvcWorkflowConfig) -> dict:
    return {
        "step1_script": config.step1_script,
        "step2_optimize": config.step2_optimize,
        "step3_breakdown": config.step3_breakdown,
        "step4_image": config.step4_image,
        "step5_video": config.step5_video,
        "step5_bgm": config.step5_bgm,
    }


async def _get_or_create(db: AsyncSession, scope: str, user_id=None) -> TvcWorkflowConfig:
    """获取或创建配置记录"""
    if scope == "global":
        stmt = select(TvcWorkflowConfig).where(TvcWorkflowConfig.scope == "global")
    else:
        stmt = select(TvcWorkflowConfig).where(
            TvcWorkflowConfig.scope == "user",
            TvcWorkflowConfig.user_id == user_id,
        )
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        config = TvcWorkflowConfig(scope=scope, user_id=user_id)
        db.add(config)
        await db.flush()
    return config


# ==================== API 端点 ====================

@router.get("/global")
async def get_global_config(db: AsyncSession = Depends(get_db)):
    stmt = select(TvcWorkflowConfig).where(TvcWorkflowConfig.scope == "global")
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        return DEFAULT_CONFIG
    return _merge_config(DEFAULT_CONFIG, _config_to_dict(config))


@router.put("/global")
async def update_global_config(
    req: TvcConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    config = await _get_or_create(db, "global")
    for field in ["step1_script", "step2_optimize", "step3_breakdown", "step4_image", "step5_video", "step5_bgm"]:
        val = getattr(req, field, None)
        if val is not None:
            setattr(config, field, val)
    await db.commit()
    await db.refresh(config)
    return _merge_config(DEFAULT_CONFIG, _config_to_dict(config))


@router.get("/user")
async def get_user_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(TvcWorkflowConfig).where(
        TvcWorkflowConfig.scope == "user",
        TvcWorkflowConfig.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        return {}
    return _config_to_dict(config)


@router.put("/user")
async def update_user_config(
    req: TvcConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = await _get_or_create(db, "user", current_user.id)
    for field in ["step1_script", "step2_optimize", "step3_breakdown", "step4_image", "step5_video", "step5_bgm"]:
        val = getattr(req, field, None)
        if val is not None:
            setattr(config, field, val)
    await db.commit()
    await db.refresh(config)
    return _config_to_dict(config)


@router.post("/resolve")
async def resolve_config(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """解析最终配置：用户 > 全局 > 默认"""
    # 1. 全局配置
    stmt = select(TvcWorkflowConfig).where(TvcWorkflowConfig.scope == "global")
    result = await db.execute(stmt)
    global_config = result.scalar_one_or_none()
    merged = DEFAULT_CONFIG.copy()
    if global_config:
        merged = _merge_config(merged, _config_to_dict(global_config))

    # 2. 用户配置覆盖
    if current_user:
        stmt = select(TvcWorkflowConfig).where(
            TvcWorkflowConfig.scope == "user",
            TvcWorkflowConfig.user_id == current_user.id,
        )
        result = await db.execute(stmt)
        user_config = result.scalar_one_or_none()
        if user_config:
            merged = _merge_config(merged, _config_to_dict(user_config))

    return merged


@router.get("/cache-stats")
async def get_image_cache_stats():
    """M3 视觉描述缓存统计：总数/命中率/Redis 占用/最近 1h hit/TOP5。"""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from app.models.image_description import ImageDescription
    from app.redis import redis_client
    from app.config import get_settings

    settings = get_settings()
    async with async_session_maker() as db:
        total = (await db.execute(select(func.count()).select_from(ImageDescription))).scalar() or 0
        # hit > 0 的行 + 累计 hit 总和
        hit_rows = (await db.execute(
            select(func.count(), func.coalesce(func.sum(ImageDescription.hit_count), 0))
            .where(ImageDescription.hit_count > 0)
        )).one()
        hit_count = hit_rows[0] or 0
        total_hits = int(hit_rows[1] or 0)
        # 最近 1h 内 hit
        recent = (await db.execute(
            select(func.count()).where(
                ImageDescription.last_hit_at >= datetime.utcnow() - timedelta(hours=1)
            )
        )).scalar() or 0
        # TOP 5
        top = (await db.execute(
            select(ImageDescription.image_hash, ImageDescription.hit_count)
            .order_by(ImageDescription.hit_count.desc()).limit(5)
        )).all()
    # Redis 统计
    redis_keys = 0
    try:
        async for _ in redis_client.scan_iter("img_desc:*", count=100):
            redis_keys += 1
    except Exception:
        pass
    return {
        "total_entries": total,
        "hit_entries": hit_count,
        "hit_rate": round(hit_count / total, 3) if total else 0,
        "total_hits": total_hits,
        "recent_hits_1h": recent,
        "redis_keys": redis_keys,
        "top_hashes": [{"hash": h[:12] + "...", "hits": c} for h, c in top],
        "config": {
            "max_rows": settings.IMG_DESC_CACHE_MAX_ROWS,
            "ttl_days": settings.IMG_DESC_CACHE_TTL_DAYS,
            "vision_endpoint": settings.IMG_DESC_VISION_ENDPOINT,
        },
    }


@router.post("/cache-cleanup")
async def trigger_image_cache_cleanup():
    """手动触发 img_desc 缓存 LRU + TTL 清理。"""
    from app.services.image_description_cache import ImageDescriptionCache
    deleted = await ImageDescriptionCache.cleanup_expired()
    return {"deleted": deleted}
