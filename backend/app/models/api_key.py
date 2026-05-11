"""
API Key 配置管理模块
支持 frontend_key → multiple backend_keys 映射，实现热加载
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import json
import threading
import time
from typing import Optional, List, Dict, Any


class ApiKeyConfig(Base):
    """前端 API Key 配置表"""
    __tablename__ = "api_key_configs"

    id = Column(Integer, primary_key=True, index=True)
    frontend_key = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)  # 绑定用户ID
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系：一个 frontend_key 对应多个 backend_key
    backend_keys = relationship("BackendKeyMapping", back_populates="config", cascade="all, delete-orphan")


class BackendKeyMapping(Base):
    """Backend Key 映射表"""
    __tablename__ = "backend_key_mappings"

    id = Column(Integer, primary_key=True, index=True)
    frontend_key_id = Column(Integer, ForeignKey("api_key_configs.id"), nullable=False)
    backend_key = Column(String(128), nullable=False)
    provider_type = Column(String(32), nullable=False)  # wuyinkeji, minimax, glm
    model_type = Column(String(64), nullable=False, index=True)  # nano-banana2, gpt-image-2, etc.
    mcp_config = Column(JSONB, nullable=True)  # MCP 服务器配置
    skills = Column(JSONB, nullable=True)  # 技能配置
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    config = relationship("ApiKeyConfig", back_populates="backend_keys")

    __table_args__ = (
        Index("idx_backend_key_model", "backend_key", "model_type"),
    )


class ImageTask(Base):
    """图片生成任务表"""
    __tablename__ = "image_tasks"

    id = Column(String(36), primary_key=True)  # UUID string
    task_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    frontend_key = Column(String(64), nullable=True, index=True)
    model_type = Column(String(64), nullable=False)
    status = Column(String(32), default="pending")  # pending, processing, success, failed
    request_params = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_user_status", "user_id", "status"),
    )


class Provider(Base):
    """渠道商表"""
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(64), unique=True, nullable=False, index=True)
    api_base_url = Column(String(256), nullable=True)
    description = Column(Text, nullable=True)
    website = Column(String(256), nullable=True)
    is_active = Column(Boolean, default=True)
    config = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    models = relationship("Model", back_populates="provider", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="provider", cascade="all, delete-orphan")


class Model(Base):
    """模型配置表"""
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(128), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    model_type = Column(String(32), nullable=False, index=True)  # text, image, video, audio, music, multimodal, tts, coding
    category = Column(String(64), nullable=True)  # 节点类型标签：skills_task, minimax_text, glm_text 等
    points_per_call = Column(Integer, default=0)
    points_per_token = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    config = Column(JSONB, nullable=True)  # 额外配置：max_tokens, temperature 等
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    provider = relationship("Provider", back_populates="models")
    usage_logs = relationship("ModelUsageLog", back_populates="model", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_model_provider_code", "provider_id", "code"),
    )


class ModelRoute(Base):
    """模型路由表 — 节点类型到模型的映射"""
    __tablename__ = "model_routes"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(64), unique=True, nullable=False, index=True)  # 节点类型: glm_text, minimax_video 等
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    model = relationship("Model")


class ModelUsageLog(Base):
    """模型调用日志表"""
    __tablename__ = "model_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    api_key_id = Column(Integer, nullable=True)
    status = Column(String(16), default="success")  # success, failed, timeout
    response_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    request_params = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    model = relationship("Model", back_populates="usage_logs")

    __table_args__ = (
        Index("idx_usage_model_time", "model_id", "created_at"),
        Index("idx_usage_provider_time", "provider_id", "created_at"),
    )


class APIKey(Base):
    """API 密钥表"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    api_key = Column(String(256), nullable=False)
    status = Column(String(16), default="active")  # active, inactive, expired
    daily_limit = Column(Integer, default=0)  # 0=无限制
    monthly_limit = Column(Integer, default=0)
    used_today = Column(Integer, default=0)
    used_this_month = Column(Integer, default=0)
    total_used = Column(Integer, default=0)
    priority = Column(Integer, default=0)
    weight = Column(Integer, default=1)  # 负载均衡权重
    max_concurrent = Column(Integer, default=10)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    last_test_success = Column(Boolean, nullable=True)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    health_status = Column(String(16), default="unknown")  # healthy, degraded, down, unknown
    last_response_ms = Column(Integer, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    provider = relationship("Provider", back_populates="api_keys")

    __table_args__ = (
        Index("idx_apikey_provider_status", "provider_id", "status"),
    )


class ApiKeyManager:
    """
    API Key 管理器（单例模式）
    支持热加载：后台线程定期刷新配置
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_timestamp: float = 0
        self._cache_ttl: int = 60  # 60 秒 TTL
        self._refresh_interval: int = 30  # 30 秒刷新一次
        self._last_refresh: float = 0
        self._db_session = None

    @classmethod
    def get_instance(cls) -> "ApiKeyManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def set_db_session(self, db_session):
        """设置数据库会话"""
        self._db_session = db_session

    def _should_refresh(self) -> bool:
        """检查是否需要刷新缓存"""
        return (time.time() - self._last_refresh) > self._refresh_interval

    def get_backend_key(self, frontend_key: str, model_type: str) -> Optional[Dict[str, Any]]:
        """
        根据 frontend_key 和 model_type 获取对应的 backend_key 配置
        使用优先级最高的可用配置
        """
        # 检查缓存是否过期
        if time.time() - self._cache_timestamp > self._cache_ttl or self._should_refresh():
            self._refresh_cache()

        cache_key = f"{frontend_key}:{model_type}"
        return self._cache.get(cache_key)

    def get_all_backend_keys(self, frontend_key: str) -> List[Dict[str, Any]]:
        """获取指定 frontend_key 的所有 backend_key"""
        if time.time() - self._cache_timestamp > self._cache_ttl or self._should_refresh():
            self._refresh_cache()

        result = []
        for key, value in self._cache.items():
            if key.startswith(f"{frontend_key}:"):
                result.append(value)
        return sorted(result, key=lambda x: x.get("priority", 0), reverse=True)

    def validate_key(self, frontend_key: str) -> bool:
        """验证 frontend_key 是否有效"""
        if time.time() - self._cache_timestamp > self._cache_ttl or self._should_refresh():
            self._refresh_cache()

        return any(key.startswith(f"{frontend_key}:") for key in self._cache.keys())

    def _refresh_cache(self):
        """刷新配置缓存"""
        if self._db_session is None:
            return

        try:
            from app.models.api_key import ApiKeyConfig, BackendKeyMapping

            configs = self._db_session.query(ApiKeyConfig).filter(
                ApiKeyConfig.is_active == True
            ).all()

            new_cache = {}

            for config in configs:
                mappings = self._db_session.query(BackendKeyMapping).filter(
                    BackendKeyMapping.frontend_key_id == config.id,
                    BackendKeyMapping.is_active == True
                ).all()

                for mapping in mappings:
                    cache_key = f"{config.frontend_key}:{mapping.model_type}"
                    new_cache[cache_key] = {
                        "frontend_key": config.frontend_key,
                        "backend_key": mapping.backend_key,
                        "provider_type": mapping.provider_type,
                        "model_type": mapping.model_type,
                        "mcp_config": mapping.mcp_config or {},
                        "skills": mapping.skills or {},
                        "priority": mapping.priority,
                    }

            with self._lock:
                self._cache = new_cache
                self._cache_timestamp = time.time()
                self._last_refresh = time.time()

        except Exception as e:
            print(f"Failed to refresh API key cache: {e}")

    def clear_cache(self):
        """手动清除缓存，强制下次重新加载"""
        with self._lock:
            self._cache = {}
            self._cache_timestamp = 0
            self._last_refresh = 0
