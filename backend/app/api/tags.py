from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Tag
from app.api.auth import get_current_user

router = APIRouter(prefix="/tags", tags=["tags"])


class TagResponse(BaseModel):
    name: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[str])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag.name).where(Tag.user_id == current_user.id).order_by(Tag.name)
    )
    return [row[0] for row in result.all()]


@router.post("", response_model=TagResponse)
async def create_tag(
    data: TagResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Tag).where(Tag.user_id == current_user.id, Tag.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"标签 '{data.name}' 已存在")

    tag = Tag(user_id=current_user.id, name=data.name)
    db.add(tag)
    await db.commit()
    return TagResponse(name=data.name)


@router.delete("")
async def delete_tag(
    name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        sa_delete(Tag).where(Tag.user_id == current_user.id, Tag.name == name)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="标签不存在")
    return {"message": "标签已删除"}
