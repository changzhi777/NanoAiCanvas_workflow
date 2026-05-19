"""Agent tests conftest — 提供真实 SQLAlchemy Base（无 DB 连接）+ mock Redis/Config"""
import sys
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy.orm import DeclarativeBase

# 提供 SQLAlchemy Base（不触发 asyncpg）
class _TestBase(DeclarativeBase):
    pass

mock_db_module = MagicMock()
mock_db_module.Base = _TestBase
mock_db_module.async_session_maker = MagicMock()
mock_db_module.get_db = MagicMock()
sys.modules["app.database"] = mock_db_module

mock_redis_module = MagicMock()
mock_redis_module.redis_client = MagicMock()
sys.modules["app.redis"] = mock_redis_module

mock_config = MagicMock()
mock_settings = MagicMock()
mock_settings.GLM_API_BASE_URL = "https://mock-glm.test"
mock_settings.GLM_API_KEY = "test-key"
mock_config.get_settings.return_value = mock_settings
sys.modules["app.config"] = mock_config
