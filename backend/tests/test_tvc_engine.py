"""TVC 引擎测试 — 分镜头拆分 + 积分扣退 + 提示词优化"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

from app.api.v2.tvc_engine import _breakdown_shots, _optimize_prompts


# ==================== 共享 fixture ====================

def _make_shot(i: int, **overrides) -> dict:
    defaults = {
        "start_frame_prompt": f"Shot {i} start",
        "end_frame_prompt": f"Shot {i} end",
        "scene_description": f"镜头{i}",
        "visual_prompt": f"Visual {i}",
    }
    defaults.update(overrides)
    return defaults


def _mock_settings(**overrides) -> MagicMock:
    s = MagicMock()
    s.GLM_API_KEY = "test-glm-key"
    s.GLM_API_BASE_URL = "https://mock-glm.test"
    s.JIMENG_API_KEY = "test-jimeng-key"
    s.JIMENG_API_BASE_URL = "https://mock-jimeng.test"
    s.MINIMAX_API_KEY = "test-mm-key"
    s.MINIMAX_API_BASE_URL = "https://mock-mm.test"
    for k, v in overrides.items():
        setattr(s, k, v)
    return s


# ==================== _breakdown_shots ====================

class TestBreakdownShots:
    def test_normal_shots(self):
        optimized = {"shots": [_make_shot(1), _make_shot(2)]}
        result = _breakdown_shots(optimized, 2, 5)
        assert result["shot_count"] == 2
        assert result["shot_duration"] == 5
        assert len(result["shots"]) == 2

    def test_pad_insufficient_shots(self):
        optimized = {"shots": [_make_shot(1)]}
        result = _breakdown_shots(optimized, 4, 5)
        assert len(result["shots"]) == 4
        assert "镜头2" in result["shots"][1]["scene_description"]
        # 补齐的镜头必须有完整字段
        for shot in result["shots"]:
            assert "start_frame_prompt" in shot
            assert "end_frame_prompt" in shot
            assert "visual_prompt" in shot

    def test_truncate_excess_shots(self):
        optimized = {"shots": [_make_shot(i) for i in range(10)]}
        result = _breakdown_shots(optimized, 3, 5)
        assert len(result["shots"]) == 3

    def test_empty_optimized(self):
        result = _breakdown_shots({"shots": []}, 3, 5)
        assert len(result["shots"]) == 3

    def test_missing_shots_key(self):
        result = _breakdown_shots({}, 2, 5)
        assert len(result["shots"]) == 2

    def test_shot_duration_preserved(self):
        result = _breakdown_shots({"shots": []}, 4, 10)
        assert result["shot_duration"] == 10


# ==================== _optimize_prompts ====================

class TestOptimizePrompts:
    @pytest.mark.asyncio
    async def test_success_returns_shots(self):
        mock_shots = [
            {"start_frame_prompt": "A", "end_frame_prompt": "B", "scene_description": "镜头1", "visual_prompt": "V1"},
            {"start_frame_prompt": "C", "end_frame_prompt": "D", "scene_description": "镜头2", "visual_prompt": "V2"},
        ]
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": json.dumps(mock_shots)}}]
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            req = MagicMock()
            req.style = "realistic"
            req.mode = "cinematic"
            settings = _mock_settings()

            result = await _optimize_prompts({"raw_content": "test script"}, req, settings)
            assert len(result["shots"]) == 2
            assert result["shots"][0]["start_frame_prompt"] == "A"

    @pytest.mark.asyncio
    async def test_no_json_raises(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "No JSON here, just text"}}]
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            req = MagicMock()
            req.style = "realistic"
            req.mode = "cinematic"
            settings = _mock_settings()

            with pytest.raises(Exception, match="无法解析"):
                await _optimize_prompts({"raw_content": "test"}, req, settings)

    @pytest.mark.asyncio
    async def test_api_error_raises(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 500

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            req = MagicMock()
            req.style = "realistic"
            req.mode = "cinematic"
            settings = _mock_settings()

            with pytest.raises(Exception, match="GLM optimize error"):
                await _optimize_prompts({"raw_content": "test"}, req, settings)


# ==================== 积分扣退 ====================

class TestPointsFlow:
    @pytest.mark.asyncio
    async def test_refund_restores_balance(self):
        """退款应恢复余额"""
        mock_account = MagicMock()
        mock_account.balance = 100

        mock_db = AsyncMock()
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)

        with patch("app.database.async_session_maker", return_value=mock_db):
            with patch("app.api.points.get_or_create_user_account", return_value=mock_account):
                from app.api.v2.tvc_engine import refund_points
                await refund_points("user-1", 50)
                assert mock_account.balance == 150
                mock_db.commit.assert_called_once()
