"""图片视觉描述缓存 — DB 持久 + Redis 热层，hash 寻址。

同一张图重复触发 minimax M3 多模态时直接返回描述，省 token + 省时间。
"""
import hashlib
import logging
import random
from datetime import datetime, timedelta
from typing import Optional

from app.config import get_settings
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
        # 概率触发 LRU 清理（1/20 避免每写都全表扫）
        if random.randint(1, 20) == 1:
            try:
                await cls.cleanup_expired()
            except Exception as e:
                logger.warning(f"img_desc 后台清理失败: {e}")
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

    @classmethod
    async def cleanup_expired(cls) -> int:
        """LRU + TTL 淘汰。

        1. TTL：删 created_at < now - ttl_days
        2. LRU：超 max_rows 时按 last_hit_at asc 删（NULL/0 hit 优先）
        3. Redis 同步：扫所有 img_desc:* 键，删 DB 没了的

        返回删除的 DB 行数。"""
        from sqlalchemy import delete, func, select

        settings = get_settings()
        max_rows = settings.IMG_DESC_CACHE_MAX_ROWS
        ttl_days = settings.IMG_DESC_CACHE_TTL_DAYS
        cutoff = datetime.utcnow() - timedelta(days=ttl_days)
        deleted_total = 0

        async with async_session_maker() as db:
            # 1. TTL 删
            ttl_stmt = delete(ImageDescription).where(ImageDescription.created_at < cutoff)
            result = await db.execute(ttl_stmt)
            deleted_total += result.rowcount or 0
            await db.commit()

            # 2. LRU：先数总数，再按 last_hit_at asc 删多余
            count_stmt = select(func.count()).select_from(ImageDescription)
            total = (await db.execute(count_stmt)).scalar() or 0
            if total > max_rows:
                excess = total - max_rows
                # 优先删 hit_count=0 (从未使用)
                no_hit = await db.execute(
                    select(ImageDescription.image_hash, ImageDescription.model)
                    .where(ImageDescription.hit_count == 0)
                    .order_by(ImageDescription.created_at.asc())
                    .limit(excess)
                )
                targets = list(no_hit)
                if len(targets) < excess:
                    # 不够则删最久未用的
                    rest = excess - len(targets)
                    used = await db.execute(
                        select(ImageDescription.image_hash, ImageDescription.model)
                        .order_by(ImageDescription.last_hit_at.asc().nulls_first())
                        .limit(rest)
                    )
                    targets.extend(used)
                for h, m in targets:
                    await db.execute(
                        delete(ImageDescription).where(
                            (ImageDescription.image_hash == h) & (ImageDescription.model == m)
                        )
                    )
                deleted_total += len(targets)
                await db.commit()

        # 3. Redis 同步：删 DB 没了的 key
        try:
            cur = 0
            deleted_redis = 0
            db_hashes = set()
            async with async_session_maker() as db:
                rows = await db.execute(select(ImageDescription.image_hash, ImageDescription.model))
                for h, m in rows:
                    db_hashes.add(f"{h}:{m}")
            async for key in redis_client.scan_iter(f"{cls.REDIS_PREFIX}*", count=500):
                cur += 1
                if key not in db_hashes:
                    await redis_client.delete(key)
                    deleted_redis += 1
            if deleted_redis:
                logger.info(f"img_desc Redis 清理: {deleted_redis} 个孤立 key (扫描 {cur})")
        except Exception as e:
            logger.warning(f"img_desc Redis 扫描清理失败: {e}")

        if deleted_total:
            logger.info(f"img_desc 清理: 删 {deleted_total} 条 (max_rows={max_rows}, ttl={ttl_days}d)")
        return deleted_total
