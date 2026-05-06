"""
Redis List 任务队列服务

基于 Redis List 实现轻量级任务队列：
- enqueue: LPUSH 入队
- dequeue: BRPOP 阻塞出队
- 任务持久化：Redis + PostgreSQL 双重保障
"""

import json
import uuid
import time
from typing import Any, Dict, List, Optional

import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()

# 队列名前缀
QUEUE_PREFIX = "skills:queue:"
# 任务存储前缀（用于状态查询）
TASK_STORE_PREFIX = "skills:task:"
# 任务存储 TTL（24小时）
TASK_STORE_TTL = 86400


def _get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
    )


class TaskQueue:
    """Redis List 任务队列"""

    def __init__(self, queue_name: str, redis_client: Optional[redis.Redis] = None):
        self.queue_name = queue_name
        self.full_queue_name = f"{QUEUE_PREFIX}{queue_name}"
        self._redis = redis_client

    async def _get_client(self) -> redis.Redis:
        if self._redis is None:
            self._redis = _get_redis()
        return self._redis

    async def enqueue(self, task_data: Dict[str, Any]) -> str:
        """
        任务入队

        Args:
            task_data: 任务数据

        Returns:
            task_id: 任务ID
        """
        task_id = str(uuid.uuid4())
        task_data["task_id"] = task_id
        task_data["created_at"] = time.time()
        task_data["status"] = "queued"

        client = await self._get_client()

        # 存储任务详情
        await client.setex(
            f"{TASK_STORE_PREFIX}{task_id}",
            TASK_STORE_TTL,
            json.dumps(task_data, ensure_ascii=False),
        )

        # 入队
        await client.lpush(self.full_queue_name, json.dumps(task_data, ensure_ascii=False))

        return task_id

    async def dequeue(self, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
        """
        阻塞出队

        Args:
            timeout: 阻塞超时（秒），0 = 无限等待

        Returns:
            任务数据，超时返回 None
        """
        client = await self._get_client()
        result = await client.brpop(self.full_queue_name, timeout=timeout)
        if result is None:
            return None
        _, raw = result
        return json.loads(raw)

    async def get_queue_length(self) -> int:
        """获取队列长度"""
        client = await self._get_client()
        return await client.llen(self.full_queue_name)

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务详情"""
        client = await self._get_client()
        raw = await client.get(f"{TASK_STORE_PREFIX}{task_id}")
        if raw is None:
            return None
        return json.loads(raw)

    async def update_task(self, task_id: str, updates: Dict[str, Any]) -> None:
        """更新任务数据"""
        task = await self.get_task(task_id)
        if task is None:
            return
        task.update(updates)
        client = await self._get_client()
        await client.setex(
            f"{TASK_STORE_PREFIX}{task_id}",
            TASK_STORE_TTL,
            json.dumps(task, ensure_ascii=False),
        )

    async def remove_task(self, task_id: str) -> None:
        """删除任务存储"""
        client = await self._get_client()
        await client.delete(f"{TASK_STORE_PREFIX}{task_id}")

    async def cancel_task(self, task_id: str) -> bool:
        """
        取消排队中的任务

        Returns:
            是否成功取消
        """
        client = await self._get_client()
        # 从队列中移除指定任务
        task = await self.get_task(task_id)
        if task is None:
            return False
        if task.get("status") not in ("queued", "pending"):
            return False

        # 从 Redis List 中移除
        task_json = json.dumps(task, ensure_ascii=False)
        removed = await client.lrem(self.full_queue_name, 1, task_json)
        if removed > 0:
            await self.update_task(task_id, {"status": "cancelled"})
            return True
        return False

    async def get_queue_info(self) -> Dict[str, Any]:
        """获取队列状态信息"""
        client = await self._get_client()
        length = await client.llen(self.full_queue_name)
        return {
            "queue_name": self.queue_name,
            "length": length,
            "full_name": self.full_queue_name,
        }


class TaskQueueManager:
    """任务队列管理器（多队列）"""

    _instance = None
    _queues: Dict[str, TaskQueue] = {}
    _redis: Optional[redis.Redis] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_queue(self, skill_id: str) -> TaskQueue:
        """获取指定技能的任务队列"""
        if skill_id not in self._queues:
            if self._redis is None:
                self._redis = _get_redis()
            self._queues[skill_id] = TaskQueue(skill_id, self._redis)
        return self._queues[skill_id]

    async def get_all_queue_info(self) -> List[Dict[str, Any]]:
        """获取所有队列状态"""
        infos = []
        for skill_id, queue in self._queues.items():
            info = await queue.get_queue_info()
            infos.append(info)
        return infos

    async def get_task_by_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        """直接按 task_id 查找任务（不需要知道队列名）"""
        if self._redis is None:
            self._redis = _get_redis()
        raw = await self._redis.get(f"{TASK_STORE_PREFIX}{task_id}")
        if raw is None:
            return None
        return json.loads(raw)

    async def update_task_by_id(self, task_id: str, updates: Dict[str, Any]) -> None:
        """直接按 task_id 更新任务"""
        if self._redis is None:
            self._redis = _get_redis()
        raw = await self._redis.get(f"{TASK_STORE_PREFIX}{task_id}")
        if raw is None:
            return
        task = json.loads(raw)
        task.update(updates)
        await self._redis.setex(
            f"{TASK_STORE_PREFIX}{task_id}",
            TASK_STORE_TTL,
            json.dumps(task, ensure_ascii=False),
        )

    async def cancel_task_by_id(self, task_id: str) -> bool:
        """按 task_id 取消任务"""
        task = await self.get_task_by_id(task_id)
        if task is None:
            return False
        if task.get("status") not in ("queued", "pending"):
            return False
        # 遍历队列查找并移除
        task_json = json.dumps(task, ensure_ascii=False)
        for skill_id, queue in self._queues.items():
            removed = await self._redis.lrem(queue.full_queue_name, 1, task_json)
            if removed > 0:
                await self.update_task_by_id(task_id, {"status": "cancelled"})
                return True
        # 任务可能已出队但状态还是 queued（正在执行中）
        await self.update_task_by_id(task_id, {"status": "cancelled"})
        return True

    async def close(self):
        """关闭 Redis 连接"""
        if self._redis:
            await self._redis.close()
            self._redis = None
