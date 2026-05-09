from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Asset, AssetType, AssetCategory
from app.api.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])


def _to_response(a: Asset) -> AssetResponse:
    return AssetResponse(
        id=a.id,
        type=a.type.value,
        name=a.name,
        url=a.url,
        thumbnail_url=a.thumbnail_url,
        metadata=a.meta_data or {},
        category=a.category.value if a.category else None,
        tags=a.tags or [],
        is_starred=a.is_starred,
        workflow_snapshot=a.workflow_snapshot,
        version=a.version,
        created_at=a.created_at.isoformat() if a.created_at else "",
    )


class AssetCreate(BaseModel):
    type: str
    name: str
    url: str
    thumbnail_url: Optional[str] = None
    metadata: Optional[dict] = {}
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    workflow_snapshot: Optional[dict] = None
    version: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    thumbnail_url: Optional[str] = None
    metadata: Optional[dict] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_starred: Optional[bool] = None


class AssetResponse(BaseModel):
    id: UUID
    type: str
    name: str
    url: str
    thumbnail_url: Optional[str]
    metadata: dict
    category: Optional[str]
    tags: List[str]
    is_starred: bool
    workflow_snapshot: Optional[dict]
    version: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    items: List[AssetResponse]
    total: int
    page: int
    page_size: int


@router.post("", response_model=AssetResponse)
async def create_asset(
    data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset = Asset(
        user_id=current_user.id,
        type=AssetType(data.type),
        name=data.name,
        url=data.url,
        thumbnail_url=data.thumbnail_url,
        meta_data=data.metadata or {},
        category=AssetCategory(data.category) if data.category else None,
        tags=data.tags or [],
        workflow_snapshot=data.workflow_snapshot,
        version=data.version,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return _to_response(asset)


@router.get("", response_model=AssetListResponse)
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = None,
    category: Optional[str] = None,
    starred: Optional[bool] = None,
    search: Optional[str] = None,
    version: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        Asset.is_deleted == False,
    )

    if type_filter:
        query = query.where(Asset.type == AssetType(type_filter))
    if category:
        query = query.where(Asset.category == AssetCategory(category))
    if starred is not None:
        query = query.where(Asset.is_starred == starred)
    if version:
        query = query.where(Asset.version == version)
    if search:
        query = query.where(
            or_(
                Asset.name.ilike(f"%{search}%"),
                Asset.tags.op("&&")(func.cast([search], func.array(String).collection) if False else None) if False else None,
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets = result.scalars().all()

    items = [_to_response(a) for a in assets]

    return AssetListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id, Asset.is_deleted == False)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return _to_response(asset)


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID,
    data: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id, Asset.is_deleted == False)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "category" and value:
            value = AssetCategory(value)
        setattr(asset, key, value)

    await db.commit()
    await db.refresh(asset)

    return _to_response(asset)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id, Asset.is_deleted == False)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_deleted = True
    await db.commit()

    return {"message": "Asset deleted"}


@router.post("/{asset_id}/star")
async def toggle_star(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id, Asset.is_deleted == False)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_starred = not asset.is_starred
    await db.commit()

    return {"is_starred": asset.is_starred}