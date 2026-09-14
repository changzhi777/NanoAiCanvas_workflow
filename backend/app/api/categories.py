from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Category
from app.api.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    team_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    user_id: UUID
    team_id: Optional[int]
    name: str
    icon: Optional[str]
    color: Optional[str]
    is_system: bool
    created_at: str

    class Config:
        from_attributes = True


def _to_response(c: Category) -> CategoryResponse:
    return CategoryResponse(
        id=str(c.id),
        user_id=c.user_id,
        team_id=c.team_id,
        name=c.name,
        icon=c.icon,
        color=c.color,
        is_system=c.is_system,
        created_at=c.created_at.isoformat() if c.created_at else "",
    )


@router.post("", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(
        Category.user_id == current_user.id,
        Category.name == data.name,
        Category.team_id == data.team_id,
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail=f"类型 '{data.name}' 已存在")

    category = Category(
        user_id=current_user.id,
        team_id=data.team_id,
        name=data.name,
        icon=data.icon,
        color=data.color,
        is_system=False,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return _to_response(category)


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    team_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(Category.user_id == current_user.id)

    if team_id:
        query = query.where(
            or_(
                Category.team_id == None,
                Category.team_id == team_id,
            )
        )
    else:
        query = query.where(Category.team_id == None)

    result = await db.execute(query.order_by(Category.created_at.desc()))
    categories = result.scalars().all()

    return [_to_response(c) for c in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="类型不存在")

    return _to_response(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="类型不存在")

    if category.is_system:
        raise HTTPException(status_code=400, detail="系统类型不可修改")

    if data.name and data.name != category.name:
        check_query = select(Category).where(
            Category.user_id == current_user.id,
            Category.name == data.name,
            Category.team_id == category.team_id,
            Category.id != category_id,
        )
        check_result = await db.execute(check_query)
        if check_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"类型 '{data.name}' 已存在")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)

    return _to_response(category)


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="类型不存在")

    if category.is_system:
        raise HTTPException(status_code=400, detail="系统类型不可删除")

    await db.delete(category)
    await db.commit()

    return {"message": "类型已删除"}


@router.get("/check/{name}", response_model=dict)
async def check_category_name(
    name: str,
    team_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(
        Category.user_id == current_user.id,
        Category.name == name,
        Category.team_id == team_id,
    )
    result = await db.execute(query)
    exists = result.scalar_one_or_none() is not None

    return {"exists": exists, "name": name}
