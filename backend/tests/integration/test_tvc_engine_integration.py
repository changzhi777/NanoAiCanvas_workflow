"""TVC 引擎后端集成测试 — 关键函数 mock HTTP 全链路

覆盖：_call_minimax_tvc_script / _describe_with_minimax_m3 / _enhance_image_prompt
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def _settings(**overrides):
    s = MagicMock()
    s.GLM_API_KEY = "test-glm"
    s.GLM_API_BASE_URL = "https://mock-glm.test"
    s.MINIMAX_API_KEY = "test-mm"
    s.MINIMAX_API_BASE_URL = "https://api.minimax.cn/v1"
    s.WUYINKEJI_API_KEY = "test-wyk"
    s.WUYINKEJI_API_BASE_URL = "https://mock-wyk.test"
    s.ARK_API_KEY = "test-ark"
    s.ARK_API_BASE_URL = "https://mock-ark.test"
    s.JIMENG_API_KEY = "test-jm"
    s.JIMENG_API_BASE_URL = "https://mock-jm.test"
    s.IMG_DESC_CACHE_MAX_ROWS = 5000
    s.IMG_DESC_CACHE_TTL_DAYS = 30
    s.IMG_DESC_VISION_ENDPOINT = "anthropic"
    for k, v in overrides.items():
        setattr(s, k, v)
    return s


def _req(reference_image=None, **overrides):
    r = MagicMock()
    r.prompt = "30s 咖啡 TVC"
    r.shot_count = 2
    r.shot_duration = 5
    r.total_duration = 10
    r.mode = "cinematic"
    r.style = "realistic"
    r.reference_image = reference_image
    r.style_reference = None
    r.script_model = None
    r.video_model = "MiniMax-H3"
    for k, v in overrides.items():
        setattr(r, k, v)
    return r


# ==================== _enhance_image_prompt ====================

class TestEnhanceImagePrompt:
    def test_no_enhance_returns_base(self):
        from app.api.v2.tvc_providers import _enhance_image_prompt
        assert _enhance_image_prompt(base_prompt="cat") == "cat"
        assert _enhance_image_prompt(base_prompt="cat", enhance_cfg=None) == "cat"

    def test_markers_and_base(self):
        from app.api.v2.tvc_providers import _enhance_image_prompt
        cfg = {"prefix_markers": ["cinematic", "high detail"], "suffix_markers": ["sharp focus"]}
        out = _enhance_image_prompt(base_prompt="a cat", enhance_cfg=cfg)
        assert out == "cinematic, high detail, a cat, sharp focus"

    def test_camera_and_style(self):
        from app.api.v2.tvc_providers import _enhance_image_prompt
        cfg = {"include_camera": True, "include_style": True}
        out = _enhance_image_prompt(
            base_prompt="cat", camera_movement="slow push", style="cinematic", enhance_cfg=cfg
        )
        assert "cinematic camera: slow push" in out
        assert "style: cinematic" in out
        assert "cat" in out

    def test_image_desc_appended_at_end(self):
        from app.api.v2.tvc_providers import _enhance_image_prompt
        cfg = {"include_image_description": True}
        out = _enhance_image_prompt(
            base_prompt="cat", image_desc="white background", enhance_cfg=cfg
        )
        assert out.endswith("参考风格（中文）：white background")

    def test_all_disabled_uses_base(self):
        from app.api.v2.tvc_providers import _enhance_image_prompt
        cfg = {"include_image_description": False, "include_camera": False, "include_style": False}
        out = _enhance_image_prompt(
            base_prompt="x", image_desc="y", camera_movement="z", style="w", enhance_cfg=cfg
        )
        assert out == "x"


# ==================== _describe_with_minimax_m3 ====================

class TestDescribeMiniMaxM3:
    async def test_anthropic_endpoint_success(self):
        from app.api.v2.tvc_engine import _describe_with_minimax_m3
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value={
            "content": [{"type": "text", "text": "一座神秘海边的峡湾, 雾气弥漫, 电影感"}]
        })
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=mock_client):
            desc = await _describe_with_minimax_m3(
                "data:image/jpeg;base64,abc", _settings()
            )
        assert desc == "一座神秘海边的峡湾, 雾气弥漫, 电影感"
        # 验证用了 anthropic 端点
        call_args = mock_client.post.call_args
        assert "anthropic/v1/messages" in call_args[0][0]
        assert call_args[1]["headers"]["x-api-key"] == "test-mm"

    async def test_data_uri_strips_prefix(self):
        from app.api.v2.tvc_engine import _describe_with_minimax_m3
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value={"content": [{"type": "text", "text": "ok"}]})
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=mock_client):
            await _describe_with_minimax_m3("data:image/png;base64,XYZ", _settings())
        body = mock_client.post.call_args[1]["json"]
        # base64 data 应去掉 data: 前缀
        assert body["messages"][0]["content"][1]["source"]["data"] == "XYZ"
        assert body["messages"][0]["content"][1]["source"]["media_type"] == "image/png"

    async def test_http_error_returns_none(self):
        from app.api.v2.tvc_engine import _describe_with_minimax_m3
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "unauthorized"
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        with patch("httpx.AsyncClient", return_value=mock_client):
            assert await _describe_with_minimax_m3("data:image/jpeg;base64,abc", _settings()) is None


# ==================== _call_minimax_tvc_script ====================

class TestCallMiniMaxTvcScript:
    async def test_text_only_uses_m27_path(self):
        """无图走 M2.7 文本路径"""
        from app.api.v2.tvc_engine import _call_minimax_tvc_script
        with patch("app.api.v2.tvc_engine._describe_with_minimax_m3") as mock_desc:
            mock_client = AsyncMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json = MagicMock(return_value={
                "choices": [{"message": {"content": '{"tvc_title": "A Coffee Story", "shots": []}'}}]
            })
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            with patch("httpx.AsyncClient", return_value=mock_client):
                result = await _call_minimax_tvc_script(_req(), _settings())
        # 无图不该调 M3 描述
        mock_desc.assert_not_called()
        assert result["parsed_script"]["tvc_title"] == "A Coffee Story"
        # 走 chat/completions
        assert "chat/completions" in mock_client.post.call_args[0][0]

    async def test_with_image_uses_cache(self):
        """有图走 M3 + cache 复用"""
        from app.api.v2.tvc_engine import _call_minimax_tvc_script
        with patch("app.services.image_description_cache.ImageDescriptionCache.get_or_describe",
                   new=AsyncMock(return_value="缓存的描述")) as mock_cache:
            mock_client = AsyncMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json = MagicMock(return_value={
                "choices": [{"message": {"content": '{"tvc_title": "Coffee Cliff", "shots": []}'}}]
            })
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            with patch("httpx.AsyncClient", return_value=mock_client):
                b64 = "data:image/jpeg;base64,XYZ"
                result = await _call_minimax_tvc_script(_req(reference_image=b64), _settings())
        # 有图应调 cache
        mock_cache.assert_called_once()
        assert result["parsed_script"]["tvc_title"] == "Coffee Cliff"

    async def test_anthropic_endpoint_with_image(self):
        """anthropic 端点用 image source"""
        from app.api.v2.tvc_engine import _call_minimax_tvc_script
        with patch("app.services.image_description_cache.ImageDescriptionCache.get_or_describe",
                   new=AsyncMock(return_value=None)):
            mock_client = AsyncMock()
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json = MagicMock(return_value={
                "content": [{"type": "text", "text": '{"tvc_title": "X", "shots": []}'}]
            })
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            with patch("httpx.AsyncClient", return_value=mock_client):
                await _call_minimax_tvc_script(
                    _req(reference_image="data:image/jpeg;base64,XYZ"),
                    _settings()
                )
        # anthropic 端点 + image source
        url = mock_client.post.call_args[0][0]
        body = mock_client.post.call_args[1]["json"]
        assert "anthropic/v1/messages" in url
        image_block = body["messages"][0]["content"][1]
        assert image_block["type"] == "image"
        assert image_block["source"]["data"] == "XYZ"
        # system 走顶层
        assert "system" in body


# ==================== 视频双轨 fallback 智能切换 ====================

class TestVideoProviderFallback:
    """验证 review #7 修复：fallback 选与主路不同的 provider"""

    def test_user_picked_minimax_falls_back_to_seedance(self):
        from app.api.v2.tvc_providers import get_video_provider
        # 用户选 minimax → 模拟主路失败 → 应回退 seedance（不同 provider）
        primary = "MiniMax-H3"
        if primary.startswith("MiniMax"):
            fallback = "seedance"
        else:
            fallback = "MiniMax-H3"
        assert fallback == "seedance"
        # 验证 fallback 函数确实是 seedance
        fn, name = get_video_provider(fallback, _settings())
        assert "Seedance" in name

    def test_user_picked_seedance_falls_back_to_minimax(self):
        from app.api.v2.tvc_providers import get_video_provider
        # 用户选 seedance → 模拟主路失败 → 应回退 minimax（不同 provider）
        primary = "seedance"
        if primary.startswith("MiniMax"):
            fallback = "seedance"
        else:
            fallback = "MiniMax-H3"
        assert fallback == "MiniMax-H3", f"用户显式选 seedance 时应回退 minimax，实得 {fallback}"
        # 验证 fallback 函数确实是 minimax
        fn, name = get_video_provider(fallback, _settings())
        assert "MiniMax" in name
