"""
Key 池调度器（P1）——候选计划 + 失败切换 + rest 分级休息

借鉴 magpie gateway routing 的 rest 机制（见 docs/magpie-token-pool-analysis.md）：
- 候选计划：同一 (frontend_key, model_type) 下的多个 BackendKeyMapping 按
  priority desc 排列，逐个尝试，失败换下一个；
- rest 分级休息：失败按类型登记休息时长，休息中的候选跳过（全休息时探一个
  最快结束的），到点自动复活；
- 成功即清 rest 与失败计数。

rest/失败计数存 Redis（多 worker 共享）；Redis 不可用时降级为进程内字典。
"""
from __future__ import annotations

import dataclasses
import logging
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("key_scheduler")

# —— rest 时长常量（对标 magpie routing.go）——
CREDIT_REST = 30 * 60  # 余额/额度耗尽：30 分钟
QUOTA_REST = 15 * 60  # 配额受限（无 reset 信息）：15 分钟
RATE_REST_MAX = 30 * 60  # 限流：retry-after，上限 30 分钟
GENERAL_BASE = 60  # 一般失败：1 分钟起
GENERAL_MAX = 10 * 60  # 指数翻倍上限 10 分钟

REST_KEY = "keysched:rest:{mid}"
FAIL_KEY = "keysched:fail:{mid}"

# Redis 不可用时的进程内降级（multi-worker 下仅本进程生效）
_local_rest: dict[str, float] = {}
_local_fail: dict[str, int] = {}


@dataclass
class Candidate:
    """一个可尝试的上游 key（BackendKeyMapping 的一行）

    extra：调用方透传的业务字段（如 provider_type/mask/mcp_config），
    调度器不解读，仅随候选流转给 call 回调。
    """

    mapping_id: int
    backend_key: str
    priority: int = 0
    weight: int = 1
    extra: dict = dataclasses.field(default_factory=dict)


@dataclass
class AttemptResult:
    """候选循环的结果（供调用方记录）"""

    candidate: Candidate
    tries: int
    failures: List[str]  # 每个失败候选的一句话（进日志/trace）


def classify_failure(exc: Exception) -> tuple[str, int]:
    """失败分类 → (类别, rest 秒数)

    类别：credit（额度耗尽）/ rate（限流）/ general（其他）
    """
    status = None
    retry_after = None
    # httpx.HTTPStatusError
    for attr in ("response",):
        resp = getattr(exc, attr, None)
        if resp is not None:
            status = getattr(resp, "status_code", None)
            try:
                retry_after = resp.headers.get("retry-after")
            except Exception:
                pass

    msg = str(exc).lower()
    credit_words = ("余额", "额度", "balance", "insufficient", "credit", "quota")
    if status == 402 or any(w in msg for w in credit_words):
        return "credit", CREDIT_REST

    if status == 429:
        delay = RATE_REST_MAX
        try:
            if retry_after:
                delay = min(int(retry_after), RATE_REST_MAX)
        except Exception:
            pass
        return "rate", delay

    return "general", -1  # -1 表示按失败次数指数计算


async def _redis():
    """懒取 Redis 客户端（不可用返回 None）"""
    try:
        from app.redis import redis_client

        await redis_client.ping()
        return redis_client
    except Exception:
        return None


async def get_rest_remaining(mapping_id: int) -> int:
    """候选剩余休息秒数（0=不在休息）"""
    r = await _redis()
    if r is not None:
        try:
            ttl = await r.ttl(REST_KEY.format(mid=mapping_id))
            return max(0, ttl)
        except Exception:
            pass
    until = _local_rest.get(str(mapping_id), 0)
    return max(0, int(until - time.time()))


async def set_rest(mapping_id: int, seconds: int, reason: str) -> None:
    """登记候选休息"""
    logger.warning("key %s rest %ss (%s)", mapping_id, seconds, reason)
    r = await _redis()
    if r is not None:
        try:
            await r.setex(REST_KEY.format(mid=mapping_id), seconds, reason)
            return
        except Exception:
            pass
    _local_rest[str(mapping_id)] = time.time() + seconds


async def clear_rest(mapping_id: int) -> None:
    """成功应答：清 rest 与失败计数"""
    r = await _redis()
    if r is not None:
        try:
            await r.delete(REST_KEY.format(mid=mapping_id), FAIL_KEY.format(mid=mapping_id))
            return
        except Exception:
            pass
    _local_rest.pop(str(mapping_id), None)
    _local_fail.pop(str(mapping_id), None)


async def _bump_failures(mapping_id: int) -> int:
    """一般失败计数 +1（用于指数翻倍）"""
    r = await _redis()
    if r is not None:
        try:
            n = await r.incr(FAIL_KEY.format(mid=mapping_id))
            await r.expire(FAIL_KEY.format(mid=mapping_id), GENERAL_MAX * 4)
            return int(n)
        except Exception:
            pass
    n = _local_fail.get(str(mapping_id), 0) + 1
    _local_fail[str(mapping_id)] = n
    return n


async def plan_candidates(
    db: AsyncSession, frontend_key_id: int, model_type: str
) -> List[Candidate]:
    """候选计划：该 frontend_key + model_type 下所有 active 映射，priority desc"""
    from app.models.api_key import BackendKeyMapping

    result = await db.execute(
        select(BackendKeyMapping)
        .where(
            BackendKeyMapping.frontend_key_id == frontend_key_id,
            BackendKeyMapping.model_type == model_type,
            BackendKeyMapping.is_active.is_(True),
        )
        .order_by(BackendKeyMapping.priority.desc(), BackendKeyMapping.id)
    )
    rows = result.scalars().all()
    return [
        Candidate(
            mapping_id=m.id,
            backend_key=m.backend_key,
            priority=m.priority or 0,
            weight=getattr(m, "weight", 1) or 1,
        )
        for m in rows
    ]


async def attempt_with_failover(
    candidates: List[Candidate],
    call: Callable[[Candidate], Awaitable[Any]],
) -> tuple[Any, AttemptResult]:
    """候选循环：逐个尝试，失败按类型休息后换下一个；全部失败抛最后错误

    探一原则（简化）：休息中的候选排在最后；若还有其他可用候选则跳过，
    只在前面的候选都失败时才按「最快结束」顺序探一个休息中的。
    """
    if not candidates:
        raise RuntimeError("无可用 key 候选")

    # 休息中的排到最后（保持 priority 序）
    rests = [(c, await get_rest_remaining(c.mapping_id)) for c in candidates]
    ready = [c for c, r in rests if r == 0]
    resting = sorted([(c, r) for c, r in rests if r > 0], key=lambda x: x[1])

    ordered: List[Candidate] = ready + [c for c, _ in resting]
    fails: List[str] = []

    for i, cand in enumerate(ordered):
        remaining = await get_rest_remaining(cand.mapping_id)
        # 探一：还有后续可用候选时，跳过仍在休息的
        if remaining > 0 and i < len(ordered) - 1:
            # 若后面还有未休息的候选，跳过此候选
            later_ready = any(
                await get_rest_remaining(c.mapping_id) == 0 for c in ordered[i + 1 :]
            )
            if later_ready:
                continue
        try:
            out = await call(cand)
            await clear_rest(cand.mapping_id)
            return out, AttemptResult(candidate=cand, tries=i + 1, failures=fails)
        except Exception as exc:  # noqa: BLE001 - 分类后向上抛
            kind, delay = classify_failure(exc)
            if delay < 0:
                n = await _bump_failures(cand.mapping_id)
                delay = min(GENERAL_BASE * (2 ** (n - 1)), GENERAL_MAX)
            await set_rest(cand.mapping_id, delay, f"{kind}: {str(exc)[:120]}")
            fails.append(f"{cand.mapping_id}:{kind}:{str(exc)[:80]}")
            last = exc
            continue

    raise last  # type: ignore[name-defined]
