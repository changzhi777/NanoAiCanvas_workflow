"""Unit tests conftest — mock DB/Redis before any app imports"""
import sys
from unittest.mock import MagicMock, AsyncMock

# Mock asyncpg before any app module loads
mock_asyncpg = MagicMock()
sys.modules["asyncpg"] = mock_asyncpg

# Mock redis module
mock_redis_mod = MagicMock()
mock_redis_mod.redis_client = MagicMock()
mock_redis_mod.redis_client.get = AsyncMock()
mock_redis_mod.redis_client.setex = AsyncMock()
mock_redis_mod.redis_client.publish = AsyncMock()
mock_redis_mod.redis_client.pipeline = MagicMock()
sys.modules["app.redis"] = mock_redis_mod
