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


@router.post("/assets/{asset_id}/generate-thumbnail")
async def generate_video_thumbnail(
    asset_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """为视频资产生成关键帧缩略图"""
    result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.is_deleted == False))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset_type = (asset.type.value if hasattr(asset.type, "value") else str(asset.type)).lower()
    if asset_type not in ("video", "storyboard_video"):
        raise HTTPException(status_code=400, detail="Only video assets support thumbnail generation")

    if not asset.url:
        raise HTTPException(status_code=400, detail="Asset has no video URL")

    import os
    from app.services.video_thumbnail import download_and_extract, extract_keyframe, get_video_duration

    _app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    upload_dir = os.environ.get(
        "ASSET_UPLOAD_DIR",
        os.path.join(_app_dir, "chat-uploads", "assets"),
    )
    os.makedirs(upload_dir, exist_ok=True)

    thumb_filename = f"thumb_{asset.id}.jpg"
    thumb_path = os.path.join(upload_dir, thumb_filename)

    # 相对路径直接用本地文件，完整URL走下载
    success = False
    if asset.url.startswith("/"):
        filename = asset.url.split("/")[-1]
        # 尝试多个可能的本地路径
        candidates = [
            os.path.join(upload_dir, filename),
            os.path.join(upload_dir, "..", "..", "chat-uploads", "assets", filename),
            os.path.join(os.path.dirname(__file__), "..", "..", "chat-uploads", "assets", filename),
        ]
        import logging
        logging.getLogger(__name__).info(f"Searching for local video: {filename}, candidates: {candidates}")
        for local_video in candidates:
            local_video = os.path.realpath(local_video)
            if os.path.exists(local_video):
                duration = get_video_duration(local_video)
                ts = max(1.0, duration * 0.1) if duration > 0 else 1.0
                success = extract_keyframe(local_video, thumb_path, timestamp=ts)
                if success:
                    break
        if not success:
            logging.getLogger(__name__).warning(f"Video file not found locally: {filename}")
    else:
        success = await download_and_extract(asset.url, thumb_path)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to extract keyframe")

    from app.config import get_settings
    settings = get_settings()
    base_url = getattr(settings, "API_BASE_URL", "") or ""
    thumb_url = f"{base_url}/asset-uploads/{thumb_filename}" if base_url else f"/asset-uploads/{thumb_filename}"

    asset.thumbnail_url = thumb_url
    await db.commit()

    return {"thumbnail_url": thumb_url}


@router.post("/assets/batch-generate-thumbnails")
async def batch_generate_thumbnails(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """批量生成所有缺少缩略图的视频资产的关键帧"""
    import os
    from app.services.video_thumbnail import download_and_extract, extract_keyframe, get_video_duration

    stmt = select(Asset).where(
        Asset.is_deleted == False,
        Asset.type.in_(["video", "storyboard_video"]),
    ).where(
        (Asset.thumbnail_url == None) | (Asset.thumbnail_url == "")
    )
    result = await db.execute(stmt)
    assets = result.scalars().all()

    _app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    upload_dir = os.environ.get(
        "ASSET_UPLOAD_DIR",
        os.path.join(_app_dir, "chat-uploads", "assets"),
    )
    os.makedirs(upload_dir, exist_ok=True)

    from app.config import get_settings
    settings = get_settings()
    base_url = getattr(settings, "API_BASE_URL", "") or ""

    generated = []
    for asset in assets:
        if not asset.url:
            continue
        thumb_filename = f"thumb_{asset.id}.jpg"
        thumb_path = os.path.join(upload_dir, thumb_filename)

        # 相对路径直接用本地文件，完整URL走下载
        success = False
        if asset.url.startswith("/"):
            filename = asset.url.split("/")[-1]
            candidates = [
                os.path.join(upload_dir, filename),
                os.path.join(upload_dir, "..", "..", "chat-uploads", "assets", filename),
                os.path.join(os.path.dirname(__file__), "..", "..", "chat-uploads", "assets", filename),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "chat-uploads", "assets", filename)),
            ]
            for local_video in candidates:
                local_video = os.path.realpath(local_video)
                if os.path.exists(local_video):
                    duration = get_video_duration(local_video)
                    ts = max(1.0, duration * 0.1) if duration > 0 else 1.0
                    success = extract_keyframe(local_video, thumb_path, timestamp=ts)
                    if success:
                        break
        else:
            success = await download_and_extract(asset.url, thumb_path)

        if success:
            thumb_url = f"{base_url}/asset-uploads/{thumb_filename}" if base_url else f"/asset-uploads/{thumb_filename}"
            asset.thumbnail_url = thumb_url
            generated.append({"id": str(asset.id), "name": asset.name, "thumbnail_url": thumb_url})

    await db.commit()
    return {"total": len(assets), "generated": len(generated), "results": generated}
