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
