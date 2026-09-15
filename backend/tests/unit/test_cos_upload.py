"""cos_upload 单元测试 — env 门控 + 降级链（无 COS SDK 依赖）
运行: cd backend && python -m pytest tests/unit/test_cos_upload.py -v --confcutdir=tests/unit
"""
import pytest
from unittest.mock import AsyncMock, patch

from app.services.cos_upload import (
    is_cos_enabled,
    transfer_to_cos,
    transfer_with_fallback,
    _public_base,
)

COS_ENV = {
    "COS_SECRET_ID": "AKIDtest",
    "COS_SECRET_KEY": "testkey",
    "COS_BUCKET": "nanoai-1250000000",
    "COS_REGION": "ap-guangzhou",
}


# ==================== env 门控 ====================

class TestEnabled:
    def test_disabled_when_missing(self, monkeypatch):
        for k in COS_ENV:
            monkeypatch.delenv(k, raising=False)
        assert is_cos_enabled() is False

    def test_disabled_when_partial(self, monkeypatch):
        for k in COS_ENV:
            monkeypatch.delenv(k, raising=False)
        monkeypatch.setenv("COS_SECRET_ID", "x")
        monkeypatch.setenv("COS_SECRET_KEY", "y")
        assert is_cos_enabled() is False

    def test_enabled_when_all_set(self, monkeypatch):
        for k, v in COS_ENV.items():
            monkeypatch.setenv(k, v)
        assert is_cos_enabled() is True


class TestPublicBase:
    def test_default_domain(self, monkeypatch):
        for k, v in COS_ENV.items():
            monkeypatch.setenv(k, v)
        monkeypatch.delenv("COS_BASE_URL", raising=False)
        assert _public_base() == "https://nanoai-1250000000.cos.ap-guangzhou.myqcloud.com"

    def test_custom_cdn(self, monkeypatch):
        for k, v in COS_ENV.items():
            monkeypatch.setenv(k, v)
        monkeypatch.setenv("COS_BASE_URL", "https://cdn.nanoai.fun")
        assert _public_base() == "https://cdn.nanoai.fun"


# ==================== 未配置短路 ====================

class TestTransferDisabled:
    @pytest.mark.asyncio
    async def test_transfer_returns_none_when_disabled(self, monkeypatch):
        for k in COS_ENV:
            monkeypatch.delenv(k, raising=False)
        result = await transfer_to_cos("https://scapi.net/abc.png")
        assert result is None


# ==================== 降级链 ====================

class TestFallbackChain:
    @pytest.mark.asyncio
    async def test_internal_url_passthrough(self, monkeypatch):
        """内部路径（/asset-uploads/xx）不走转存"""
        for k in COS_ENV:
            monkeypatch.delenv(k, raising=False)
        url = await transfer_with_fallback("/asset-uploads/abc.png")
        assert url == "/asset-uploads/abc.png"

    @pytest.mark.asyncio
    async def test_cos_success_used(self, monkeypatch):
        for k, v in COS_ENV.items():
            monkeypatch.setenv(k, v)
        with patch("app.services.cos_upload.transfer_to_cos", new=AsyncMock(return_value="https://cos.example/x.png")):
            url = await transfer_with_fallback("https://scapi.net/abc.png", "tvc/t1/x")
        assert url == "https://cos.example/x.png"

    @pytest.mark.asyncio
    async def test_local_fallback_when_cos_fails(self, monkeypatch):
        for k, v in COS_ENV.items():
            monkeypatch.setenv(k, v)
        with patch("app.services.cos_upload.transfer_to_cos", new=AsyncMock(return_value=None)), \
             patch("app.services.image_downloader.download_image", new=AsyncMock(return_value=("/asset-uploads/local.png", "/asset-uploads/local.png"))):
            url = await transfer_with_fallback("https://scapi.net/abc.png")
        assert url == "/asset-uploads/local.png"

    @pytest.mark.asyncio
    async def test_original_url_when_all_fail(self, monkeypatch):
        for k in COS_ENV:
            monkeypatch.delenv(k, raising=False)
        with patch("app.services.image_downloader.download_image", new=AsyncMock(return_value=("https://scapi.net/abc.png", ""))):
            url = await transfer_with_fallback("https://scapi.net/abc.png")
        # download_image 失败时返回原 URL（其内部约定）
        assert url == "https://scapi.net/abc.png"
