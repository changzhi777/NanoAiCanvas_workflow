"""V2 图片生成 API 路由
支持多 Provider、多模型、API Key 路由
"""
import logging
logger = logging.getLogger(__name__)
import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.api_key import ApiKeyManager, ImageTask
from app.providers import ProviderFactory
from app.services.pubsub import TaskPublisher

router = APIRouter(prefix="/v2/image", tags=["v2-image"])


class ImageGenerateRequest(BaseModel):
    model_type: str = "nano-banana2"
    prompt: str
    size: str = "1K"
    aspect_ratio: str = "auto"
    urls: List[str] = []
    mask: Optional[str] = None


class VideoGenerateRequest(BaseModel):
    prompt: str
    first_frame: Optional[str] = None
    last_frame: Optional[str] = None
    images: List[str] = []
    resolution: str = "768P"
    ratio: str = "adaptive"
    duration: int = 4


class TaskSubmitResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    images: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


def get_api_key_manager(db: AsyncSession = Depends(get_db)) -> ApiKeyManager:
    """获取 API Key 管理器实例"""
    manager = ApiKeyManager.get_instance()
    manager.set_db_session(db)
    return manager


def get_frontend_key(x_api_key: Optional[str] = Header(None)) -> Optional[str]:
    """从请求头获取 frontend_key"""
    return x_api_key


@router.post("/nanobanana2/generate", response_model=TaskSubmitResponse)
async def submit_nanobanana2_task(
    request: ImageGenerateRequest,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """提交 NanoBanana2 图片生成任务"""
    return await submit_image_task(request, db, frontend_key)


@router.post("/gpt-image-2/generate", response_model=TaskSubmitResponse)
async def submit_gpt_image_task(
    request: ImageGenerateRequest,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """提交 GPT Image 2 图片生成任务"""
    request.model_type = "gpt-image-2"
    return await submit_image_task(request, db, frontend_key)


@router.post("/gpt-image-2.5/generate", response_model=TaskSubmitResponse)
async def submit_gpt_image_25_task(
    request: ImageGenerateRequest,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """提交 GPT Image 2.5 图片生成任务（速创新端点 /api/async/image_gpt_2.5）"""
    request.model_type = "gpt-image-2.5"
    return await submit_image_task(request, db, frontend_key)


@router.post("/nanobanana2-1/generate", response_model=TaskSubmitResponse)
async def submit_nanobanana2_1_task(
    request: ImageGenerateRequest,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """提交 NanoBanana2.1 图片生成任务（速创新端点 /api/async/NanoBanana2.1，支持 aspectRatio 比例参数）"""
    request.model_type = "nano-banana2.1"
    return await submit_image_task(request, db, frontend_key)


@router.post("/video/generate", response_model=TaskSubmitResponse)
async def submit_video_task(
    request: VideoGenerateRequest,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """提交图生视频（MiniMax H3）：首帧/尾帧/参考图 + 时长/分辨率/比例"""
    from app.models.api_key import ApiKeyConfig, BackendKeyMapping

    if not frontend_key:
        fallback = await db.execute(select(ApiKeyConfig).where(ApiKeyConfig.is_active == True).limit(1))
        fb = fallback.scalar_one_or_none()
        if fb:
            frontend_key = fb.frontend_key
    if not frontend_key:
        raise HTTPException(status_code=401, detail="Missing API key (X-API-Key header)")

    cfg_res = await db.execute(select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == frontend_key))
    cfg = cfg_res.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=401, detail="Invalid API key")

    map_res = await db.execute(
        select(BackendKeyMapping)
        .where(
            BackendKeyMapping.frontend_key_id == cfg.id,
            BackendKeyMapping.model_type == "minimax-h3",
            BackendKeyMapping.is_active == True,
        )
        .order_by(BackendKeyMapping.priority.desc())
    )
    mappings = list(map_res.scalars().all())
    if not mappings:
        raise HTTPException(status_code=400, detail="No provider mapping for model type: minimax-h3")

    task_id = ""
    used = ""
    last_err: Exception | None = None
    for mapping in mappings:
        ptype = (mapping.provider_type or "wuyinkeji").lower()
        try:
            provider = ProviderFactory.create(ptype, mapping.backend_key, mapping.mcp_config or {})
            task_id = await provider.generate_image({
                "model_type": "minimax-h3",
                "prompt": request.prompt,
                "first_frame": request.first_frame,
                "last_frame": request.last_frame,
                "images": request.images,
                "resolution": request.resolution,
                "ratio": request.ratio,
                "duration": request.duration,
            })
            used = ptype
            break
        except Exception as e:  # noqa: BLE001
            last_err = e
            logger.warning("Video provider %s failed: %s", ptype, e)
            continue
    if not task_id:
        raise HTTPException(status_code=502, detail=f"All providers failed: {last_err}")

    task = ImageTask(
        id=str(uuid.uuid4()),
        task_id=task_id,
        frontend_key=frontend_key,
        model_type="minimax-h3",
        status="pending",
        request_params={
            "provider": used,
            "prompt": request.prompt,
            "first_frame": request.first_frame,
            "resolution": request.resolution,
            "ratio": request.ratio,
            "duration": request.duration,
        },
    )
    db.add(task)
    await db.commit()
    return TaskSubmitResponse(task_id=task_id, status="pending")


@router.get("/video/task/{task_id}", response_model=TaskStatusResponse)
async def get_video_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """查询视频任务状态"""
    return await get_task_status(task_id, "minimax-h3", db, frontend_key)


async def submit_image_task(
    request: ImageGenerateRequest,
    db: AsyncSession,
    frontend_key: Optional[str],
) -> TaskSubmitResponse:
    """通用图片任务提交逻辑"""
    try:
        from sqlalchemy import select
        from app.models.api_key import ApiKeyConfig, BackendKeyMapping

        if not frontend_key:
            # 未带 X-API-Key（如新注册用户）→ 兜底默认 active 前端 key
            # frontend_key 是公开的浏览器侧租户标识（机密 backend_key 永不出库），可安全兜底
            fallback = await db.execute(
                select(ApiKeyConfig).where(ApiKeyConfig.is_active == True).limit(1)
            )
            fallback_config = fallback.scalar_one_or_none()
            if not fallback_config:
                raise HTTPException(status_code=401, detail="Missing API key (X-API-Key header)")
            frontend_key = fallback_config.frontend_key

        result = await db.execute(
            select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == frontend_key)
        )
        config = result.scalar_one_or_none()

        if not config:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Key 池调度（P1）：候选计划 + 失败切换 + rest 分级休息
        # 原为 order_by(priority.desc()).limit(1) 取单条——单 key 故障即失败
        from app.services import key_scheduler

        mapping_result = await db.execute(
            select(BackendKeyMapping)
            .where(
                BackendKeyMapping.frontend_key_id == config.id,
                BackendKeyMapping.model_type == request.model_type,
                BackendKeyMapping.is_active == True
            )
            .order_by(BackendKeyMapping.priority.desc())
        )
        mappings = list(mapping_result.scalars().all())

        # mapping 行装进 Candidate.extra（provider_type/mask/mcp_config 随候选流转）
        candidates = [
            key_scheduler.Candidate(
                mapping_id=m.id,
                backend_key=m.backend_key,
                priority=m.priority or 0,
                extra={
                    "provider_type": (m.provider_type or "wuyinkeji").lower(),
                    "mcp_config": m.mcp_config or {},
                },
            )
            for m in mappings
        ]
        if not candidates:
            raise HTTPException(
                status_code=400,
                detail=f"No provider mapping for model type: {request.model_type}"
            )

        async def _submit(cand: "key_scheduler.Candidate") -> str:
            ptype = cand.extra["provider_type"]
            provider = ProviderFactory.create(ptype, cand.backend_key, cand.extra["mcp_config"])
            provider_params = {
                "model_type": request.model_type,
                "prompt": request.prompt,
                "size": request.size,
                "aspect_ratio": request.aspect_ratio,
                "urls": request.urls,
            }
            if request.mask:
                provider_params["mask"] = request.mask
            return await provider.generate_image(provider_params)

        external_task_id, _attempt = await key_scheduler.attempt_with_failover(candidates, _submit)
        request_params_extra = {"provider": _attempt.candidate.extra["provider_type"]}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Provider submission failed: {e}")

    task = ImageTask(
        id=str(uuid.uuid4()),
        task_id=external_task_id,
        frontend_key=frontend_key,
        model_type=request.model_type,
        status="pending",
        request_params={
            "provider": used_provider,
            "prompt": request.prompt,
            "size": request.size,
            "aspect_ratio": request.aspect_ratio,
            "urls": request.urls,
            **({"mask": request.mask} if request.mask else {}),
        }
    )
    db.add(task)
    await db.commit()

    return TaskSubmitResponse(task_id=external_task_id, status="pending")


@router.get("/nanobanana2/task/{task_id}", response_model=TaskStatusResponse)
async def get_nanobanana2_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """查询 NanoBanana2 任务状态"""
    return await get_task_status(task_id, "nano-banana2", db, frontend_key)


@router.get("/gpt-image-2/task/{task_id}", response_model=TaskStatusResponse)
async def get_gpt_image_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """查询 GPT Image 2 任务状态"""
    return await get_task_status(task_id, "gpt-image-2", db, frontend_key)


@router.get("/gpt-image-2.5/task/{task_id}", response_model=TaskStatusResponse)
async def get_gpt_image_25_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """查询 GPT Image 2.5 任务状态"""
    return await get_task_status(task_id, "gpt-image-2.5", db, frontend_key)


@router.get("/nanobanana2-1/task/{task_id}", response_model=TaskStatusResponse)
async def get_nanobanana2_1_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """查询 NanoBanana2.1 任务状态"""
    return await get_task_status(task_id, "nano-banana2.1", db, frontend_key)


async def get_task_status(
    task_id: str,
    model_type: str,
    db: AsyncSession,
    frontend_key: Optional[str],
) -> TaskStatusResponse:
    """通用任务状态查询逻辑"""
    from app.providers.openai_image import sync_status

    # 同步 Provider（OpenAI 兼容中转）：进程内状态优先
    st = sync_status(task_id)
    if st is not None:
        mapped = {"pending": "pending", "success": "success", "failed": "failed"}.get(st.get("status"), "pending")
        try:
            result = await db.execute(select(ImageTask).where(ImageTask.task_id == task_id))
            row = result.scalar_one_or_none()
            if row:
                row.status = mapped
                if st.get("images"):
                    row.result = {"images": st["images"]}
                if st.get("error"):
                    row.error = st["error"]
                await db.commit()
        except Exception:
            pass
        return TaskStatusResponse(
            task_id=task_id,
            status=mapped,
            images=st.get("images"),
            error=st.get("error"),
        )

    from sqlalchemy import select
    from app.models.api_key import ApiKeyConfig, BackendKeyMapping

    if not frontend_key:
        # 未带 X-API-Key（如新注册用户）→ 兜底默认 active 前端 key（与提交逻辑一致）
        fallback = await db.execute(
            select(ApiKeyConfig).where(ApiKeyConfig.is_active == True).limit(1)
        )
        fallback_config = fallback.scalar_one_or_none()
        if fallback_config:
            frontend_key = fallback_config.frontend_key

    # 查询数据库中的任务 (使用 SQLAlchemy 2.0 async API)
    result = await db.execute(
        select(ImageTask).where(ImageTask.task_id == task_id)
    )
    task = result.scalar_one_or_none()

    # 如果数据库有记录但状态是pending，尝试从provider更新状态
    if task and task.status == "pending" and frontend_key:
        try:
            # Direct DB lookup
            config_result = await db.execute(
                select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == frontend_key)
            )
            config = config_result.scalar_one_or_none()

            if config:
                mapping_result = await db.execute(
                    select(BackendKeyMapping)
                    .where(
                        BackendKeyMapping.frontend_key_id == config.id,
                        BackendKeyMapping.model_type == model_type,
                        BackendKeyMapping.is_active == True
                    )
                    .order_by(BackendKeyMapping.priority.desc())
                    .limit(1)
                )
                mapping = mapping_result.scalar_one_or_none()

                if mapping:
                    provider = ProviderFactory.create(
                        "wuyinkeji",
                        mapping.backend_key,
                        {}
                    )
                    provider_status = await provider.get_task_status(task_id)

                    # 更新数据库中的状态
                    old_status = task.status
                    task.status = provider_status.get("status", "pending")
                    if provider_status.get("images"):
                        task.result = {"images": provider_status.get("images")}
                    if provider_status.get("error"):
                        task.error = provider_status.get("error")
                    await db.commit()

                    # 发布状态变更到 Redis
                    try:
                        await TaskPublisher.publish_status(
                            task_id=task_id,
                            status=task.status,
                            images=provider_status.get("images"),
                            error=provider_status.get("error"),
                            progress=100 if task.status == "success" else (30 if old_status == "pending" else 0)
                        )
                    except Exception as pub_err:
                        logger.warning(f"Redis publish error: {pub_err}")

                    return TaskStatusResponse(
                        task_id=task.task_id,
                        status=task.status,
                        images=provider_status.get("images"),
                        error=provider_status.get("error"),
                    )
        except Exception as e:
            logger.warning(f"Provider status check error: {e}")
            import traceback
            traceback.print_exc()

    if not task:
        # 如果数据库没有，尝试直接查询 provider（兼容旧逻辑）
        if frontend_key:
            try:
                # Direct DB lookup
                config_result = await db.execute(
                    select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == frontend_key)
                )
                config = config_result.scalar_one_or_none()

                if config:
                    mapping_result = await db.execute(
                        select(BackendKeyMapping)
                        .where(
                            BackendKeyMapping.frontend_key_id == config.id,
                            BackendKeyMapping.model_type == model_type,
                            BackendKeyMapping.is_active == True
                        )
                        .order_by(BackendKeyMapping.priority.desc())
                        .limit(1)
                    )
                    mapping = mapping_result.scalar_one_or_none()

                    if mapping:
                        provider = ProviderFactory.create(
                            "wuyinkeji",
                            mapping.backend_key,
                            {}
                        )
                        status = await provider.get_task_status(task_id)
                        return TaskStatusResponse(**status)
            except Exception as e:
                logger.warning(f"Provider error: {e}")

        raise HTTPException(status_code=404, detail="Task not found")

    # 返回数据库中的状态
    response = TaskStatusResponse(
        task_id=task.task_id,
        status=task.status,
    )

    if task.status == "success" and task.result:
        response.images = task.result.get("images", [])
    elif task.status == "failed":
        response.error = task.error

    return response


@router.post("/task/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    frontend_key: Optional[str] = Depends(get_frontend_key),
):
    """取消任务"""
    result = await db.execute(
        select(ImageTask).where(ImageTask.task_id == task_id)
    )
    task = result.scalar_one_or_none()

    if task:
        task.status = "cancelled"
        await db.commit()

    return {"message": "Task cancelled"}
