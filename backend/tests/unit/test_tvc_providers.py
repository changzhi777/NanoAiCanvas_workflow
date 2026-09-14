"""TVC Provider 工厂 + Provider 函数行为测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.v2.tvc_providers import (
    get_image_provider, get_video_provider,
    _gen_one_jimeng, _gen_one_gpt_image_2, _gen_one_minimax,
    _submit_video_seedance, _submit_video_minimax, _enhance_image_prompt,
)


# ==================== Prompt 增强 ====================

class TestEnhanceImagePrompt:
    def test_no_enhance_cfg_returns_base(self):
        assert _enhance_image_prompt(base_prompt="base") == "base"
        assert _enhance_image_prompt(base_prompt="base", enhance_cfg=None) == "base"

    def test_markers_and_base_concatenated(self):
        cfg = {
            "prefix_markers": ["cinematic", "high detail"],
            "suffix_markers": ["sharp focus"],
        }
        out = _enhance_image_prompt(base_prompt="a cat", enhance_cfg=cfg)
        assert out == "cinematic, high detail, a cat, sharp focus"

    def test_camera_and_style_included_when_provided(self):
        cfg = {
            "include_camera": True,
            "include_style": True,
        }
        out = _enhance_image_prompt(
            base_prompt="cat", camera_movement="slow push", style="cinematic", enhance_cfg=cfg
        )
        assert "cinematic camera: slow push" in out
        assert "style: cinematic" in out
        assert "cat" in out

    def test_image_desc_appended_at_end(self):
        cfg = {"include_image_description": True}
        out = _enhance_image_prompt(
            base_prompt="cat", image_desc="white background", enhance_cfg=cfg
        )
        # 中文描述独立段，避免污染 marker 列表
        assert out.endswith("参考风格（中文）：white background")
        assert "white background" in out

    def test_disable_all_flags_still_uses_base(self):
        cfg = {"include_image_description": False, "include_camera": False, "include_style": False}
        out = _enhance_image_prompt(
            base_prompt="x", image_desc="y", camera_movement="z", style="w", enhance_cfg=cfg
        )
        # 仅 base prompt
        assert out == "x"


# ==================== 工厂函数 ====================

class TestGetImageProvider:
    def test_default_returns_jimeng(self):
        settings = MagicMock()
        settings.JIMENG_API_KEY = "test-key"
        settings.JIMENG_API_BASE_URL = "https://mock.jimeng.test"

        provider = get_image_provider("jimeng", settings)
        assert callable(provider)

    def test_gpt_image_2_returns_correct_provider(self):
        settings = MagicMock()
        settings.WUYINKEJI_API_KEY = "test-key"
        settings.WUYINKEJI_API_BASE_URL = "https://mock.wuyin.test"

        provider = get_image_provider("gpt-image-2", settings)
        assert callable(provider)

    def test_minimax_returns_correct_provider(self):
        settings = MagicMock()
        settings.MINIMAX_API_KEY = "test-key"
        settings.MINIMAX_API_BASE_URL = "https://mock.minimax.test"

        provider = get_image_provider("minimax", settings)
        assert callable(provider)

    def test_unknown_model_defaults_to_jimeng(self):
        settings = MagicMock()
        settings.JIMENG_API_KEY = "test-key"
        settings.JIMENG_API_BASE_URL = "https://mock.jimeng.test"

        provider = get_image_provider("unknown-model", settings)
        assert callable(provider)


class TestGetVideoProvider:
    @pytest.mark.parametrize("video_model,expected_name", [
        ("jimeng", "Seedance 2.0"),
        ("seedance", "Seedance 2.0"),
        ("MiniMax-H3", "MiniMax H3"),
        ("glm", "Seedance 2.0"),
    ])
    def test_returns_correct_provider_name(self, video_model, expected_name):
        settings = MagicMock()
        settings.ARK_API_KEY = "test-ark"
        settings.ARK_API_BASE_URL = "https://mock.ark.test"
        settings.MINIMAX_API_KEY = "test-mm"
        settings.MINIMAX_API_BASE_URL = "https://mock.mm.test"
        settings.GLM_API_KEY = "test-glm"
        settings.GLM_API_BASE_URL = "https://mock.glm.test"

        provider, name = get_video_provider(video_model, settings)
        assert callable(provider)
        assert name == expected_name

    def test_unknown_defaults_to_seedance(self):
        settings = MagicMock()
        settings.ARK_API_KEY = "test"
        settings.ARK_API_BASE_URL = "https://mock.test"

        provider, name = get_video_provider("unknown", settings)
        assert name == "Seedance 2.0"


# ==================== 图片 Provider 行为测试 ====================

class TestJimengProvider:
    @pytest.mark.asyncio
    async def test_no_api_key_returns_placeholder(self):
        settings = MagicMock()
        settings.JIMENG_API_KEY = None
        settings.JIMENG_API_BASE_URL = "https://mock.test"

        gen = _gen_one_jimeng(settings)
        result = await gen({"id": "shot-1"}, "a beautiful sunset")
        assert result["image_url"] == "placeholder_shot-1.png"

    @pytest.mark.asyncio
    async def test_success_returns_image_url(self):
        settings = MagicMock()
        settings.JIMENG_API_KEY = "test-key"
        settings.JIMENG_API_BASE_URL = "https://mock.test"

        gen = _gen_one_jimeng(settings)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": {"image_url": "https://cdn.test/img.png"}}

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            result = await gen({"id": "shot-1"}, "sunset")
            assert result["image_url"] == "https://cdn.test/img.png"

    @pytest.mark.asyncio
    async def test_api_error_raises(self):
        settings = MagicMock()
        settings.JIMENG_API_KEY = "test-key"
        settings.JIMENG_API_BASE_URL = "https://mock.test"

        gen = _gen_one_jimeng(settings)

        mock_resp = MagicMock()
        mock_resp.status_code = 500

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            with pytest.raises(Exception, match="Jimeng image error: 500"):
                await gen({"id": "shot-1"}, "sunset")


class TestMinimaxProvider:
    @pytest.mark.asyncio
    async def test_success_returns_image_url(self):
        settings = MagicMock()
        settings.MINIMAX_API_KEY = "test-key"
        settings.MINIMAX_API_BASE_URL = "https://mock.test"

        gen = _gen_one_minimax(settings)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "base_resp": {"status_code": 0},
            "data": {"image_urls": ["https://cdn.test/mm-img.png"]},
        }

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            result = await gen({"id": "shot-2"}, "ocean view")
            assert result["image_url"] == "https://cdn.test/mm-img.png"

    @pytest.mark.asyncio
    async def test_api_error_raises(self):
        settings = MagicMock()
        settings.MINIMAX_API_KEY = "test-key"
        settings.MINIMAX_API_BASE_URL = "https://mock.test"

        gen = _gen_one_minimax(settings)

        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.text = "forbidden"

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            with pytest.raises(Exception, match="MiniMax image error: 403"):
                await gen({"id": "shot-2"}, "ocean")

    @pytest.mark.asyncio
    async def test_no_urls_raises(self):
        settings = MagicMock()
        settings.MINIMAX_API_KEY = "test-key"
        settings.MINIMAX_API_BASE_URL = "https://mock.test"

        gen = _gen_one_minimax(settings)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "base_resp": {"status_code": 0},
            "data": {"image_urls": []},
        }
        mock_resp.text = "{}"

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_resp
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            with pytest.raises(Exception, match="No image_urls"):
                await gen({"id": "shot-2"}, "ocean")


# ==================== 视频 Provider 行为测试 ====================

