"""
API Key 管理服务
提供 API Key 配置的 CRUD 操作
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.api_key import ApiKeyConfig, BackendKeyMapping, ApiKeyManager


class ApiKeyService:
    """API Key 管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.manager = ApiKeyManager.get_instance()
        self.manager.set_db_session(db)

    async def create_frontend_key(
        self,
        frontend_key: str,
        description: str = None
    ) -> ApiKeyConfig:
        """创建新的 frontend_key 配置"""
        config = ApiKeyConfig(
            frontend_key=frontend_key,
            description=description,
            is_active=True
        )
        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)
        self.manager.clear_cache()
        return config

    async def get_frontend_key(self, frontend_key: str) -> Optional[ApiKeyConfig]:
        """获取 frontend_key 配置"""
        result = await self.db.execute(
            select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == frontend_key)
        )
        return result.scalar_one_or_none()

    async def list_frontend_keys(self) -> List[ApiKeyConfig]:
        """列出所有 frontend_key 配置"""
        result = await self.db.execute(select(ApiKeyConfig))
        return result.scalars().all()

    async def update_frontend_key(
        self,
        frontend_key: str,
        description: str = None,
        is_active: bool = None
    ) -> Optional[ApiKeyConfig]:
        """更新 frontend_key 配置"""
        config = await self.get_frontend_key(frontend_key)
        if not config:
            return None

        if description is not None:
            config.description = description
        if is_active is not None:
            config.is_active = is_active

        await self.db.commit()
        await self.db.refresh(config)
        self.manager.clear_cache()
        return config

    async def delete_frontend_key(self, frontend_key: str) -> bool:
        """删除 frontend_key 配置（级联删除所有映射）"""
        config = await self.get_frontend_key(frontend_key)
        if not config:
            return False

        await self.db.delete(config)
        await self.db.commit()
        self.manager.clear_cache()
        return True

    async def add_backend_key_mapping(
        self,
        frontend_key: str,
        backend_key: str,
        provider_type: str,
        model_type: str,
        mcp_config: Dict[str, Any] = None,
        skills: Dict[str, Any] = None,
        priority: int = 0
    ) -> Optional[BackendKeyMapping]:
        """添加 backend_key 映射"""
        config = await self.get_frontend_key(frontend_key)
        if not config:
            return None

        mapping = BackendKeyMapping(
            frontend_key_id=config.id,
            backend_key=backend_key,
            provider_type=provider_type,
            model_type=model_type,
            mcp_config=mcp_config or {},
            skills=skills or {},
            priority=priority,
            is_active=True
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        self.manager.clear_cache()
        return mapping

    async def list_backend_keys(self, frontend_key: str) -> List[BackendKeyMapping]:
        """列出指定 frontend_key 的所有 backend_key 映射"""
        config = await self.get_frontend_key(frontend_key)
        if not config:
            return []

        result = await self.db.execute(
            select(BackendKeyMapping).where(
                BackendKeyMapping.frontend_key_id == config.id
            )
        )
        return result.scalars().all()

    async def update_backend_key_mapping(
        self,
        mapping_id: int,
        backend_key: str = None,
        provider_type: str = None,
        model_type: str = None,
        mcp_config: Dict[str, Any] = None,
        skills: Dict[str, Any] = None,
        priority: int = None,
        is_active: bool = None
    ) -> Optional[BackendKeyMapping]:
        """更新 backend_key 映射"""
        result = await self.db.execute(
            select(BackendKeyMapping).where(BackendKeyMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        if not mapping:
            return None

        if backend_key is not None:
            mapping.backend_key = backend_key
        if provider_type is not None:
            mapping.provider_type = provider_type
        if model_type is not None:
            mapping.model_type = model_type
        if mcp_config is not None:
            mapping.mcp_config = mcp_config
        if skills is not None:
            mapping.skills = skills
        if priority is not None:
            mapping.priority = priority
        if is_active is not None:
            mapping.is_active = is_active

        await self.db.commit()
        await self.db.refresh(mapping)
        self.manager.clear_cache()
        return mapping

    async def delete_backend_key_mapping(self, mapping_id: int) -> bool:
        """删除 backend_key 映射"""
        result = await self.db.execute(
            select(BackendKeyMapping).where(BackendKeyMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        if not mapping:
            return False

        await self.db.delete(mapping)
        await self.db.commit()
        self.manager.clear_cache()
        return True

    async def refresh_cache(self):
        """手动刷新配置缓存"""
        self.manager.clear_cache()
        self.manager.set_db_session(self.db)
        # 触发缓存重建
        _ = self.manager.validate_key("")  # 空 key 会触发缓存刷新
