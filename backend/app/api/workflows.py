from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import User, Workflow, WorkflowVersion
from app.api.auth import get_current_user

router = APIRouter(prefix="/workflows", tags=["workflows"])


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    data: Optional[dict] = {}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None


class WorkflowResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    data: dict
    version: int
    cover_asset_id: Optional[UUID]
    created_at: str
    updated_at: str


class WorkflowListResponse(BaseModel):
    items: List[WorkflowResponse]
    total: int
    page: int
    page_size: int


@router.post("", response_model=WorkflowResponse)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workflow = Workflow(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        data=data.data or {},
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        data=workflow.data or {},
        version=workflow.version,
        cover_asset_id=workflow.cover_asset_id,
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
    )


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Workflow).where(Workflow.user_id == current_user.id, Workflow.is_deleted == False)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    query = query.order_by(Workflow.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    workflows = result.scalars().all()

    items = [
        WorkflowResponse(
            id=w.id,
            name=w.name,
            description=w.description,
            data=w.data or {},
            version=w.version,
            cover_asset_id=w.cover_asset_id,
            created_at=w.created_at.isoformat() if w.created_at else "",
            updated_at=w.updated_at.isoformat() if w.updated_at else "",
        )
        for w in workflows
    ]

    return WorkflowListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id, Workflow.is_deleted == False)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        data=workflow.data or {},
        version=workflow.version,
        cover_asset_id=workflow.cover_asset_id,
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
    )


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id, Workflow.is_deleted == False)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workflow, key, value)

    workflow.version += 1  # Optimistic locking
    await db.commit()
    await db.refresh(workflow)

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        data=workflow.data or {},
        version=workflow.version,
        cover_asset_id=workflow.cover_asset_id,
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
    )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id, Workflow.is_deleted == False)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow.is_deleted = True
    await db.commit()

    return {"message": "Workflow deleted"}


@router.post("/{workflow_id}/versions", response_model=WorkflowResponse)
async def save_version(
    workflow_id: UUID,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id, Workflow.is_deleted == False)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Save current version
    version = WorkflowVersion(
        workflow_id=workflow.id,
        version=workflow.version,
        data=workflow.data or {},
        description=description,
    )
    db.add(version)
    workflow.version += 1
    await db.commit()

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        data=workflow.data or {},
        version=workflow.version,
        cover_asset_id=workflow.cover_asset_id,
        created_at=workflow.created_at.isoformat() if workflow.created_at else "",
        updated_at=workflow.updated_at.isoformat() if workflow.updated_at else "",
    )


@router.get("/{workflow_id}/versions")
async def list_versions(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id, Workflow.is_deleted == False)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get versions
    result = await db.execute(
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow_id)
        .order_by(WorkflowVersion.version.desc())
    )
    versions = result.scalars().all()

    return [
        {
            "id": str(v.id),
            "version": v.version,
            "description": v.description,
            "created_at": v.created_at.isoformat() if v.created_at else "",
        }
        for v in versions
    ]