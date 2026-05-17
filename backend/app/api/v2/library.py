"""
资产库 V2 API — 前端 assets.ts 使用的 /v2/library/assets 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.api.auth import get_current_user_optional
from app.models import User
from app.models.asset import Asset

router = APIRouter(prefix="/api/v2/library", tags=["library"])


def _asset_to_dict(a: Asset) -> dict:
    meta = a.meta_data if isinstance(a.meta_data, dict) else {}
    return {
        "id": str(a.id),
        "owner_id": str(a.user_id),
        "name": a.name,
        "type": a.type.value if hasattr(a.type, "value") else str(a.type),
        "url": a.url,
        "thumbnail_url": a.thumbnail_url,
        "description": meta.get("description", ""),
        "category": a.category,
        "is_public": meta.get("is_public", False),
        "tags": a.tags or [],
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        "params": meta,
    }


@router.get("/assets")
async def list_library_assets(
    type_filter: Optional[str] = Query(None, alias="type"),
    shared: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    query = select(Asset).where(Asset.is_deleted == False)

    if current_user:
        query = query.where(Asset.user_id == current_user.id)
    elif shared:
        query = query.where(Asset.is_starred == True)

    if type_filter:
        query = query.where(Asset.type == type_filter)

    query = query.order_by(Asset.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    assets = result.scalars().all()
    return [_asset_to_dict(a) for a in assets]


@router.get("/assets/{asset_id}")
async def get_library_asset(
    asset_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.is_deleted == False))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _asset_to_dict(asset)


@router.post("/assets")
async def create_library_asset(
    body: dict,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    asset = Asset(
        user_id=current_user.id,
        name=body.get("name", "untitled"),
        type=body.get("type", "image"),
        url=body.get("url", ""),
        thumbnail_url=body.get("thumbnail_url"),
        meta_data=body.get("meta", {}),
        category=body.get("category"),
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return _asset_to_dict(asset)


@router.delete("/assets/{asset_id}")
async def delete_library_asset(
    asset_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.is_deleted = True
    await db.commit()
    return {"success": True}
