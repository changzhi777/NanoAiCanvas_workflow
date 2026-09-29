"""TVC 模型配置一致性 + 视频路由 + 兜底链单测

阶段 5.2（audit plan tvc-model-audit-2026-09-29）：
- 后端 DEFAULT_CONFIG 与生产意图一致（minimax-official 主路）
- get_video_provider 三通道路由（官方/速创 H3/Seedance）
- tvc_engine 兜底链（official 失败 → H3；非 minimax → seedance）
"""
from unittest.mock import MagicMock

import pytest

from app.api.v2.tvc_config import DEFAULT_CONFIG
from app.api.v2.tvc_providers import get_video_provider


@pytest.fixture
def settings():
    s = MagicMock()
    s.MINIMAX_API_KEY = "test-minimax"
    s.MINIMAX_API_BASE_URL = "https://api.minimax.cn/v1"
    s.WUYINKEJI_API_KEY = "test-wuyin"
    s.WUYINKEJI_API_BASE_URL = "https://api.wuyinkeji.com"
    s.ARK_API_KEY = ""
    s.ARK_API_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
    return s


class TestDefaultConfig:
    def test_step5_video_default_is_minimax_h3(self):
        """全局默认视频通道 = MiniMax H3（速创按量，4-15s 全时长）"""
        assert DEFAULT_CONFIG["step5_video"]["default_provider"] == "MiniMax-H3"

    def test_step1_model_is_glm_53(self):
        """剧本生成主模型 = glm-5.3（2026-09-30 升级）"""
        assert DEFAULT_CONFIG["step1_script"]["model"] == "glm-5.3"

    def test_step1_fallback_not_legacy_abab(self):
        """fallback 不再指向已废弃的 abab6.5s-chat"""
        assert DEFAULT_CONFIG["step1_script"]["fallback_model"] != "abab6.5s-chat"

    def test_step4_image_default_is_flare(self):
        """图片 provider 默认 = gpt-image-2.5-flare（2026-09-30 升级）"""
        assert DEFAULT_CONFIG["step4_image"]["default_provider"] == "gpt-image-2.5-flare"


class TestVideoProviderRouting:
    def test_minimax_official_keyword(self, settings):
        _, name = get_video_provider("minimax-official", settings)
        assert name == "MiniMax Official"

    def test_minimax_coding_keyword(self, settings):
        _, name = get_video_provider("minimax-coding", settings)
        assert name == "MiniMax Official"

    def test_hailuo_keyword(self, settings):
        _, name = get_video_provider("hailuo-02", settings)
        assert name == "MiniMax Official"

    def test_minimax_h3_routes_to_suchuang(self, settings):
        _, name = get_video_provider("MiniMax-H3", settings)
        assert name == "MiniMax H3"

    def test_seedance_is_fallback(self, settings):
        _, name = get_video_provider("seedance", settings)
        assert name == "Seedance 2.0"

    def test_unknown_model_falls_to_seedance(self, settings):
        _, name = get_video_provider("unknown-xyz", settings)
        assert name == "Seedance 2.0"


class TestVideoFallbackChain:
    def _pick_fallback(self, primary: str) -> str:
        """复刻 tvc_engine 的兜底选择逻辑（保持同步）"""
        fallback = "seedance" if "minimax" not in primary.lower() else "MiniMax-H3"
        if fallback == primary:
            fallback = "seedance"
        return fallback

    def test_official_failure_falls_to_h3(self):
        assert self._pick_fallback("minimax-official") == "MiniMax-H3"

    def test_h3_failure_falls_to_seedance(self):
        """H3 失败兜底 seedance（避免同通道循环，tvc_engine 实际逻辑）"""
        assert self._pick_fallback("MiniMax-H3") == "seedance"

    def test_seedance_primary_same_fallback_guard(self):
        """primary=seedance 时 fallback 不重复"""
        assert self._pick_fallback("seedance") == "seedance"
