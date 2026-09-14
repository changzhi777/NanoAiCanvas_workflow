from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, exists
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Asset, AssetType
from app.models.points import Team, TeamAsset, TeamMember
from app.api.auth import get_current_user
from app.services.image_downloader import download_image

router = APIRouter(prefix="/assets", tags=["assets"])

VALID_ASSET_TYPES = [e.value for e in AssetType]
VALID_ASSET_CATEGORIES = [e.value for e in AssetType]


def _safe_uuid(val: Optional[str]) -> Optional[UUID]:
    if not val:
        return None
    try:
        return UUID(val)
    except ValueError:
        return None


def _resolve_type(raw: str) -> str:
    if raw in VALID_ASSET_TYPES:
        return raw
    raise HTTPException(status_code=400, detail=f"Invalid asset type: {raw}")


def _resolve_category(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw in VALID_ASSET_CATEGORIES:
        return raw
    return raw


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


class AssetMeta(BaseModel):
    prompt: Optional[str] = None
    enhancedPrompt: Optional[str] = None
    params: Optional[dict] = None
    referenceImages: Optional[List[str]] = None

    class Config:
        extra = "allow"


METADATA_SCHEMAS = {
    "storyboard_image": AssetMeta,
    "storyboard_video": AssetMeta,
    "image": AssetMeta,
    "video": AssetMeta,
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
        type=a.type if isinstance(a.type, str) else a.type.value,
        name=a.name,
        url=a.url,
        thumbnail_url=a.thumbnail_url,
        metadata=a.meta_data or {},
        category=a.category if isinstance(a.category, str) else (a.category.value if a.category else None),
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
    asset_type = _resolve_type(data.type)

    meta = data.metadata or {}
    schema_cls = METADATA_SCHEMAS.get(asset_type)
    if schema_cls and meta:
        try:
            schema_cls(**meta)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Metadata validation error: {e}")

    local_url = data.url
    local_thumbnail = data.thumbnail_url
    if asset_type in ("image", "video", "storyboard_image", "storyboard_video") and data.url:
        local_url, thumb = await download_image(data.url, asset_type)
        local_thumbnail = thumb
    if asset_type in ("image", "storyboard_image") and data.thumbnail_url and data.thumbnail_url != data.url:
        _, thumb = await download_image(data.thumbnail_url, asset_type)
        local_thumbnail = thumb

    asset = Asset(
        user_id=current_user.id,
        type=asset_type,
        name=data.name,
        url=local_url,
        thumbnail_url=local_thumbnail or local_url,
        meta_data=data.metadata or {},
        category=_resolve_category(data.category) or asset_type,
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
        query = query.where(Asset.type == type_filter)
    if category:
        query = query.where(Asset.category == category)
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

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets_list = result.scalars().all()

    items = [_to_response(a) for a in assets_list]

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
            value = _resolve_category(value)
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
        values["category"] = _resolve_category(data.category)
    if not values:
        return {"updated": 0}
    result = await db.execute(
        update(Asset)
        .where(Asset.id.in_(ids), Asset.user_id == current_user.id)
        .values(**values)
    )
    await db.commit()
    return {"updated": result.rowcount}


# ============ 团队资产 ============

@router.get("/team/{team_id}")
async def list_team_assets(
    team_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_member = await db.execute(
        select(exists().where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
        ))
    )
    if not is_member.scalar():
        raise HTTPException(status_code=403, detail="Not a team member")

    query = (
        select(Asset)
        .join(TeamAsset, TeamAsset.asset_id == Asset.id)
        .where(
            TeamAsset.team_id == team_id,
            Asset.is_deleted == False,
        )
    )
    if type_filter:
        query = query.where(Asset.type == type_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(query)).scalars().all()

    return {"items": [_to_response(a) for a in rows], "total": total, "page": page, "page_size": page_size}


class ShareRequest(BaseModel):
    team_id: int


@router.post("/{asset_id}/share")
async def share_asset_to_team(
    asset_id: UUID,
    data: ShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team_id = data.team_id

    asset = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id, Asset.is_deleted == False)
    )
    if not asset.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Asset not found")

    is_member = await db.execute(
        select(exists().where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id))
    )
    if not is_member.scalar():
        raise HTTPException(status_code=403, detail="Not a team member")

    already = await db.execute(
        select(exists().where(TeamAsset.team_id == team_id, TeamAsset.asset_id == asset_id))
    )
    if already.scalar():
        return {"success": True, "message": "Already shared"}

    db.add(TeamAsset(team_id=team_id, asset_id=asset_id, added_by=current_user.id))
    await db.commit()
    return {"success": True}


@router.delete("/{asset_id}/team/{team_id}")
async def remove_asset_from_team(
    asset_id: UUID,
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_member = await db.execute(
        select(exists().where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id))
    )
    if not is_member.scalar():
        raise HTTPException(status_code=403, detail="Not a team member")

    result = await db.execute(
        select(TeamAsset).where(TeamAsset.team_id == team_id, TeamAsset.asset_id == asset_id)
    )
    link = result.scalar_one_or_none()
    if link:
        await db.delete(link)
        await db.commit()
    return {"success": True}
