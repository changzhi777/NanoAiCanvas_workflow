"""
TVC 工作流任务 API（路由层）
- POST /api/v2/tvc-tasks/submit   提交任务
- GET  /api/v2/tvc-tasks/{id}     查询状态
- POST /api/v2/tvc-tasks/{id}/cancel  取消任务
- GET  /api/v2/tvc-tasks/{id}/progress SSE 实时进度流
"""
import json
import asyncio
import uuid

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.api.auth import get_current_user_optional
from app.models import User
from app.services import workflow_executor
from .tvc_engine import execute_tvc

router = APIRouter(prefix="/api/v2/tvc-tasks", tags=["tvc-tasks"])


class SubmitRequest(BaseModel):
    workflow_id: str
    prompt: str
    shot_count: int = 6
    shot_duration: int = 5
    total_duration: int = 30
    mode: str = "cinematic"
    style: str = "realistic"
    optimize_mode: str = "tvc_deep"
    execution_mode: str = "auto"
    image_model: str = "jimeng"
    video_model: str = "jimeng"
    style_reference: Optional[str] = None
    reference_image: Optional[str] = None


@router.post("/submit")
async def submit_task(
    req: SubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """提交 TVC 工作流任务"""
    # 积分预检（仅检查余额，实际扣减在引擎中）
    if current_user:
        try:
            from app.services.points_service import node_type_to_model_type, resolve_price
            from app.database import async_session_maker
            from app.api.points import get_or_create_user_account

            async with async_session_maker() as db:
                account = await get_or_create_user_account(db, current_user.id)
                text_price = await resolve_price(db, node_type_to_model_type("script_generator"))
                image_price = await resolve_price(db, node_type_to_model_type("storyboard_generator"))
                video_price = await resolve_price(db, node_type_to_model_type("storyboard_video"))
                bgm_price = await resolve_price(db, node_type_to_model_type("background_music"))

                total = text_price * 3 + image_price * req.shot_count * 2 + video_price * req.shot_count + bgm_price
                if account.balance < total:
                    raise HTTPException(
                        status_code=402,
                        detail=f"积分不足，需要 {total}，当前余额 {account.balance}",
                        headers={"X-Insufficient-Balance": "true"},
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    task_id = f"tvc_{uuid.uuid4().hex[:12]}"
    nodes = _build_nodes(req)
    await workflow_executor.create_task(task_id, req.workflow_id, nodes)

    user_id = current_user.id if current_user else None
    asyncio.create_task(execute_tvc(task_id, req, user_id))

    return {"task_id": task_id, "status": "submitted"}


def _build_nodes(req: SubmitRequest) -> list:
    return [
        {
            "id": "step-script",
            "label": "剧本生成",
            "type": "script",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-optimize",
            "label": "提示词优化",
            "type": "optimize",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-breakdown",
            "label": "分镜头脚本",
            "type": "breakdown",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-images",
            "label": "生图",
            "type": "images",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {"id": f"shot-{i+1}-start", "label": f"镜头 {i+1}/{req.shot_count}: 起始帧", "status": "pending", "progress": 0}
                for i in range(req.shot_count)
            ] + [
                {"id": f"shot-{i+1}-end", "label": f"镜头 {i+1}/{req.shot_count}: 结束帧", "status": "pending", "progress": 0}
                for i in range(req.shot_count)
            ],
        },
        {
            "id": "step-video",
            "label": "参考图生视频",
            "type": "video",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {"id": f"shot-{i+1}-video", "label": f"镜头 {i+1}/{req.shot_count}: 视频", "status": "pending", "progress": 0}
                for i in range(req.shot_count)
            ] + [
                {"id": "bgm", "label": "BGM 生成", "status": "pending", "progress": 0}
            ],
        },
    ]


@router.get("/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    return state


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消任务"""
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    if state["status"] not in ("submitted", "running"):
        raise HTTPException(status_code=400, detail="任务已完成，无法取消")
    await workflow_executor.complete_task(task_id, "cancelled")
    return {"task_id": task_id, "status": "cancelled"}


@router.get("/{task_id}/progress")
async def stream_progress(task_id: str):
    """SSE 实时进度流"""
    pubsub = workflow_executor.redis_client.pubsub()
    channel = workflow_executor._channel(task_id)
    await pubsub.subscribe(channel)

    async def event_generator():
        try:
            state = await workflow_executor.load_task(task_id)
            if state:
                yield f"data: {json.dumps(state, ensure_ascii=False)}\n\n"

            last_ping = asyncio.get_event_loop().time()
            while True:
                message = await pubsub.get_message(timeout=30)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    yield f"data: {data}\n\n"

                    try:
                        parsed = json.loads(data)
                        if parsed.get("status") in ("completed", "failed", "cancelled"):
                            break
                    except json.JSONDecodeError:
                        pass

                now = asyncio.get_event_loop().time()
                if now - last_ping >= 15:
                    yield ": ping\n\n"
                    last_ping = now

                await asyncio.sleep(0.1)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
