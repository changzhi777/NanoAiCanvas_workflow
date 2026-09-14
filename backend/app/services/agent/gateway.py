# Nanoai Team8 Agent System — Gateway
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import asyncio
import json
import logging
import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.redis import redis_client
from app.database import async_session_maker
from app.models.agent import AgentTask, SystemSkill, TaskStatus
from app.services.agent import __version__
from app.services.agent.copyright import AGENT_NAME, COPYRIGHT
from app.services.agent.model_router import ModelRouter
from app.services.agent.pipeline import AdaptationPipeline
from app.services.agent.agents import AGENT_REGISTRY
from app.services.agent.sleep.scheduler import sleep_scheduler

logger = logging.getLogger(__name__)

AGENT_QUEUE_KEY = "agent:task_queue"
AGENT_WS_CHANNEL_PREFIX = "agent:ws:"


class AgentGateway:
    """Agent 主循环 — 事件驱动的任务调度网关"""

    def __init__(self):
        self.model_router = ModelRouter()
        self._running = False
        self._background_tasks: set[asyncio.Task] = set()
        self._agents_info = [
            {"name": name, "description": cls.description}
            for name, cls in AGENT_REGISTRY.items()
        ]
        self._about_cache: dict | None = None
        self._about_cache_ts: float = 0

    async def start(self):
        """启动主循环"""
        self._running = True
        logger.info(f"{AGENT_NAME} v{__version__} starting...")
        self._spawn_task(self._consume_loop())

        await sleep_scheduler.start(schedule_hour=3)

        logger.info(f"{AGENT_NAME} gateway started, {len(self._agents_info)} agents registered")

    async def stop(self):
        self._running = False
        for t in self._background_tasks:
            t.cancel()
        await sleep_scheduler.stop()

    def _spawn_task(self, coro) -> asyncio.Task:
        """创建并追踪后台 task，防止 GC 回收"""
        task = asyncio.create_task(coro)
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        return task

    async def _consume_loop(self):
        """Redis BRPOP 消费任务队列"""
        while self._running:
            try:
                result = await redis_client.brpop(AGENT_QUEUE_KEY, timeout=5)
                if result:
                    _, raw = result
                    task_data = json.loads(raw)
                    self._spawn_task(self._process_task(task_data))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Gateway consume error: {e}")
                await asyncio.sleep(1)

    async def _process_task(self, task_data: dict):
        """处理单个任务"""
        task_type = task_data.get("type", "pipeline")
        user_id = task_data.get("user_id", "")

        if not user_id:
            logger.error("Task missing user_id, skipping")
            return

        async with async_session_maker() as db:
            try:
                if task_type == "pipeline":
                    await self._handle_pipeline(db, user_id, task_data)
                elif task_type == "chat":
                    await self._handle_chat(db, user_id, task_data)
            except ValueError as e:
                logger.error(f"Invalid task data: {e}")
            except Exception as e:
                logger.error(f"Task processing error: {e}")

    # ── Pipeline ──

    async def _handle_pipeline(self, db: AsyncSession, user_id: str, task_data: dict):
        """处理流水线任务"""
        task_id = task_data.get("task_id", str(uuid.uuid4()))

        # 创建 DB task
        agent_task = AgentTask(
            id=uuid.UUID(task_id),
            user_id=uuid.UUID(user_id),
            pipeline_type=task_data.get("pipeline_type", "adaptation"),
            status=TaskStatus.RUNNING,
            params_json=task_data.get("params", {}),
        )
        db.add(agent_task)
        await db.commit()

        pipeline = AdaptationPipeline(db, self.model_router)
        await pipeline.execute(user_id, agent_task)

    # ── Chat ──

    async def _handle_chat(self, db: AsyncSession, user_id: str, task_data: dict):
        """处理聊天请求"""
        messages = task_data.get("messages", [])
        agent_name = task_data.get("agent", "producer")
        model = task_data.get("model")

        response = await self.model_router.chat_completion(
            messages=messages,
            agent_name=agent_name,
            model=model,
            stream=False,
        )

        # 推送结果到 WS channel
        channel = f"{AGENT_WS_CHANNEL_PREFIX}{user_id}"
        await redis_client.publish(channel, json.dumps({
            "type": "chat_response",
            "agent": agent_name,
            "response": response,
        }, ensure_ascii=False))

    # ── Public API ──

    async def submit_pipeline(self, user_id: str, params: dict, pipeline_type: str = "adaptation") -> str:
        """提交流水线任务到队列"""
        task_id = str(uuid.uuid4())
        task_data = {
            "type": "pipeline",
            "task_id": task_id,
            "user_id": user_id,
            "pipeline_type": pipeline_type,
            "params": params,
        }
        await redis_client.lpush(AGENT_QUEUE_KEY, json.dumps(task_data, ensure_ascii=False))
        return task_id

    async def submit_chat(self, user_id: str, messages: list, agent: str = "producer", model: str | None = None):
        """提交聊天请求"""
        task_data = {
            "type": "chat",
            "user_id": user_id,
            "messages": messages,
            "agent": agent,
            "model": model,
        }
        await redis_client.lpush(AGENT_QUEUE_KEY, json.dumps(task_data, ensure_ascii=False))

    async def get_about(self) -> dict:
        """获取系统信息（60s 缓存）"""
        import time as _time
        if self._about_cache and (_time.time() - self._about_cache_ts) < 60:
            return self._about_cache

        health = await self.model_router.health_check()
        model_mode = "cloud"
        if health.get("local") and health.get("cloud"):
            model_mode = "hybrid"
        elif health.get("local"):
            model_mode = "local"

        async with async_session_maker() as db:
            skills_count = await db.scalar(select(func.count(SystemSkill.id)))
            users_count = await db.scalar(
                select(func.count(AgentTask.user_id.distinct()))
            )

        self._about_cache = {
            "name": AGENT_NAME,
            "version": __version__,
            "copyright": COPYRIGHT,
            "agents": [a["name"] for a in self._agents_info],
            "agents_detail": self._agents_info,
            "model_mode": model_mode,
            "health": health,
            "skills_count": skills_count or 0,
            "users_count": users_count or 0,
        }
        self._about_cache_ts = _time.time()
        return self._about_cache


# 全局单例
gateway = AgentGateway()
