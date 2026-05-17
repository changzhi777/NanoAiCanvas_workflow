"""
TVC 工作流配置 API
- GET /api/v2/tvc-config/global — 获取全局配置
- PUT /api/v2/tvc-config/global — 管理员更新全局配置
- GET /api/v2/tvc-config/user — 获取用户配置
- PUT /api/v2/tvc-config/user — 用户保存配置
- POST /api/v2/tvc-config/resolve — 解析最终配置（用户 > 全局 > 硬编码默认）
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_user, require_admin
from app.models import User
from app.models.tvc_config import TvcWorkflowConfig

router = APIRouter(prefix="/api/v2/tvc-config", tags=["tvc-config"])


# ==================== 硬编码默认值 ====================

DEFAULT_CONFIG = {
    "step1_script": {
        "model": "glm-5.1",
        "fallback_model": "MiniMax-M2.7",
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
    step1_script: Optional[dict] = None
    step2_optimize: Optional[dict] = None
    step3_breakdown: Optional[dict] = None
    step4_image: Optional[dict] = None
    step5_video: Optional[dict] = None
    step5_bgm: Optional[dict] = None


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
