"""工作流执行器单元测试 — mock Redis，纯逻辑测试
运行: cd backend && python -m pytest tests/unit/test_workflow_executor.py -v
"""
import pytest
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.workflow_executor import (
    _task_key,
    _channel,
    _recalc_progress,
    TASK_PREFIX,
    TASK_TTL,
    CHANNEL_PREFIX,
)


# ==================== Key 格式 ====================

class TestKeyFormats:
    def test_task_key(self):
        assert _task_key("abc123") == f"{TASK_PREFIX}abc123"

    def test_channel(self):
        assert _channel("abc123") == f"{CHANNEL_PREFIX}abc123"


# ==================== 进度计算 ====================

class TestRecalcProgress:
    def test_all_success(self):
        state = {
            "nodes": [
                {"status": "success"},
                {"status": "success"},
                {"status": "success"},
            ]
        }
        _recalc_progress(state)
        assert state["overall_progress"] == 100

    def test_no_success(self):
        state = {
            "nodes": [
                {"status": "pending"},
                {"status": "pending"},
            ]
        }
        _recalc_progress(state)
        assert state["overall_progress"] == 0

    def test_partial_success(self):
        state = {
            "nodes": [
                {"status": "success"},
                {"status": "pending"},
            ]
        }
        _recalc_progress(state)
        assert state["overall_progress"] == 50

    def test_running_node_with_progress(self):
        state = {
            "nodes": [
                {"status": "success"},
                {"status": "running", "progress": 80},
                {"status": "pending"},
            ]
        }
        _recalc_progress(state)
        # 1/3 done = 33% + running_progress(80/3=26) ≈ 59, capped at 99
        assert 30 < state["overall_progress"] < 99

    def test_empty_nodes(self):
        state = {"nodes": []}
        _recalc_progress(state)
        assert state["overall_progress"] == 0

    def test_progress_capped_at_99_when_running(self):
        """When running, progress should never reach 100"""
        state = {
            "nodes": [
                {"status": "success"},
                {"status": "running", "progress": 100},
            ]
        }
        _recalc_progress(state)
        assert state["overall_progress"] <= 99


# ==================== create_task (mock Redis) ====================

class TestCreateTask:
    @pytest.mark.asyncio
    async def test_creates_task_with_correct_state(self):
        with patch("app.services.workflow_executor.redis_client") as mock_redis:
            mock_redis.setex = AsyncMock()
            mock_redis.publish = AsyncMock()

            from app.services.workflow_executor import create_task

            nodes = [{"id": "n1", "status": "pending"}]
            state = await create_task("task1", "wf1", nodes)

            assert state["task_id"] == "task1"
            assert state["workflow_id"] == "wf1"
            assert state["status"] == "submitted"
            assert state["overall_progress"] == 0
            assert state["nodes"] == nodes
            assert "created_at" in state

            # Verify Redis was called
            mock_redis.setex.assert_called_once()
            mock_redis.publish.assert_called_once()

            # Verify TTL
            call_args = mock_redis.setex.call_args
            assert call_args[0][1] == TASK_TTL


# ==================== complete_task (mock Redis) ====================

class TestCompleteTask:
    @pytest.mark.asyncio
    async def test_marks_completed(self):
        with patch("app.services.workflow_executor.redis_client") as mock_redis:
            saved_state = {
                "task_id": "task1",
                "status": "running",
                "overall_progress": 80,
                "nodes": [],
            }
            mock_redis.get = AsyncMock(return_value=json.dumps(saved_state))
            mock_redis.setex = AsyncMock()
            mock_redis.publish = AsyncMock()

            from app.services.workflow_executor import complete_task

            await complete_task("task1")

            # Verify saved state has completed status
            setex_call = mock_redis.setex.call_args
            saved = json.loads(setex_call[0][2])
            assert saved["status"] == "completed"
            assert saved["overall_progress"] == 100
            assert "completed_at" in saved

    @pytest.mark.asyncio
    async def test_marks_failed(self):
        with patch("app.services.workflow_executor.redis_client") as mock_redis:
            saved_state = {
                "task_id": "task1",
                "status": "running",
                "overall_progress": 30,
                "nodes": [],
            }
            mock_redis.get = AsyncMock(return_value=json.dumps(saved_state))
            mock_redis.setex = AsyncMock()
            mock_redis.publish = AsyncMock()

            from app.services.workflow_executor import fail_task

            await fail_task("task1", "API timeout")

            setex_call = mock_redis.setex.call_args
            saved = json.loads(setex_call[0][2])
            assert saved["status"] == "failed"
            assert saved["error"] == "API timeout"

    @pytest.mark.asyncio
    async def test_handles_missing_task(self):
        with patch("app.services.workflow_executor.redis_client") as mock_redis:
            mock_redis.get = AsyncMock(return_value=None)

            from app.services.workflow_executor import complete_task

            # Should not crash
            await complete_task("nonexistent")


# ==================== ETA 计算 ====================

class TestComputeEta:
    """_compute_eta：分步权重线性外推 + EMA 平滑"""

    def _state(self, elapsed, nodes, **kw):
        import time as _t
        base = {
            "status": "running",
            "started_at": _t.time() - elapsed,
            "nodes": nodes,
        }
        base.update(kw)
        return base

    def _node(self, ntype, status, progress=100):
        return {"id": f"step-{ntype}", "type": ntype, "status": status, "progress": progress}

    def test_no_started_at(self):
        from app.services.workflow_executor import _compute_eta
        r = _compute_eta({"nodes": []})
        assert r["eta_seconds"] is None

    def test_too_early_returns_none(self):
        from app.services.workflow_executor import _compute_eta
        r = _compute_eta(self._state(5, [self._node("script", "running", 10)]))
        assert r["eta_seconds"] is None
        assert r["eta_confidence"] == "low"

    def test_after_script_done(self):
        from app.services.workflow_executor import _compute_eta
        # script(0.15) 完成，elapsed=20 → eta = 20 × 0.85/0.15 ≈ 113
        r = _compute_eta(self._state(20, [self._node("script", "success")]))
        assert r["eta_seconds"] is not None
        assert 100 <= r["eta_seconds"] <= 130

    def test_ema_smoothing(self):
        from app.services.workflow_executor import _compute_eta
        # prev=200，新算值≈113 → 0.7×200 + 0.3×113 ≈ 174
        r = _compute_eta(self._state(20, [self._node("script", "success")], eta_seconds=200))
        assert 165 <= r["eta_seconds"] <= 185

    def test_completed_terminal(self):
        from app.services.workflow_executor import _compute_eta
        r = _compute_eta(self._state(60, [self._node("script", "success")], status="completed"))
        assert r["eta_seconds"] == 0
        assert r["eta_confidence"] == "high"

    def test_confidence_grading(self):
        from app.services.workflow_executor import _compute_eta
        r1 = _compute_eta(self._state(20, [self._node("script", "success")]))
        assert r1["eta_confidence"] == "low"
        r2 = _compute_eta(self._state(60, [
            self._node("script", "success"),
            self._node("optimize", "success"),
            self._node("breakdown", "success"),
        ]))
        assert r2["eta_confidence"] == "mid"
        r3 = _compute_eta(self._state(300, [
            self._node("script", "success"),
            self._node("optimize", "success"),
            self._node("breakdown", "success"),
            self._node("images", "success"),
        ]))
        assert r3["eta_confidence"] == "high"

    def test_clamp_bounds(self):
        from app.services.workflow_executor import _compute_eta
        r = _compute_eta(self._state(10000, [self._node("script", "success")]))
        assert r["eta_seconds"] <= 3600

    def test_running_half_weight(self):
        from app.services.workflow_executor import _compute_eta
        r = _compute_eta(self._state(30, [self._node("script", "running", 100)]))
        assert r["eta_seconds"] is None
