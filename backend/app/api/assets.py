from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Asset, AssetType, AssetCategory
from app.api.auth import get_current_user
from app.services.image_downloader import download_image

router = APIRouter(prefix="/assets", tags=["assets"])


def _safe_uuid(val: Optional[str]) -> Optional[UUID]:
    if not val:
        return None
    try:
        return UUID(val)
    except ValueError:
        return None


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
    source_node_id: Optional[str] = None
    workflow_id: Optional[str] = None
    parent_asset_id: Optional[str] = None


# --- 元数据 Schema ---
class AssetMeta(BaseModel):
    prompt: Optional[str] = None
    enhancedPrompt: Optional[str] = None
    params: Optional[dict] = None
    referenceImages: Optional[List[str]] = None

    class Config:
        extra = "allow"


METADATA_SCHEMAS = {
    "storyboard_shot": AssetMeta,
    "image": AssetMeta,
}


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
    source_node_id: Optional[str] = None
    workflow_id: Optional[str] = None
    parent_asset_id: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    items: List[AssetResponse]
    total: int
    page: int
    page_size: int


def _to_response(a: Asset) -> AssetResponse:
    return AssetResponse(
        id=a.id,
        type=a.type.value if isinstance(a.type, AssetType) else a.type,
        name=a.name,
        url=a.url,
        thumbnail_url=a.thumbnail_url,
        metadata=a.meta_data or {},
        category=a.category.value if isinstance(a.category, AssetCategory) else a.category,
        tags=a.tags or [],
        is_starred=a.is_starred,
        workflow_snapshot=a.workflow_snapshot,
        version=a.version,
        source_node_id=a.source_node_id,
        workflow_id=str(a.workflow_id) if a.workflow_id else None,
        parent_asset_id=str(a.parent_asset_id) if a.parent_asset_id else None,
        created_at=a.created_at.isoformat() if a.created_at else "",
    )


@router.post("", response_model=AssetResponse)
async def create_asset(
    data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 元数据 Schema 校验
    meta = data.metadata or {}
    schema_cls = METADATA_SCHEMAS.get(data.type)
    if schema_cls and meta:
        try:
            schema_cls(**meta)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Metadata validation error: {e}")

    # 下载外部URL图片/视频到本地存储
    local_url = data.url
    local_thumbnail = data.thumbnail_url
    if data.type in ("image", "video", "storyboard_shot") and data.url:
        local_url, thumb = await download_image(data.url, data.type)
        local_thumbnail = thumb
    if data.type in ("image", "storyboard_shot") and data.thumbnail_url and data.thumbnail_url != data.url:
        _, thumb = await download_image(data.thumbnail_url, data.type)
        local_thumbnail = thumb

    asset = Asset(
        user_id=current_user.id,
        type=AssetType(data.type),
        name=data.name,
        url=local_url,
        thumbnail_url=local_thumbnail or local_url,
        meta_data=data.metadata or {},
        category=AssetCategory(data.category) if data.category else None,
        tags=data.tags or [],
        workflow_snapshot=data.workflow_snapshot,
        version=data.version,
        source_node_id=data.source_node_id,
        workflow_id=data.workflow_id,
        parent_asset_id=_safe_uuid(data.parent_asset_id),
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
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Asset.name.ilike(search_term),
                Asset.meta_data["prompt"].astext.ilike(search_term),
                Asset.meta_data["params"]["scriptTitle"].astext.ilike(search_term),
            ),
            Asset.meta_data.isnot(None),
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
        if key == "category":
            value = AssetCategory(value) if value else None
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


class BatchDeleteRequest(BaseModel):
    ids: List[str]


@router.post("/batch_delete")
async def batch_delete(
    data: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ids = [_safe_uuid(i) for i in data.ids if _safe_uuid(i)]
    if not ids:
        return {"deleted": 0}
    result = await db.execute(
        update(Asset)
        .where(Asset.id.in_(ids), Asset.user_id == current_user.id)
        .values(is_deleted=True)
    )
    await db.commit()
    return {"deleted": result.rowcount}


class BatchUpdateRequest(BaseModel):
    ids: List[str]
    category: Optional[str] = None


@router.post("/batch_update")
async def batch_update(
    data: BatchUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ids = [_safe_uuid(i) for i in data.ids if _safe_uuid(i)]
    if not ids:
        return {"updated": 0}
    values = {}
    if data.category:
        values["category"] = AssetCategory(data.category)
    if not values:
        return {"updated": 0}
    result = await db.execute(
        update(Asset)
        .where(Asset.id.in_(ids), Asset.user_id == current_user.id)
        .values(**values)
    )
    await db.commit()
    return {"updated": result.rowcount}