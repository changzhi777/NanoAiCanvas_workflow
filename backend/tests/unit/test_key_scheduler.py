"""key_scheduler 单元测试 — 候选计划/失败切换/rest 分级休息"""
import os

# app.models 链上会实例化 Settings —— 单元测试用占位环境变量
for k, v in {
    "POSTGRES_HOST": "localhost",
    "POSTGRES_DB": "test",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "REDIS_HOST": "localhost",
    "REDIS_PASSWORD": "",
    "SECRET_KEY": "test",
}.items():
    os.environ.setdefault(k, v)

import time

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services import key_scheduler as ks


class _FakeResp:
    def __init__(self, status_code, headers=None):
        self.status_code = status_code
        self.headers = headers or {}


class _FakeHTTPError(Exception):
    def __init__(self, status_code, headers=None, msg="http error"):
        super().__init__(msg)
        self.response = _FakeResp(status_code, headers)


def _cand(mid, pri=0):
    return ks.Candidate(mapping_id=mid, backend_key=f"bk-{mid}", priority=pri)


@pytest.fixture(autouse=True)
def _clean_local_state():
    ks._local_rest.clear()
    ks._local_fail.clear()
    yield
    ks._local_rest.clear()
    ks._local_fail.clear()


# —— classify_failure ——

def test_classify_credit_by_status():
    kind, delay = ks.classify_failure(_FakeHTTPError(402))
    assert kind == "credit" and delay == ks.CREDIT_REST


def test_classify_credit_by_message():
    kind, delay = ks.classify_failure(Exception("余额不足或无可用资源包"))
    assert kind == "credit" and delay == ks.CREDIT_REST


def test_classify_rate_uses_retry_after():
    kind, delay = ks.classify_failure(_FakeHTTPError(429, {"retry-after": "7"}))
    assert kind == "rate" and delay == 7


def test_classify_rate_caps():
    kind, delay = ks.classify_failure(_FakeHTTPError(429, {"retry-after": "99999"}))
    assert kind == "rate" and delay == ks.RATE_REST_MAX


def test_classify_general():
    kind, delay = ks.classify_failure(Exception("connection reset"))
    assert kind == "general" and delay == -1


# —— attempt_with_failover ——

@pytest.mark.asyncio
async def test_failover_first_fails_second_succeeds():
    calls = []

    async def call(c):
        calls.append(c.mapping_id)
        if c.mapping_id == 1:
            raise Exception("boom")
        return "ok"

    out, result = await ks.attempt_with_failover([_cand(1), _cand(2)], call)
    assert out == "ok"
    assert calls == [1, 2]
    assert result.candidate.mapping_id == 2
    # 第一个候选进入 rest
    assert await ks.get_rest_remaining(1) > 0
    # 成功者无 rest
    assert await ks.get_rest_remaining(2) == 0


@pytest.mark.asyncio
async def test_all_fail_raises_last():
    async def call(c):
        raise Exception(f"fail-{c.mapping_id}")

    with pytest.raises(Exception) as ei:
        await ks.attempt_with_failover([_cand(1), _cand(2)], call)
    assert "fail-2" in str(ei.value)


@pytest.mark.asyncio
async def test_success_clears_rest_and_failures():
    ks._local_fail["1"] = 3

    async def call(c):
        return "ok"

    await ks.attempt_with_failover([_cand(1)], call)
    assert "1" not in ks._local_fail


@pytest.mark.asyncio
async def test_resting_candidate_skipped_when_others_ready():
    # 候选1 在休息（长），候选2 就绪 → 直接走 2
    ks._local_rest["1"] = time.time() + 3600

    calls = []

    async def call(c):
        calls.append(c.mapping_id)
        return "ok"

    out, result = await ks.attempt_with_failover([_cand(1), _cand(2)], call)
    assert out == "ok"
    assert calls == [2]
    assert result.candidate.mapping_id == 2


@pytest.mark.asyncio
async def test_lone_resting_candidate_still_tried():
    # 只有一个候选且在休息 → 仍然尝试（没有别的可走）
    ks._local_rest["1"] = time.time() + 60

    async def call(c):
        return "ok"

    out, _ = await ks.attempt_with_failover([_cand(1)], call)
    assert out == "ok"


@pytest.mark.asyncio
async def test_general_failure_backoff_doubles():
    ks._local_fail["1"] = 2  # 已失败两次

    async def call(c):
        raise Exception("boom")

    with pytest.raises(Exception):
        await ks.attempt_with_failover([_cand(1)], call)
    # 第三次失败 → 1min * 2^2 = 240s
    assert ks._local_fail["1"] == 3
    left = await ks.get_rest_remaining(1)
    assert 230 <= left <= 240


# —— plan_candidates ——

@pytest.mark.asyncio
async def test_plan_candidates_returns_ordered():
    from app.models.api_key import BackendKeyMapping

    m1 = MagicMock(spec=BackendKeyMapping)
    m1.id, m1.backend_key, m1.priority, m1.weight = 11, "k11", 9, 1
    m2 = MagicMock(spec=BackendKeyMapping)
    m2.id, m2.backend_key, m2.priority, m2.weight = 12, "k12", 1, 1

    db = AsyncMock()
    res = MagicMock()
    res.scalars.return_value.all.return_value = [m1, m2]
    db.execute = AsyncMock(return_value=res)

    cands = await ks.plan_candidates(db, frontend_key_id=1, model_type="nano-banana2")
    assert [c.mapping_id for c in cands] == [11, 12]
    assert cands[0].backend_key == "k11"


@pytest.mark.asyncio
async def test_empty_candidates_raises():
    with pytest.raises(RuntimeError):
        await ks.attempt_with_failover([], lambda c: None)
