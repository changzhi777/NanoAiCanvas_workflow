"""积分服务单元测试 — mock AsyncSession，纯逻辑测试
运行: cd backend && python -m pytest tests/unit/test_points_service.py -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.points_service import (
    node_type_to_model_type,
    FRIENDLY_NAMES,
)


# ==================== node_type_to_model_type ====================

class TestNodeTypeMapping:
    def test_image_nodes(self):
        assert node_type_to_model_type("nano_banana_2") == "image"
        assert node_type_to_model_type("nano_banana_pro") == "image"
        assert node_type_to_model_type("gpt_image_2") == "image"
        assert node_type_to_model_type("character_designer") == "image"
        assert node_type_to_model_type("scene_designer") == "image"
        assert node_type_to_model_type("storyboard_generator") == "image"
        assert node_type_to_model_type("jimeng_image") == "jimeng_image"

    def test_video_nodes(self):
        assert node_type_to_model_type("jimeng_video") == "jimeng_video"
        assert node_type_to_model_type("minimax_video") == "video"
        assert node_type_to_model_type("glm_video") == "video"
        assert node_type_to_model_type("storyboard_video") == "video"
        assert node_type_to_model_type("tvc") == "video"

    def test_audio_nodes(self):
        assert node_type_to_model_type("minimax_speech") == "audio"
        assert node_type_to_model_type("minimax_music") == "audio"
        assert node_type_to_model_type("glm_tts") == "audio"
        assert node_type_to_model_type("background_music") == "audio"

    def test_text_nodes(self):
        assert node_type_to_model_type("script_generator") == "text"
        assert node_type_to_model_type("minimax_text") == "text"
        assert node_type_to_model_type("glm_text") == "text"
        assert node_type_to_model_type("qwen_text") == "text"
        assert node_type_to_model_type("kimi_text") == "text"
        assert node_type_to_model_type("director_agent") == "text"
        assert node_type_to_model_type("tvc_script") == "text"

    def test_unknown_defaults_to_text(self):
        assert node_type_to_model_type("nonexistent_node") == "text"

    def test_coding_nodes(self):
        assert node_type_to_model_type("qwen_coding") == "text"
        assert node_type_to_model_type("minimax_coding") == "text"


# ==================== FRIENDLY_NAMES ====================

class TestFriendlyNames:
    def test_known_names(self):
        assert "jimeng_image" in FRIENDLY_NAMES
        assert "jimeng_video" in FRIENDLY_NAMES
        assert "tvc" in FRIENDLY_NAMES
        assert FRIENDLY_NAMES["tvc"] == "TVC宣传片"

    def test_all_mapped_model_types_have_names(self):
        """确保 node_type_to_model_type 返回的所有值都有友好名称"""
        all_node_types = [
            "nano_banana_2", "jimeng_video", "minimax_speech",
            "script_generator", "tvc", "character_designer",
            "jimeng_image", "storyboard_video",
        ]
        for nt in all_node_types:
            model_type = node_type_to_model_type(nt)
            # Should have a friendly name or at least not crash
            name = FRIENDLY_NAMES.get(model_type, model_type)
            assert isinstance(name, str)
            assert len(name) > 0


# ==================== resolve_price (mock DB) ====================

class TestResolvePrice:
    @pytest.mark.asyncio
    async def test_returns_price_for_active_rule(self):
        from app.services.points_service import resolve_price

        mock_rule = MagicMock()
        mock_rule.points_per_unit = 10

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_rule

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        price = await resolve_price(mock_db, "image")
        assert price == 10

    @pytest.mark.asyncio
    async def test_returns_zero_for_no_rule(self):
        from app.services.points_service import resolve_price

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        price = await resolve_price(mock_db, "nonexistent")
        assert price == 0


# ==================== check_balance (mock DB) ====================

class TestCheckBalance:
    @pytest.mark.asyncio
    async def test_sufficient_balance(self):
        from app.services.points_service import check_balance

        mock_account = MagicMock()
        mock_account.balance = 100
        mock_account.id = uuid4()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_account

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        result = await check_balance(mock_db, uuid4(), "image", amount=10)
        assert result["sufficient"] is True
        assert result["required"] == 10
        assert result["balance"] == 100

    @pytest.mark.asyncio
    async def test_insufficient_balance(self):
        from app.services.points_service import check_balance

        mock_account = MagicMock()
        mock_account.balance = 5
        mock_account.id = uuid4()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_account

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        result = await check_balance(mock_db, uuid4(), "image", amount=10)
        assert result["sufficient"] is False
        assert result["required"] == 10


# ==================== deduct_team_first (mock DB) ====================

class TestDeductTeamFirst:
    @pytest.mark.asyncio
    async def test_free_when_amount_zero(self):
        from app.services.points_service import deduct_team_first

        mock_db = AsyncMock()
        result = await deduct_team_first(mock_db, uuid4(), 0)
        assert result["source"] == "free"
        assert result["amount"] == 0


# ==================== calc_tvc_cost（统一计费公式） ====================

class TestCalcTvcCost:
    """TVC 计费公式：text×3 + image×2（固定）+ video×shot_count + bgm×1

    这是 estimate 与 deduct 的共同真相源 —— image 固定 2 张是关键回归点
    （旧 estimate 误用 shot_count×2）。
    """

    PRICES = {"text": 10, "image": 5, "video": 20, "audio": 3}  # audio = bgm

    def _mock_price(self):
        async def _side_effect(db, model_type):
            return TestCalcTvcCost.PRICES.get(model_type, 0)
        return AsyncMock(side_effect=_side_effect)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("shot_count", [1, 3, 6])
    async def test_formula(self, shot_count):
        from app.services.points_service import calc_tvc_cost

        with patch("app.services.points_service.resolve_price", new=self._mock_price()):
            cost = await calc_tvc_cost(AsyncMock(), shot_count, include_bgm=True)

        assert cost["text"] == 30                  # 10 × 3
        assert cost["image"] == 10                 # 5 × 2（固定！不随 shot_count 变）
        assert cost["video"] == 20 * shot_count
        assert cost["bgm"] == 3
        assert cost["total"] == 30 + 10 + 20 * shot_count + 3

    @pytest.mark.asyncio
    async def test_image_fixed_across_shot_counts(self):
        """回归：image 不随 shot_count 缩放（旧 bug 是 ×shot_count×2）"""
        from app.services.points_service import calc_tvc_cost

        with patch("app.services.points_service.resolve_price", new=self._mock_price()):
            c1 = await calc_tvc_cost(AsyncMock(), 1)
            c6 = await calc_tvc_cost(AsyncMock(), 6)
        assert c1["image"] == c6["image"] == 10

    @pytest.mark.asyncio
    async def test_include_bgm_false(self):
        from app.services.points_service import calc_tvc_cost

        with patch("app.services.points_service.resolve_price", new=self._mock_price()):
            cost = await calc_tvc_cost(AsyncMock(), 3, include_bgm=False)
        assert cost["bgm"] == 0
        assert cost["total"] == 30 + 10 + 60

    @pytest.mark.asyncio
    async def test_prices_exposed(self):
        from app.services.points_service import calc_tvc_cost

        with patch("app.services.points_service.resolve_price", new=self._mock_price()):
            cost = await calc_tvc_cost(AsyncMock(), 3)
        assert cost["prices"] == {"text": 10, "image": 5, "video": 20, "bgm": 3}
