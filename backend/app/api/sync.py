from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import User, Operation, OperationType, EntityType
from app.api.auth import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


class OperationRecord(BaseModel):
    id: Optional[UUID] = None
    workflow_id: UUID
    device_id: str
    op_type: str
    entity_type: str
    entity_id: UUID
    payload: dict
    timestamp: str


class PushRequest(BaseModel):
    operations: List[OperationRecord]
    device_id: str


class PushResponse(BaseModel):
    synced_count: int
    conflicts: List[dict]


class PullRequest(BaseModel):
    workflow_id: UUID
    device_id: str
    since: Optional[str] = None


class PullResponse(BaseModel):
    operations: List[OperationRecord]
    server_time: str


@router.post("/push")
async def push_operations(
    data: PushRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    synced_count = 0
    conflicts = []

    for op in data.operations:
        # Check for conflicts based on timestamp
        existing = await db.execute(
            select(Operation).where(
                Operation.workflow_id == op.workflow_id,
                Operation.entity_id == op.entity_id,
                Operation.entity_type == op.entity_type,
            ).order_by(Operation.timestamp.desc())
        )
        existing_op = existing.scalar_one_or_none()

        if existing_op and existing_op.timestamp > datetime.fromisoformat(op.timestamp.replace("Z", "+00:00")):
            conflicts.append({
                "entity_id": str(op.entity_id),
                "local_timestamp": op.timestamp,
                "server_timestamp": existing_op.timestamp.isoformat(),
                "resolution": "server_wins",
            })
            continue

        # Save operation
        new_op = Operation(
            workflow_id=op.workflow_id,
            user_id=current_user.id,
            device_id=op.device_id,
            op_type=OperationType(op.op_type),
            entity_type=EntityType(op.entity_type),
            entity_id=op.entity_id,
            payload=op.payload,
            timestamp=datetime.fromisoformat(op.timestamp.replace("Z", "+00:00")),
            synced=True,
        )
        db.add(new_op)
        synced_count += 1

    await db.commit()

    return PushResponse(synced_count=synced_count, conflicts=conflicts)


@router.post("/pull")
async def pull_operations(
    data: PullRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Operation).where(
        Operation.workflow_id == data.workflow_id,
        Operation.user_id == current_user.id,
    )

    if data.since:
        since_dt = datetime.fromisoformat(data.since.replace("Z", "+00:00"))
        query = query.where(Operation.timestamp > since_dt)

    query = query.order_by(Operation.timestamp.asc())
    result = await db.execute(query)
    operations = result.scalars().all()

    return PullResponse(
        operations=[
            OperationRecord(
                id=op.id,
                workflow_id=op.workflow_id,
                device_id=op.device_id,
                op_type=op.op_type.value,
                entity_type=op.entity_type.value,
                entity_id=op.entity_id,
                payload=op.payload or {},
                timestamp=op.timestamp.isoformat() if op.timestamp else "",
            )
            for op in operations
        ],
        server_time=datetime.utcnow().isoformat(),
    )