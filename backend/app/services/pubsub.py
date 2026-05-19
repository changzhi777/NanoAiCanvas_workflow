"""
import logging; logger = logging.getLogger(__name__)
Redis Pub/Sub 服务 - 任务状态实时推送
"""
import asyncio
import json
from typing import Optional, Dict, Any
from uuid import uuid4

import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()

# Redis 客户端
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True,
    socket_timeout=30,
    socket_connect_timeout=10,
    retry_on_timeout=True,
    health_check_interval=30,
)

# 任务状态频道前缀
TASK_CHANNEL_PREFIX = "task:status:"
TASK_CHANNEL_PATTERN = "task:status:*"


class TaskPublisher:
    """任务状态发布者"""

    @staticmethod
    def get_channel(task_id: str) -> str:
        """获取任务对应的 Redis 频道名称"""
        return f"{TASK_CHANNEL_PREFIX}{task_id}"

    @classmethod
    async def publish_status(
        cls,
        task_id: str,
        status: str,
        images: Optional[list] = None,
        error: Optional[str] = None,
        progress: Optional[int] = None,
    ) -> None:
        """
        发布任务状态到 Redis 频道

        Args:
            task_id: 任务ID
            status: 状态 (pending/processing/success/failed)
            images: 图片列表 (可选)
            error: 错误信息 (可选)
            progress: 进度 0-100 (可选)
        """
        channel = cls.get_channel(task_id)
        message = json.dumps({
            "task_id": task_id,
            "status": status,
            "images": images,
            "error": error,
            "progress": progress,
        }, ensure_ascii=False)

        try:
            await redis_client.publish(channel, message)
        except Exception as e:
            logger.warning(f"Redis publish error: {e}")

    @classmethod
    async def publish_pending(cls, task_id: str, progress: int = 0) -> None:
        """发布任务等待中状态"""
        await cls.publish_status(task_id, "pending", progress=progress)

    @classmethod
    async def publish_processing(cls, task_id: str, progress: int = 30) -> None:
        """发布任务处理中状态"""
        await cls.publish_status(task_id, "processing", progress=progress)

    @classmethod
    async def publish_success(
        cls,
        task_id: str,
        images: list,
        progress: int = 100
    ) -> None:
        """发布任务成功状态"""
        await cls.publish_status(task_id, "success", images=images, progress=progress)

    @classmethod
    async def publish_failed(cls, task_id: str, error: str) -> None:
        """发布任务失败状态"""
        await cls.publish_status(task_id, "failed", error=error, progress=0)


class TaskSubscriber:
    """任务状态订阅者"""

    def __init__(self):
        self.pubsub: Optional[redis.client.PubSub] = None
        self._running = False

    async def subscribe(self, task_id: str) -> str:
        """
        订阅任务状态

        Args:
            task_id: 任务ID

        Returns:
            subscriber_id: 订阅者ID，用于取消订阅
        """
        if not self.pubsub:
            self.pubsub = redis_client.pubsub()

        channel = TaskPublisher.get_channel(task_id)
        await self.pubsub.subscribe(channel)

        return f"{task_id}:{uuid4()}"  # 返回订阅者ID

    async def unsubscribe(self, task_id: str) -> None:
        """取消订阅"""
        if self.pubsub:
            channel = TaskPublisher.get_channel(task_id)
            await self.pubsub.unsubscribe(channel)

    async def get_message(self, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """
        获取下一条消息

        Args:
            timeout: 超时时间（秒）

        Returns:
            任务状态消息，如果超时返回 None
        """
        if not self.pubsub:
            return None

        try:
            message = await asyncio.wait_for(
                self.pubsub.get_message(ignore_subscribe_messages=True),
                timeout=timeout
            )
            if message and message.get("type") == "message":
                data = message.get("data")
                if isinstance(data, str):
                    return json.loads(data)
                return data
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            logger.warning(f"Redis get_message error: {e}")

        return None

    async def close(self) -> None:
        """关闭订阅"""
        if self.pubsub:
            await self.pubsub.close()
            self.pubsub = None


async def get_redis_client() -> redis.Redis:
    """获取 Redis 客户端（供其他模块使用）"""
    return redis_client


async def test_redis_connection() -> bool:
    """测试 Redis 连接"""
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis connection test failed: {e}")
        return False
