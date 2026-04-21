"""
Nano2 API - AI Image Generation Service

Copyright ©2026 IoTchange (外星动物/常智)
All Rights Reserved.

Author: 外星动物（常智）IoTchange
Email: 14455975@qq.com
Version: 2.2.2

本软件著作权归作者 IoTchange 完整所有。
商用需授权，开源使用需标明作者。
"""

import json
import uuid
from datetime import datetime
from typing import Annotated, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, status, BackgroundTasks, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import CurrentUser
from app.core.exceptions import ErrorCode, raise_exception
from app.core.redis_client import RedisClient
from app.models.task import Task, TaskStatus, TaskType
from app.schemas.storyboard import (
    StoryboardScriptRequest,
    StoryboardScriptResponse,
    StoryboardImagesRequest,
    StoryboardImagesResponse,
    StoryboardDetail,
    CharacterExtractRequest,
    CharacterExtractResponse,
    CharacterDesignRequest,
    CharacterDesignResponse,
    CharacterDesignInfo,
)
from app.schemas.pipeline import PipelineInput, PipelineStep, AdaptationOptions
from app.services.storyboard import StoryboardService
from app.services.task_queue import task_queue_manager

router = APIRouter()

# Redis Pub/Sub 频道
STORYBOARD_CHANNEL = "storyboard:channel"


# ========== 一键生成请求/响应模型 ==========

class StoryboardGenerateRequest(BaseModel):
    """一键故事板生成请求"""
    input_text: str = Field(..., min_length=10, max_length=5000, description="故事文本")
    style: str = Field(default="comic", description="故事板风格")
    num_scenes: int = Field(default=6, ge=3, le=12, description="场景数量")
    auto_save: bool = Field(default=True, description="是否自动保存到资产库")


class StoryboardGenerateResponse(BaseModel):
    """一键故事板生成响应"""
    task_id: int = Field(..., description="后台任务ID")
    status: str = Field(..., description="任务状态")
    message: str = Field(..., description="状态消息")


# ========== 一键生成端点（后台任务模式） ==========

@router.post(
    "/generate",
    response_model=StoryboardGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="一键故事板生成（后台任务）",
    description="提交故事板生成任务，立即返回任务ID，后台异步处理"
)
async def generate_storyboard(
    request: StoryboardGenerateRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    background_tasks: BackgroundTasks,
) -> StoryboardGenerateResponse:
    """
    一键故事板生成（后台任务模式）

    - 提交任务后立即返回任务ID
    - 后台异步处理生成
    - 客户端轮询 /storyboard/{task_id} 获取进度
    """
    from datetime import datetime
    from app.models.task import Task, TaskStatus, TaskType

    # 创建任务记录
    task = Task(
        user_id=current_user.id,
        task_type=TaskType.STORYBOARD_SCRIPT,
        status=TaskStatus.PENDING,
        prompt=request.input_text[:500],
        config={
            "style": request.style,
            "num_scenes": request.num_scenes,
            "auto_save": request.auto_save,
        },
        progress=0,
        message="任务已提交，等待处理...",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(task)
    await session.commit()
    await session.refresh(task)

    task_id = task.id

    # 生成 cli-agent 任务 ID（UUID 格式）
    cli_task_id = f"sb_{uuid.uuid4().hex[:16]}"

    # ========== 双通道消息发布 ==========
    # 构建消息内容
    message_data = {
        "action": "create",
        "taskId": cli_task_id,
        "data": {
            "inputText": request.input_text,
            "style": request.style,
            "numScenes": request.num_scenes,
            "autoSave": request.auto_save,
        }
    }
    message = json.dumps(message_data)

    # 通道 1: Redis Pub/Sub（主通道）
    redis_published = False
    try:
        redis = await RedisClient.get_client()
        print(f"[Storyboard] 📤 正在发布到 Redis: {STORYBOARD_CHANNEL}")
        print(f"  - Task ID: {cli_task_id}")

        result = await redis.publish(STORYBOARD_CHANNEL, message)
        print(f"[Storyboard] ✅ Redis 发布成功: {result} 订阅者收到消息")
        redis_published = True
    except Exception as e:
        print(f"[Storyboard] ❌ Redis 发布失败: {e}")

    # 通道 2: MQTT（备份通道）
    mqtt_published = False
    try:
        from app.core.mqtt_client import mqtt_publish_storyboard_task
        import asyncio

        mqtt_msg = {
            **message_data,
            "timestamp": int(asyncio.get_event_loop().time() * 1000),
            "source": "backend-api"
        }

        print(f"[Storyboard] 📤 正在发布到 MQTT: storyboard/tasks")
        mqtt_published = await mqtt_publish_storyboard_task(mqtt_msg)

        if mqtt_published:
            print(f"[Storyboard] ✅ MQTT 发布成功")
        else:
            print(f"[Storyboard] ⚠ MQTT 发布失败（已降级）")
    except Exception as e:
        print(f"[Storyboard] ❌ MQTT 发布异常: {e}")

    # 检查发布结果
    if not redis_published and not mqtt_published:
        # 两个通道都失败，回退到本地后台任务
        print(f"[Storyboard] ⚠ 双通道发布均失败，回退到本地后台任务")
        background_tasks.add_task(
            _process_storyboard_generation_fallback,
            task_id,
            current_user.id,
            request.input_text,
            request.style,
            request.num_scenes,
        )
    else:
        # 至少一个通道成功
        print(f"[Storyboard] ✅ 任务发布成功 (Redis: {redis_published}, MQTT: {mqtt_published})")

        # 更新任务配置,保存 cli-agent 任务 ID
        task.config = {
            **task.config,
            "cli_task_id": cli_task_id,
        }
        await session.commit()
        print(f"[Storyboard] Task {task_id} saved to database with cli_task_id: {cli_task_id}")

    return StoryboardGenerateResponse(
        task_id=task_id,
        status="pending",
        message="任务已提交，正在后台处理..."
    )


async def _process_storyboard_generation_fallback(
    task_id: int,
    user_id: int,
    input_text: str,
    style: str,
    num_scenes: int,
):
    """后台任务：处理故事板生成（本地回退模式）"""
    from datetime import datetime
    from app.core.database import async_session_maker
    from app.models.task import Task, TaskStatus
    from app.schemas.storyboard import StoryboardStyle, AspectRatio

    async with async_session_maker() as session:
        storyboard_service = StoryboardService(session)

        try:
            # 更新任务状态为处理中
            task = await session.get(Task, task_id)
            if task:
                task.status = TaskStatus.PROCESSING
                task.message = "正在生成分镜脚本..."
                task.progress = 10
                task.updated_at = datetime.utcnow()
                await session.commit()

            # Step 1: 生成分镜脚本
            style_enum = StoryboardStyle(style) if style in [s.value for s in StoryboardStyle] else StoryboardStyle.CINEMATIC

            script_result = await storyboard_service.generate_script(
                user_id=user_id,
                story=input_text,
                style=style_enum,
                num_scenes=num_scenes,
                include_dialogue=True,
                include_camera=True,
            )

            # 更新进度
            task = await session.get(Task, task_id)
            if task:
                task.progress = 50
                task.message = "分镜脚本生成完成，正在生成图片..."
                task.updated_at = datetime.utcnow()
                await session.commit()

            # Step 2: 生成图片（使用脚本返回的 task_id）
            script_task_id = script_result.get("task_id", task_id)

            images_result = await storyboard_service.generate_images(
                user_id=user_id,
                storyboard_id=script_task_id,
                image_size="1024x1024",
                enhance_prompts=True,
                parallel=False,
            )

            # 更新状态为完成
            task = await session.get(Task, task_id)
            if task:
                task.status = TaskStatus.COMPLETED
                task.progress = 100
                task.message = "故事板生成完成"
                task.result_data = {
                    "script_task_id": script_task_id,
                    "images_result": images_result,
                }
                task.completed_at = datetime.utcnow()
                task.updated_at = datetime.utcnow()
                await session.commit()

        except Exception as e:
            # 更新状态为失败
            task = await session.get(Task, task_id)
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                task.message = f"生成失败: {str(e)}"
                task.updated_at = datetime.utcnow()
                await session.commit()


# ========== 任务状态查询端点 ==========

class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    task_id: int = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    progress: float = Field(default=0, description="进度百分比")
    message: Optional[str] = Field(default=None, description="状态消息")
    result_data: Optional[dict] = Field(default=None, description="结果数据")
    error_message: Optional[str] = Field(default=None, description="错误消息")
    created_at: Optional[str] = Field(default=None, description="创建时间")
    started_at: Optional[str] = Field(default=None, description="开始时间")
    estimated_remaining: Optional[int] = Field(default=None, description="预计剩余秒数")


@router.get(
    "/task/{task_id}",
    response_model=TaskStatusResponse,
    summary="查询任务状态",
    description="查询故事板生成任务的状态和进度",
)
async def get_task_status(
    task_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TaskStatusResponse:
    """查询任务状态（优先从 Redis 获取 cli-agent 任务状态）"""
    from sqlalchemy import select
    from app.models.task import Task
    from datetime import datetime

    # 查询任务
    result = await session.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise_exception(
            ErrorCode.TASK_NOT_FOUND,
            f"任务 {task_id} 不存在",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 检查任务归属
    if task.user_id != current_user.id:
        raise_exception(
            ErrorCode.UNAUTHORIZED,
            "无权访问此任务",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 尝试从 Redis 获取 cli-agent 任务状态
    cli_task_id = task.config.get("cli_task_id") if task.config else None
    if cli_task_id:
        try:
            redis = await RedisClient.get_client()
            cli_task_data = await redis.hgetall(f"storyboard:task:{cli_task_id}")

            if cli_task_data and cli_task_data.get("taskId"):
                # 同步 Redis 状态到数据库
                redis_status = cli_task_data.get("status", "pending")
                redis_progress = float(cli_task_data.get("progress", 0))
                redis_message = cli_task_data.get("progressMessage", "")
                redis_error = cli_task_data.get("error", "")
                redis_images = cli_task_data.get("images", "[]")
                redis_storyboard = cli_task_data.get("storyboard", "")

                # 映射状态
                status_mapping = {
                    "pending": TaskStatus.PENDING,
                    "processing": TaskStatus.PROCESSING,
                    "completed": TaskStatus.COMPLETED,
                    "failed": TaskStatus.FAILED,
                    "cancelled": TaskStatus.CANCELLED,
                }
                mapped_status = status_mapping.get(redis_status, TaskStatus.PENDING)

                # 更新数据库任务状态
                needs_update = False
                if task.status != mapped_status:
                    task.status = mapped_status
                    needs_update = True
                if task.progress != redis_progress:
                    task.progress = redis_progress
                    needs_update = True
                if task.message != redis_message:
                    task.message = redis_message
                    needs_update = True
                if redis_error and task.error_message != redis_error:
                    task.error_message = redis_error
                    needs_update = True

                # 更新结果数据
                if redis_status == "completed":
                    try:
                        images = json.loads(redis_images) if redis_images else []
                        storyboard = json.loads(redis_storyboard) if redis_storyboard else None
                        task.result_data = {
                            "cli_task_id": cli_task_id,
                            "images": images,
                            "storyboard": storyboard,
                        }
                        task.completed_at = datetime.utcnow()
                        needs_update = True
                    except:
                        pass

                if needs_update:
                    task.updated_at = datetime.utcnow()
                    await session.commit()

        except Exception as e:
            # Redis 查询失败，使用数据库状态
            pass

    # 计算预计剩余时间
    estimated_remaining = None
    if task.progress and task.progress > 0 and task.status.value in ['pending', 'processing']:
        created = task.created_at
        if created:
            elapsed = (datetime.utcnow() - created).total_seconds()
            if elapsed > 0 and task.progress > 0:
                estimated_total = elapsed / (task.progress / 100)
                estimated_remaining = max(0, int(estimated_total - elapsed))

    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value if hasattr(task.status, 'value') else str(task.status),
        progress=task.progress or 0,
        message=task.message,
        result_data=task.result_data,
        error_message=task.error_message,
        created_at=task.created_at.isoformat() if task.created_at else None,
        started_at=task.started_at.isoformat() if task.started_at else None,
        estimated_remaining=estimated_remaining,
    )


@router.post(
    "/task/{task_id}/cancel",
    summary="取消任务",
    description="取消正在执行的故事板生成任务",
)
async def cancel_task(
    task_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """取消任务"""
    from datetime import datetime
    from app.models.task import Task, TaskStatus

    # 查询任务
    result = await session.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise_exception(
            ErrorCode.TASK_NOT_FOUND,
            f"任务 {task_id} 不存在",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 检查任务归属
    if task.user_id != current_user.id:
        raise_exception(
            ErrorCode.UNAUTHORIZED,
            "无权访问此任务",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 检查任务状态
    if task.status not in [TaskStatus.PENDING, TaskStatus.PROCESSING]:
        raise_exception(
            ErrorCode.INVALID_STATUS,
            f"任务状态为 {task.status.value}，无法取消",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 更新任务状态
    task.status = TaskStatus.CANCELLED
    task.message = "用户取消任务"
    task.updated_at = datetime.utcnow()
    await session.commit()

    return {"success": True, "message": "任务已取消"}


@router.delete(
    "/task/{task_id}",
    summary="删除任务",
    description="删除指定的故事板任务记录",
)
async def delete_task(
    task_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """删除任务"""
    from app.models.task import Task, TaskStatus

    # 查询任务
    result = await session.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise_exception(
            ErrorCode.TASK_NOT_FOUND,
            f"任务 {task_id} 不存在",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 检查任务归属
    if task.user_id != current_user.id:
        raise_exception(
            ErrorCode.UNAUTHORIZED,
            "无权访问此任务",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 检查任务状态 - 只能删除已完成、失败或取消的任务
    if task.status in [TaskStatus.PENDING, TaskStatus.PROCESSING]:
        raise_exception(
            ErrorCode.INVALID_STATUS,
            "无法删除正在执行的任务，请先取消",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 删除任务
    await session.delete(task)
    await session.commit()

    return {"success": True, "message": "任务已删除"}


@router.post(
    "/script",
    response_model=StoryboardScriptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="生成分镜脚本",
    description="根据故事文本生成分镜脚本",
)
async def generate_script(
    request: StoryboardScriptRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardScriptResponse:
    """生成分镜脚本"""
    storyboard_service = StoryboardService(session)
    
    result = await storyboard_service.generate_script(
        user_id=current_user.id,
        story=request.story,
        style=request.style,
        aspect_ratio=request.aspect_ratio,
        num_scenes=request.num_scenes,
        include_dialogue=request.include_dialogue,
        include_camera=request.include_camera,
        language=request.language,
    )
    
    return StoryboardScriptResponse(**result)


@router.post(
    "/images",
    response_model=StoryboardImagesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="生成故事板图片",
    description="为故事板的各场景生成图片",
)
async def generate_images(
    request: StoryboardImagesRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardImagesResponse:
    """生成故事板图片"""
    storyboard_service = StoryboardService(session)

    result = await storyboard_service.generate_images(
        user_id=current_user.id,
        storyboard_id=request.storyboard_id,
        scene_indices=request.scene_indices,
        image_size=request.image_size,
        enhance_prompts=request.enhance_prompts,
        parallel=request.parallel,
        auto_save=request.auto_save,
    )

    return StoryboardImagesResponse(**result)


@router.get(
    "/{storyboard_id}",
    response_model=StoryboardDetail,
    summary="获取故事板详情",
    description="获取指定故事板的详细信息",
)
async def get_storyboard(
    storyboard_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardDetail:
    """获取故事板详情"""
    storyboard_service = StoryboardService(session)
    
    result = await storyboard_service.get_storyboard_detail(
        storyboard_id=storyboard_id,
        user_id=current_user.id,
    )
    
    if not result:
        raise_exception(
            ErrorCode.STORYBOARD_NOT_FOUND,
            f"故事板 {storyboard_id} 不存在",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    
    return StoryboardDetail(**result)


@router.get(
    "",
    summary="获取故事板列表",
    description="获取当前用户的故事板列表",
)
async def list_storyboards(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = 1,
    page_size: int = 20,
):
    """获取故事板列表"""
    storyboard_service = StoryboardService(session)
    
    result = await storyboard_service.list_user_storyboards(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    return result


# ============ 角色设计端点 ============

@router.post(
    "/characters/extract",
    response_model=CharacterExtractResponse,
    summary="提取角色",
    description="从故事文本中提取角色设定",
)
async def extract_characters(
    request: CharacterExtractRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CharacterExtractResponse:
    """从故事文本中提取角色设定"""
    storyboard_service = StoryboardService(session)

    characters = await storyboard_service.extract_characters(
        story=request.story,
        style=request.style,
        max_characters=request.max_characters,
    )

    return CharacterExtractResponse(characters=characters)


@router.post(
    "/characters/design",
    response_model=CharacterDesignResponse,
    summary="生成角色设计图",
    description="为提取的角色生成设计图",
)
async def generate_character_designs(
    request: CharacterDesignRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CharacterDesignResponse:
    """生成角色设计图"""
    storyboard_service = StoryboardService(session)

    characters = await storyboard_service.generate_character_designs(
        user_id=current_user.id,
        characters=request.characters,
        style=request.style,
    )

    return CharacterDesignResponse(
        characters=characters,
        completed=sum(1 for c in characters if c.image_url),
        total=len(characters),
    )


# ============ Pipeline 流水线端点 ============

class PipelineGenerateRequest(BaseModel):
    """Pipeline 生成请求"""

    input_text: str = Field(..., min_length=10, max_length=10000, description="故事文本")
    style: str = Field(default="cinematic", description="故事板风格")
    skip_characters: bool = Field(default=False, description="是否跳过角色提取")
    adaptation_mode: str = Field(default="expanded", description="改编模式: expanded/faithful")
    target_duration: int = Field(default=180, description="目标时长(秒)")


class PipelineGenerateResponse(BaseModel):
    """Pipeline 生成响应"""

    task_id: str = Field(..., description="任务ID (UUID)")
    cli_task_id: str = Field(..., description="CLI Agent 任务ID")
    status: str = Field(..., description="任务状态")
    message: str = Field(..., description="状态消息")
    websocket_url: Optional[str] = Field(None, description="WebSocket 进度推送地址")


class PipelineProgressResponse(BaseModel):
    """Pipeline 进度响应"""

    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    current_step: str = Field(..., description="当前步骤")
    progress: float = Field(..., description="进度百分比")
    message: str = Field(..., description="进度消息")
    result_data: Optional[dict] = Field(None, description="结果数据")
    error: Optional[str] = Field(None, description="错误信息")


@router.post(
    "/pipeline/generate",
    response_model=PipelineGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Pipeline 一键生成（推荐）",
    description="使用完整的 9 步流水线生成故事板，支持实时进度推送",
)
async def pipeline_generate(
    request: PipelineGenerateRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PipelineGenerateResponse:
    """
    Pipeline 一键生成

    使用完整的 9 步流水线:
    input → analyzing → adaptation → characters → char_design → storyboard → prompts → images → complete

    - 支持断点续传
    - 实时进度推送 (WebSocket)
    - 自动错误分析和重试
    """
    from datetime import datetime
    from app.models.task import Task, TaskStatus, TaskType

    # 生成任务 ID
    cli_task_id = f"sb_{uuid.uuid4().hex[:16]}"

    # 创建数据库任务记录
    db_task = Task(
        user_id=current_user.id,
        task_type=TaskType.STORYBOARD_SCRIPT,
        status=TaskStatus.PENDING,
        prompt=request.input_text[:500],
        config={
            "style": request.style,
            "skip_characters": request.skip_characters,
            "adaptation_mode": request.adaptation_mode,
            "target_duration": request.target_duration,
            "cli_task_id": cli_task_id,
        },
        progress=0,
        message="任务已提交，等待处理...",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(db_task)
    await session.commit()
    await session.refresh(db_task)

    # 创建 Redis 任务
    await task_queue_manager.enqueue({
        "taskId": cli_task_id,
        "inputText": request.input_text,
        "style": request.style,
        "skipCharacters": request.skip_characters,
        "adaptationOptions": {
            "mode": request.adaptation_mode,
            "targetDuration": request.target_duration,
        },
        "userId": current_user.id,
        "dbTaskId": db_task.id,
        "createdAt": datetime.utcnow().isoformat(),
    })

    return PipelineGenerateResponse(
        task_id=str(db_task.id),
        cli_task_id=cli_task_id,
        status="pending",
        message="任务已提交，正在后台处理...",
        websocket_url=f"/ws/storyboard/progress/{cli_task_id}",
    )


@router.get(
    "/pipeline/task/{cli_task_id}",
    response_model=PipelineProgressResponse,
    summary="查询 Pipeline 任务进度",
    description="查询任务的实时进度和状态",
)
async def get_pipeline_progress(
    cli_task_id: str,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PipelineProgressResponse:
    """查询 Pipeline 任务进度"""
    # 从 Redis 获取任务状态
    task_data = await task_queue_manager.get_task(cli_task_id)

    if not task_data:
        raise_exception(
            ErrorCode.TASK_NOT_FOUND,
            f"任务 {cli_task_id} 不存在",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return PipelineProgressResponse(
        task_id=cli_task_id,
        status=task_data.get("status", "pending"),
        current_step=task_data.get("currentStep", "input"),
        progress=float(task_data.get("progress", 0)),
        message=task_data.get("progressMessage", ""),
        result_data={
            "characters": json.loads(task_data.get("characters", "[]")),
            "storyboard": json.loads(task_data.get("storyboard", "null")),
            "images": json.loads(task_data.get("images", "[]")),
        } if task_data.get("status") == "completed" else None,
        error=task_data.get("error") or None,
    )


@router.post(
    "/pipeline/task/{cli_task_id}/cancel",
    summary="取消 Pipeline 任务",
    description="取消正在执行的任务",
)
async def cancel_pipeline_task(
    cli_task_id: str,
    current_user: CurrentUser,
) -> dict:
    """取消 Pipeline 任务"""
    success = await task_queue_manager.cancel_task(cli_task_id)

    if not success:
        raise_exception(
            ErrorCode.INVALID_STATUS,
            "无法取消任务，任务可能已完成或不存在",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return {"success": True, "message": "任务已取消"}


@router.post(
    "/pipeline/task/{cli_task_id}/retry",
    summary="重试失败的 Pipeline 任务",
    description="重新执行失败的任务",
)
async def retry_pipeline_task(
    cli_task_id: str,
    current_user: CurrentUser,
) -> dict:
    """重试失败的 Pipeline 任务"""
    success = await task_queue_manager.retry_task(cli_task_id)

    if not success:
        raise_exception(
            ErrorCode.INVALID_STATUS,
            "无法重试任务，任务状态不是失败或不存在",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return {"success": True, "message": "任务已重新加入队列"}


@router.get(
    "/pipeline/stats",
    summary="获取 Pipeline 队列统计",
    description="获取任务队列的统计信息",
)
async def get_pipeline_stats(
    current_user: CurrentUser,
) -> dict:
    """获取 Pipeline 队列统计"""
    # 仅管理员可访问
    if not current_user.is_admin:
        raise_exception(
            ErrorCode.UNAUTHORIZED,
            "无权访问",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return await task_queue_manager.get_stats()
