import redis.asyncio as redis
import json
from uuid import uuid4
from app.config import get_settings

settings = get_settings()

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True,
    socket_timeout=30,
    socket_connect_timeout=10,
    retry_on_timeout=True,
    health_check_interval=30,
)

# Cache TTL constants (in seconds)
CACHE_TTL = {
    "user_session": 60 * 60 * 24 * 7,  # 7 days
    "user_session_remember": 60 * 60 * 24 * 30,  # 30 days for remember me
    "workflow_list": 60 * 5,  # 5 min
    "ai_response": 60 * 60 * 24 * 30,  # 30 days
    "asset_meta": 60 * 60 * 24,  # 1 day
}

# Session prefix for user sessions
SESSION_PREFIX = "session:"


class SessionManager:
    """Redis-based session manager for user authentication"""

    @staticmethod
    def _get_session_key(session_id: str) -> str:
        return f"{SESSION_PREFIX}{session_id}"

    @classmethod
    async def create_session(cls, user_id: str, remember: bool = False) -> str:
        """
        Create a new session in Redis.
        Returns the session_id.
        """
        session_id = str(uuid4())
        ttl = CACHE_TTL["user_session_remember"] if remember else CACHE_TTL["user_session"]

        session_data = {
            "user_id": user_id,
            "remember": remember,
            "session_id": session_id,
        }

        await redis_client.setex(
            cls._get_session_key(session_id),
            ttl,
            json.dumps(session_data)
        )

        return session_id

    @classmethod
    async def get_session(cls, session_id: str) -> dict | None:
        """Get session data from Redis"""
        if not session_id:
            return None

        data = await redis_client.get(cls._get_session_key(session_id))
        if data:
            return json.loads(data)
        return None

    @classmethod
    async def delete_session(cls, session_id: str) -> bool:
        """Delete a session from Redis"""
        if not session_id:
            return False
        result = await redis_client.delete(cls._get_session_key(session_id))
        return result > 0

    @classmethod
    async def refresh_session(cls, session_id: str, remember: bool = False) -> bool:
        """Refresh session TTL"""
        if not session_id:
            return False

        session_data = await cls.get_session(session_id)
        if not session_data:
            return False

        ttl = CACHE_TTL["user_session_remember"] if remember else CACHE_TTL["user_session"]
        await redis_client.expire(cls._get_session_key(session_id), ttl)
        return True

    @classmethod
    async def validate_session(cls, session_id: str) -> str | None:
        """
        Validate session and return user_id if valid.
        Returns None if session is invalid or expired.
        """
        session_data = await cls.get_session(session_id)
        if session_data and "user_id" in session_data:
            return session_data["user_id"]
        return None


async def get_redis() -> redis.Redis:
    return redis_client