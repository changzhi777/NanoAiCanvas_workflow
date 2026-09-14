from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Folder
from app.api.auth import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])


def _folder_response(f: Folder) -> dict:
    return {
        "id": str(f.id),
        "name": f.name,
        "parent_id": str(f.parent_id) if f.parent_id else None,
        "created_at": f.created_at.isoformat() if f.created_at else "",
    }


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: str


@router.get("", response_model=List[dict])
async def list_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.created_at.desc())
    )
    return [_folder_response(f) for f in result.scalars().all()]


@router.post("")
async def create_folder(
    data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_uuid = None
    if data.parent_id:
        try:
            parent_uuid = UUID(data.parent_id)
        except ValueError:
            pass

    folder = Folder(
        user_id=current_user.id,
        name=data.name,
        parent_id=parent_uuid,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return _folder_response(folder)


@router.patch("/{folder_id}")
async def update_folder(
    folder_id: UUID,
    data: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    folder.name = data.name
    await db.commit()
    await db.refresh(folder)
    return _folder_response(folder)


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")

    await db.delete(folder)
    await db.commit()
    return {"message": "文件夹已删除"}
