"""模型扫描服务单元测试 — mock httpx
运行: cd backend && python -m pytest tests/unit/test_model_scanner.py -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.model_scanner import (
    WUYINKEJI_KNOWN_MODELS,
    scan_models_for_key,
)


class TestWuyinkejiKnownModels:
    def test_has_known_models(self):
        assert len(WUYINKEJI_KNOWN_MODELS) > 0

    def test_model_format(self):
        """Each model should be (name, endpoint) tuple"""
        for model_name, endpoint in WUYINKEJI_KNOWN_MODELS:
            assert isinstance(model_name, str)
            assert isinstance(endpoint, str)
            assert endpoint.startswith("/api/")


class TestScanModelsForKey:
    @pytest.mark.asyncio
    async def test_returns_empty_for_no_provider(self):
        """Should return empty list if provider is None"""
        key = MagicMock()
        result = await scan_models_for_key(key, None)
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_base_url(self):
        """Should return empty list if provider has no api_base_url"""
        key = MagicMock()
        provider = MagicMock()
        provider.api_base_url = None
        result = await scan_models_for_key(key, provider)
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_on_scan_failure(self):
        """Should return empty list on exception"""
        key = MagicMock()
        key.id = "test-key"
        key.api_key = "test"
        provider = MagicMock()
        provider.code = "unknown"
        provider.api_base_url = "http://invalid"

        with patch("app.services.model_scanner._scan_openai_compatible", new_callable=AsyncMock) as mock_scan:
            mock_scan.side_effect = Exception("Connection failed")
            result = await scan_models_for_key(key, provider)
            assert result == []


class TestOpenAICompatibleScan:
    @pytest.mark.asyncio
    async def test_parses_models_response(self):
        """Should parse /models response correctly"""
        from app.services.model_scanner import _scan_openai_compatible

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {"id": "glm-4"},
                {"id": "glm-5"},
            ]
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await _scan_openai_compatible("http://api.test", "key", "glm")
            assert result == ["glm-4", "glm-5"]

    @pytest.mark.asyncio
    async def test_handles_error_response(self):
        """Should return empty list on non-200 response"""
        from app.services.model_scanner import _scan_openai_compatible

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": "unauthorized"}

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await _scan_openai_compatible("http://api.test", "bad-key", "test")
            assert result == []
