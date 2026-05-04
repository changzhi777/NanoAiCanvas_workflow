"""
提示词限制词库 API
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.models.prompt_restrictions import PromptRestrictionCategory, PromptRestrictionWord
from app.api.auth import get_current_user

router = APIRouter(prefix="/prompt-restrictions", tags=["prompt-restrictions"])


# ============ Schemas ============

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: int
    word_count: int = 0

    class Config:
        from_attributes = True


class WordResponse(BaseModel):
    id: int
    category_id: int
    word: str
    alternative: Optional[str]
    severity: int
    is_active: int

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WordCreate(BaseModel):
    category_id: int
    word: str
    alternative: Optional[str] = None
    severity: int = 1


class PromptCheckRequest(BaseModel):
    prompt: str


class PromptCheckResponse(BaseModel):
    is_safe: bool
    violations: List[dict] = []


# ============ API Endpoints ============

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """获取所有分类"""
    query = select(PromptRestrictionCategory).order_by(PromptRestrictionCategory.id)
    result = await db.execute(query)
    categories = result.scalars().all()

    response = []
    for cat in categories:
        # Count words in this category
        count_query = select(func.count()).select_from(PromptRestrictionWord).where(
            PromptRestrictionWord.category_id == cat.id,
            PromptRestrictionWord.is_active == 1
        )
        count_result = await db.execute(count_query)
        word_count = count_result.scalar() or 0

        response.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            is_active=cat.is_active,
            word_count=word_count
        ))

    return response


@router.get("/words", response_model=List[WordResponse])
async def list_words(
    category_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """获取所有限制词"""
    query = select(PromptRestrictionWord)
    if category_id:
        query = query.where(PromptRestrictionWord.category_id == category_id)
    query = query.order_by(PromptRestrictionWord.severity.desc(), PromptRestrictionWord.word)

    result = await db.execute(query)
    words = result.scalars().all()

    return [WordResponse.model_validate(w) for w in words]


@router.post("/check", response_model=PromptCheckResponse)
async def check_prompt(
    request: PromptCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """检查提示词是否包含限制词"""
    prompt_lower = request.prompt.lower()

    # Get all active words
    query = select(PromptRestrictionWord).where(PromptRestrictionWord.is_active == 1)
    result = await db.execute(query)
    words = result.scalars().all()

    violations = []
    for word in words:
        if word.word.lower() in prompt_lower:
            violations.append({
                "word": word.word,
                "alternative": word.alternative,
                "severity": word.severity,
                "message": f"包含限制词: {word.word}" + (f", 建议替代: {word.alternative}" if word.alternative else "")
            })

    return PromptCheckResponse(
        is_safe=len(violations) == 0,
        violations=violations
    )


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """创建分类"""
    category = PromptRestrictionCategory(
        name=data.name,
        description=data.description,
        is_active=1
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        word_count=0
    )


@router.post("/words", response_model=WordResponse)
async def create_word(
    data: WordCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """创建限制词"""
    # Verify category exists
    cat_result = await db.execute(
        select(PromptRestrictionCategory).where(PromptRestrictionCategory.id == data.category_id)
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category not found")

    word = PromptRestrictionWord(
        category_id=data.category_id,
        word=data.word,
        alternative=data.alternative,
        severity=data.severity,
        is_active=1
    )
    db.add(word)
    await db.commit()
    await db.refresh(word)

    return WordResponse.model_validate(word)


@router.delete("/words/{word_id}")
async def delete_word(
    word_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """删除限制词"""
    result = await db.execute(
        select(PromptRestrictionWord).where(PromptRestrictionWord.id == word_id)
    )
    word = result.scalar_one_or_none()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    await db.delete(word)
    await db.commit()

    return {"message": "Word deleted"}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """删除分类（同时删除所有关联词条）"""
    result = await db.execute(
        select(PromptRestrictionCategory).where(PromptRestrictionCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
    await db.commit()

    return {"message": "Category and related words deleted"}
