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
    team_id: Optional[UUID] = None  # 可选：创建团队类型


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    team_id: Optional[UUID]
    name: str
    icon: Optional[str]
    color: Optional[str]
    is_system: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查重名：user_id + name 或 team_id + name
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

    return CategoryResponse(
        id=category.id,
        user_id=category.user_id,
        team_id=category.team_id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        is_system=category.is_system,
        created_at=category.created_at.isoformat() if category.created_at else "",
    )


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    team_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 获取用户个人类型 + 团队类型（如果指定了 team_id）
    query = select(Category).where(Category.user_id == current_user.id)

    if team_id:
        query = query.where(
            or_(
                Category.team_id == None,  # 个人类型
                Category.team_id == team_id,  # 指定团队类型
            )
        )
    else:
        query = query.where(Category.team_id == None)  # 仅个人类型

    result = await db.execute(query.order_by(Category.created_at.desc()))
    categories = result.scalars().all()

    return [
        CategoryResponse(
            id=c.id,
            user_id=c.user_id,
            team_id=c.team_id,
            name=c.name,
            icon=c.icon,
            color=c.color,
            is_system=c.is_system,
            created_at=c.created_at.isoformat() if c.created_at else "",
        )
        for c in categories
    ]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
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

    return CategoryResponse(
        id=category.id,
        user_id=category.user_id,
        team_id=category.team_id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        is_system=category.is_system,
        created_at=category.created_at.isoformat() if category.created_at else "",
    )


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
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

    # 检查重名
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

    return CategoryResponse(
        id=category.id,
        user_id=category.user_id,
        team_id=category.team_id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        is_system=category.is_system,
        created_at=category.created_at.isoformat() if category.created_at else "",
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
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
    team_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """检查类型名是否可用（用于去重提示）"""
    query = select(Category).where(
        Category.user_id == current_user.id,
        Category.name == name,
        Category.team_id == team_id,
    )
    result = await db.execute(query)
    exists = result.scalar_one_or_none() is not None

    return {"exists": exists, "name": name}