# Nanoai Team8 Agent System — API Routes
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.api.auth import get_current_user_optional
from app.database import get_db
from app.services.agent.gateway import gateway
from app.services.agent.pipeline import load_pipeline_state
from app.services.agent.skills_registry import SkillsRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/agent", tags=["Agent"])


@router.get("/about")
async def get_about():
    """获取 Agent 系统信息"""
    return await gateway.get_about()


@router.post("/chat")
async def agent_chat(
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
):
    """Agent 聊天"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    messages = body.get("messages", [])
    agent = body.get("agent", "producer")
    model = body.get("model")

    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    await gateway.submit_chat(
        user_id=str(current_user.id),
        messages=messages,
        agent=agent,
        model=model,
    )
    return {"status": "submitted", "agent": agent}


@router.post("/pipeline/start")
async def start_pipeline(
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
):
    """启动改编流水线"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    params = body.get("params", {})
    pipeline_type = body.get("pipeline_type", "adaptation")

    task_id = await gateway.submit_pipeline(
        user_id=str(current_user.id),
        params=params,
        pipeline_type=pipeline_type,
    )
    return {"task_id": task_id, "status": "submitted"}


@router.get("/pipeline/{task_id}")
async def get_pipeline_status(task_id: str):
    """获取流水线状态"""
    state = await load_pipeline_state(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline task not found")
    return state


@router.get("/agents")
async def list_agents():
    """列出所有可用 Agent"""
    about = await gateway.get_about()
    return {"agents": about.get("agents_detail", [])}


@router.get("/system/status")
async def system_status():
    """获取系统状态"""
    about = await gateway.get_about()
    return {
        "model_mode": about["model_mode"],
        "health": about["health"],
        "skills_count": about["skills_count"],
        "users_count": about["users_count"],
    }


@router.websocket("/ws/{user_id}")
async def ws_agent(websocket: WebSocket, user_id: str):
    """Agent WebSocket 实时通信"""
    await websocket.accept()
    from app.redis import redis_client

    channel = f"agent:ws:{user_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        await websocket.send_json({"type": "connected", "message": "Agent WebSocket connected"})

        # 双向转发
        listen_task = asyncio.create_task(_redis_listen(pubsub, websocket))

        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # 客户端发来的消息推到队列
            msg_type = msg.get("type", "chat")
            if msg_type == "chat":
                await gateway.submit_chat(
                    user_id=user_id,
                    messages=msg.get("messages", []),
                    agent=msg.get("agent", "producer"),
                )
            elif msg_type == "pipeline":
                task_id = await gateway.submit_pipeline(
                    user_id=user_id,
                    params=msg.get("params", {}),
                )
                await websocket.send_json({"type": "pipeline_submitted", "task_id": task_id})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Agent WS error: {e}")
    finally:
        listen_task.cancel()
        try:
            await listen_task
        except asyncio.CancelledError:
            pass
        await pubsub.unsubscribe(channel)
        await pubsub.close()


async def _redis_listen(pubsub, websocket: WebSocket):
    """监听 Redis Pub/Sub 并转发到 WebSocket"""
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                if isinstance(data, str):
                    await websocket.send_text(data)
    except asyncio.CancelledError:
        pass


# ── Skills Registry API ──


@router.get("/skills")
async def list_system_skills(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """列出系统技能"""
    registry = SkillsRegistry(db)
    skills = await registry.list_system_skills(status=status)
    return {"skills": [
        {
            "id": str(s.id), "name": s.name, "version": s.version,
            "status": s.status, "usage_count": s.usage_count,
            "success_rate": s.success_rate, "avg_duration_ms": s.avg_duration_ms,
        }
        for s in skills
    ]}


@router.post("/skills")
async def create_system_skill(
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """创建系统技能"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    skill = await registry.create_system_skill(
        name=body["name"],
        skill_md=body["skill_md"],
        config=body.get("config"),
        source_user_id=str(current_user.id),
    )
    return {"id": str(skill.id), "name": skill.name, "status": skill.status}


@router.get("/skills/user")
async def list_user_skills(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """列出当前用户的技能"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    skills = await registry.list_user_skills(str(current_user.id))
    return {"skills": [
        {
            "id": str(s.id), "name": s.name, "version": s.version,
            "status": s.status, "fork_version": s.fork_version,
            "divergence": s.divergence,
        }
        for s in skills
    ]}


@router.post("/skills/user")
async def create_user_skill(
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """创建用户技能"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    skill = await registry.create_user_skill(
        user_id=str(current_user.id),
        name=body["name"],
        skill_md=body["skill_md"],
        config=body.get("config"),
    )
    return {"id": str(skill.id), "name": skill.name, "status": skill.status}


@router.post("/skills/fork/{system_skill_id}")
async def fork_system_skill(
    system_skill_id: str,
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """从系统技能 fork 到用户分支"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    skill = await registry.fork_system_skill(
        user_id=str(current_user.id),
        system_skill_id=system_skill_id,
        modifications=body.get("modifications"),
    )
    return {"id": str(skill.id), "name": skill.name, "fork_from": system_skill_id}


@router.post("/skills/promote")
async def request_promotion(
    body: dict,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """提交技能提升请求"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    req = await registry.request_promotion(
        user_id=str(current_user.id),
        user_skill_id=body["user_skill_id"],
        system_skill_id=body.get("system_skill_id"),
        diff_summary=body.get("diff_summary"),
    )
    return {"id": str(req.id), "status": req.status}


@router.get("/skills/diff/{user_skill_id}")
async def diff_skill(
    user_skill_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """对比用户技能与系统技能差异"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    return await registry.diff(user_skill_id)


@router.post("/skills/pull/{user_skill_id}")
async def pull_skill(
    user_skill_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """同步系统技能更新到用户分支"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    registry = SkillsRegistry(db)
    skill = await registry.pull(str(current_user.id), user_skill_id)
    return {
        "id": str(skill.id), "name": skill.name,
        "version": skill.version, "status": skill.status,
    }

