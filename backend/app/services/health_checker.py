"""
API Key 健康检查 Worker
定时巡检所有 active Key 的可用性
"""
import asyncio
import logging
import time
import httpx
from datetime import datetime, timedelta

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings
from app.models.api_key import APIKey, Provider

logger = logging.getLogger("health_checker")

CHECK_INTERVAL = 300
HEARTBEAT_TIMEOUT = timedelta(minutes=15)

_engine = None
_session_factory = None


def _get_session_factory():
    global _engine, _session_factory
    if _session_factory is None:
        settings = get_settings()
        _engine = create_async_engine(settings.DATABASE_URL, pool_size=2, max_overflow=2)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def _check_one_key(http: httpx.AsyncClient, key: APIKey, provider: Provider) -> dict:
    if not provider or not provider.api_base_url:
        return {"success": False, "error": "No api_base_url", "ms": 0}

    start = time.time()
    try:
        url = f"{provider.api_base_url.rstrip('/')}/models"
        resp = await http.get(url, headers={"Authorization": f"Bearer {key.api_key}"})
        elapsed = int((time.time() - start) * 1000)
        if resp.status_code == 200:
            return {"success": True, "error": None, "ms": elapsed}
        return {"success": False, "error": f"HTTP {resp.status_code}", "ms": elapsed}
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return {"success": False, "error": str(e)[:200], "ms": elapsed}


async def _fetch_active_keys(sf) -> list:
    async with sf() as db:
        stmt = (
            select(APIKey.id, APIKey, Provider)
            .join(Provider, APIKey.provider_id == Provider.id)
            .where(APIKey.status == "active", Provider.is_active == True)
        )
        result = await db.execute(stmt)
        return [(kid, key, provider) for kid, key, provider in result.all()]


async def _save_results(sf, rows: list, results: list):
    async with sf() as db:
        now = datetime.utcnow()
        healthy = 0
        for (_, key, _), r in zip(rows, results):
            if isinstance(r, Exception):
                r = {"success": False, "error": str(r)[:200], "ms": 0}

            key.last_test_at = now
            key.last_test_success = r["success"]
            key.last_response_ms = r["ms"]
            key.last_error = r["error"]
            key.last_heartbeat_at = now

            if r["success"]:
                key.health_status = "healthy"
                healthy += 1
            elif r["error"] and "timeout" in r["error"].lower():
                key.health_status = "degraded"
            else:
                key.health_status = "down"

            db.add(key)
        await db.commit()
    return healthy


async def run_health_check():
    sf = _get_session_factory()
    await asyncio.sleep(30)

    while True:
        try:
            rows = await _fetch_active_keys(sf)
            if not rows:
                logger.debug("No active keys to check")
            else:
                async with httpx.AsyncClient(timeout=15) as http:
                    tasks = [_check_one_key(http, key, provider) for _, key, provider in rows]
                    results = await asyncio.gather(*tasks, return_exceptions=True)

                healthy = await _save_results(sf, rows, results)
                down = sum(1 for _, k, _ in rows if k.health_status == "down")
                logger.info(f"Health check: {len(rows)} keys, {healthy} healthy, {down} down")

        except Exception as e:
            logger.error(f"Health check error: {e}")

        await asyncio.sleep(CHECK_INTERVAL)


async def mark_stale_keys():
    """标记超时未心跳的 Key 为 unknown"""
    sf = _get_session_factory()

    while True:
        await asyncio.sleep(600)
        try:
            async with sf() as db:
                cutoff = datetime.utcnow() - HEARTBEAT_TIMEOUT
                stmt = select(APIKey).where(
                    and_(
                        APIKey.status == "active",
                        APIKey.health_status != "unknown",
                        APIKey.last_heartbeat_at != None,
                        APIKey.last_heartbeat_at < cutoff,
                    )
                )
                result = await db.execute(stmt)
                stale = result.scalars().all()
                for k in stale:
                    k.health_status = "unknown"
                if stale:
                    await db.commit()
                    logger.info(f"Marked {len(stale)} keys as unknown (heartbeat timeout)")
        except Exception as e:
            logger.error(f"Stale check error: {e}")
