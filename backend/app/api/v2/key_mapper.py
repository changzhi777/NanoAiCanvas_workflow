"""
Key Mapper CRUD API — 前端 API Key ↔ 后端 Key 映射管理
路由前缀: /api/v2/admin/key-mapper
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models.api_key import ApiKeyConfig, BackendKeyMapping
from app.models import User
from app.api.auth import require_admin

router = APIRouter(prefix="/api/v2/admin/key-mapper", tags=["key-mapper"])


# ============ Schemas ============

class FrontendKeyCreate(BaseModel):
    frontend_key: str
    description: Optional[str] = None

class FrontendKeyUpdate(BaseModel):
    frontend_key: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MappingCreate(BaseModel):
    backend_key: str
    provider_type: str
    model_type: str
    mcp_config: Optional[dict] = None
    skills: Optional[dict] = None
    priority: int = 0

class MappingUpdate(BaseModel):
    backend_key: Optional[str] = None
    provider_type: Optional[str] = None
    model_type: Optional[str] = None
    mcp_config: Optional[dict] = None
    skills: Optional[dict] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


# ============ Helpers ============

def _config_to_dict(c: ApiKeyConfig, mapping_count: int = 0) -> dict:
    return {
        "id": c.id,
        "frontend_key": c.frontend_key,
        "description": c.description,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "backend_key_count": mapping_count,
    }

def _mapping_to_dict(m: BackendKeyMapping) -> dict:
    return {
        "id": m.id,
        "frontend_key_id": m.frontend_key_id,
        "backend_key": m.backend_key,
        "provider_type": m.provider_type,
        "model_type": m.model_type,
        "mcp_config": m.mcp_config,
        "skills": m.skills,
        "priority": m.priority,
        "is_active": m.is_active,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ============ Frontend Key CRUD ============

@router.get("")
async def list_frontend_keys(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(ApiKeyConfig).order_by(ApiKeyConfig.id)
    result = await db.execute(stmt)
    configs = result.scalars().all()

    out = []
    for c in configs:
        mc = (await db.execute(
            select(func.count()).where(BackendKeyMapping.frontend_key_id == c.id)
        )).scalar() or 0
        out.append(_config_to_dict(c, mc))
    return out


@router.post("")
async def create_frontend_key(data: FrontendKeyCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(ApiKeyConfig).where(ApiKeyConfig.frontend_key == data.frontend_key)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Key '{data.frontend_key}' already exists")

    c = ApiKeyConfig(frontend_key=data.frontend_key, description=data.description)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _config_to_dict(c)


@router.put("/{key_id}")
async def update_frontend_key(key_id: int, data: FrontendKeyUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(ApiKeyConfig, key_id)
    if not c:
        raise HTTPException(404, "Config not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    mc = (await db.execute(
        select(func.count()).where(BackendKeyMapping.frontend_key_id == c.id)
    )).scalar() or 0
    return _config_to_dict(c, mc)


@router.delete("/{key_id}")
async def delete_frontend_key(key_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(ApiKeyConfig, key_id)
    if not c:
        raise HTTPException(404, "Config not found")
    await db.delete(c)
    await db.commit()
    return {"message": "deleted"}


# ============ Backend Key Mapping CRUD ============

@router.get("/{frontend_key_id}/mappings")
async def list_mappings(frontend_key_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(ApiKeyConfig, frontend_key_id)
    if not c:
        raise HTTPException(404, "Config not found")
    stmt = select(BackendKeyMapping).where(
        BackendKeyMapping.frontend_key_id == frontend_key_id
    ).order_by(BackendKeyMapping.priority.desc())
    result = await db.execute(stmt)
    return [_mapping_to_dict(m) for m in result.scalars().all()]


@router.post("/{frontend_key_id}/mappings")
async def create_mapping(frontend_key_id: int, data: MappingCreate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    c = await db.get(ApiKeyConfig, frontend_key_id)
    if not c:
        raise HTTPException(404, "Config not found")
    m = BackendKeyMapping(frontend_key_id=frontend_key_id, **data.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _mapping_to_dict(m)


@router.put("/mappings/{mapping_id}")
async def update_mapping(mapping_id: int, data: MappingUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    m = await db.get(BackendKeyMapping, mapping_id)
    if not m:
        raise HTTPException(404, "Mapping not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return _mapping_to_dict(m)


@router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    m = await db.get(BackendKeyMapping, mapping_id)
    if not m:
        raise HTTPException(404, "Mapping not found")
    await db.delete(m)
    await db.commit()
    return {"message": "deleted"}


# ============ Cache Refresh ============

@router.post("/refresh-cache")
async def refresh_cache(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    from app.models.api_key import ApiKeyManager
    manager = ApiKeyManager.get_instance()
    manager.clear_cache()
    return {"message": "Cache cleared"}
