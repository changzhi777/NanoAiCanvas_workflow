# Nanoai Team8 Agent System — Adaptation Pipeline
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.redis import redis_client
from app.models.agent import AgentTask, TaskStatus
from app.services.agent.agents import AGENT_REGISTRY
from app.services.agent.model_router import ModelRouter
from app.services.agent.memory_stack import MemoryStack

logger = logging.getLogger(__name__)

PIPELINE_KEY_PREFIX = "agent_pipeline:"
PIPELINE_CHANNEL_PREFIX = "agent_pipeline_ch:"
PIPELINE_TTL = 86400 * 2  # 48h

# 8 阶段改编流水线
PIPELINE_STAGES = [
    {"name": "prepare", "agent": "producer", "stage": "prepare", "progress": 0},
    {"name": "statistics", "agent": "producer", "stage": "statistics", "progress": 12},
    {"name": "outline", "agent": "screenwriter", "stage": "outline", "progress": 25},
    {"name": "plan", "agent": "director", "stage": "plan", "progress": 37},
    {"name": "script", "agent": "screenwriter", "stage": "script", "progress": 50},
    {"name": "quality_control", "agent": "producer", "stage": "quality_control", "progress": 65},
    {"name": "merge", "agent": "producer", "stage": "merge", "progress": 80},
    {"name": "archive", "agent": "producer", "stage": "archive", "progress": 95},
]


def _pipeline_key(task_id: str) -> str:
    return f"{PIPELINE_KEY_PREFIX}{task_id}"


def _pipeline_channel(task_id: str) -> str:
    return f"{PIPELINE_CHANNEL_PREFIX}{task_id}"


async def _publish_progress(task_id: str, state: dict, user_id: str | None = None):
    msg = json.dumps(state, ensure_ascii=False)
    # 推送到 pipeline 专用 channel（用于 GET /pipeline/{id} 轮询）
    await redis_client.publish(_pipeline_channel(task_id), msg)
    # 同时推送到用户 WS channel（实时通知）
    if user_id:
        ws_msg = json.dumps({
            "type": "pipeline_progress",
            "task_id": task_id,
            "status": state.get("status"),
            "current_stage": state.get("current_stage"),
            "total_stages": state.get("total_stages"),
            "stages": state.get("stages", []),
        }, ensure_ascii=False)
        await redis_client.publish(f"agent:ws:{user_id}", ws_msg)


async def _save_state(task_id: str, state: dict):
    await redis_client.setex(
        _pipeline_key(task_id),
        PIPELINE_TTL,
        json.dumps(state, ensure_ascii=False),
    )


async def load_pipeline_state(task_id: str) -> dict | None:
    raw = await redis_client.get(_pipeline_key(task_id))
    return json.loads(raw) if raw else None


class AdaptationPipeline:
    def __init__(self, db: AsyncSession, model_router: ModelRouter | None = None):
        self.db = db
        self.model_router = model_router or ModelRouter()

    async def execute(self, user_id: str, task: AgentTask) -> dict:
        """执行完整的 8 阶段改编流水线"""
        memory = MemoryStack(self.db, user_id)
        context = await memory.wake_up()

        task_id = str(task.id)
        state = {
            "task_id": task_id,
            "user_id": user_id,
            "status": "running",
            "current_stage": 0,
            "total_stages": len(PIPELINE_STAGES),
            "stages": [],
            "result": None,
            "created_at": time.time(),
        }

        await _save_state(task_id, state)
        await _publish_progress(task_id, state, user_id)

        try:
            for i, stage_def in enumerate(PIPELINE_STAGES):
                state["current_stage"] = i
                state["status"] = "running"
                await _save_state(task_id, state)
                await _publish_progress(task_id, state, user_id)

                agent_name = stage_def["agent"]
                agent_cls = AGENT_REGISTRY.get(agent_name)
                if not agent_cls:
                    raise ValueError(f"Agent not found: {agent_name}")

                agent = agent_cls(self.model_router, self.db)
                stage_result = await agent._measure_execution(
                    user_id=user_id,
                    task_id=task_id,
                    stage=stage_def["name"],
                    fn=agent.run,
                    task={"stage": stage_def["stage"], **task.params_json},
                    context=context,
                )

                # 累积上下文
                context[stage_def["name"]] = stage_result
                state["stages"].append({
                    "name": stage_def["name"],
                    "agent": agent_name,
                    "status": "completed",
                    "progress": stage_def["progress"],
                })

                await _save_state(task_id, state)
                await _publish_progress(task_id, state, user_id)

            # 完成
            state["status"] = "completed"
            state["progress"] = 100
            state["result"] = context
            await _save_state(task_id, state)
            await _publish_progress(task_id, state, user_id)

            # 睡眠准备：归档记忆
            await memory.sleep_prep({"key_insights": self._extract_insights(context)})

            # 更新 DB task
            task.status = TaskStatus.COMPLETED
            task.result_json = context
            task.progress = 100.0
            task.completed_at = datetime.now(timezone.utc)
            await self.db.commit()

            return context

        except Exception as e:
            logger.error(f"Pipeline failed at stage {state.get('current_stage')}: {e}")
            state["status"] = "failed"
            state["error"] = str(e)
            await _save_state(task_id, state)
            await _publish_progress(task_id, state, user_id)

            task.status = TaskStatus.FAILED
            task.result_json = {"error": str(e)}
            await self.db.commit()

            raise

    def _extract_insights(self, context: dict) -> list[str]:
        """从流水线上下文提取关键洞察"""
        insights = []
        for key, value in context.items():
            if isinstance(value, dict) and "result" in value:
                result = value["result"]
                if isinstance(result, str) and len(result) > 50:
                    insights.append(f"{key}: {result[:200]}")
        return insights[:5]  # 最多 5 条
