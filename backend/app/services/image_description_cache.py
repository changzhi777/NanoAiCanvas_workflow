"""图片视觉描述缓存 — DB 持久 + Redis 热层，hash 寻址。

同一张图重复触发 minimax M3 多模态时直接返回描述，省 token + 省时间。
"""
import hashlib
import logging
from datetime import datetime
from typing import Optional

from app.database import Base, async_session_maker  # noqa: F401  触发 metadata 注册
from app.models.image_description import ImageDescription
from app.redis import redis_client

logger = logging.getLogger(__name__)


class ImageDescriptionCache:
    """图片描述缓存 — Redis 命中快，DB 持久兜底，缓存未命中调 minimax M3。"""

    REDIS_PREFIX = "img_desc:"
    REDIS_TTL = 24 * 3600  # 24h
    DEFAULT_MODEL = "MiniMax-M3"

    @staticmethod
    def hash_image(image: str) -> str:
        """sha256 寻址。URL 与裸 base64 都按原字符串 hash（保持稳定）。"""
        return hashlib.sha256(image.encode("utf-8")).hexdigest()

    @classmethod
    async def get_or_describe(
        cls, image: str, model: Optional[str] = None, describe_fn=None
    ) -> Optional[str]:
        """查 Redis → 查 DB → 缓存未命中调 describe_fn(image) → 双写。"""
        if not image:
            return None
        model = model or cls.DEFAULT_MODEL
        h = cls.hash_image(image)
        key = f"{cls.REDIS_PREFIX}{h}:{model}"

        # 1. Redis 热层
        try:
            cached = await redis_client.get(key)
            if cached:
                await cls._record_hit(h, model)
                return cached.decode() if isinstance(cached, bytes) else cached
        except Exception as e:
            logger.warning(f"img_desc 读 redis 失败（继续查 DB）: {e}")

        # 2. DB 持久层
        async with async_session_maker() as db:
            row = await db.get(ImageDescription, (h, model))
            if row:
                row.hit_count = (row.hit_count or 0) + 1
                row.last_hit_at = datetime.utcnow()
                await db.commit()
                desc = row.description
                # 回写 Redis
                try:
                    await redis_client.setex(key, cls.REDIS_TTL, desc)
                except Exception:
                    pass
                return desc

        # 3. 缓存未命中 — 调 M3
        if describe_fn is None:
            return None
        try:
            desc = await describe_fn(image)
        except Exception as e:
            logger.warning(f"M3 描述失败（缓存不写）: {e}")
            return None
        if not desc:
            return None

        # 4. 双写（DB 优先 — 持久层覆盖热层）
        async with async_session_maker() as db:
            try:
                db.add(ImageDescription(
                    image_hash=h,
                    model=model,
                    description=desc,
                    hit_count=0,
                    created_at=datetime.utcnow(),
                ))
                await db.commit()
            except Exception as e:
                logger.warning(f"img_desc 写 DB 失败: {e}")
                await db.rollback()
        try:
            await redis_client.setex(key, cls.REDIS_TTL, desc)
        except Exception:
            pass
        return desc

    @staticmethod
    async def _record_hit(h: str, model: str) -> None:
        """Redis 命中时异步 bump DB hit_count（fire-and-forget，失败可忍）。"""
        try:
            async with async_session_maker() as db:
                row = await db.get(ImageDescription, (h, model))
                if row:
                    row.hit_count = (row.hit_count or 0) + 1
                    row.last_hit_at = datetime.utcnow()
                    await db.commit()
        except Exception:
            pass
