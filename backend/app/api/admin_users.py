"""管理员用户审批 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models import User
from app.models.user import UserStatus
from app.api.auth import get_current_user

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


class PendingUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    created_at: str
    status: str


class ApproveResponse(BaseModel):
    id: UUID
    username: str
    email: str
    status: str


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin user - currently all authenticated users are admin"""
    # TODO: Add proper admin role check
    return current_user


@router.get("/pending", response_model=List[PendingUserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all pending users awaiting approval"""
    result = await db.execute(
        select(User).where(User.status == UserStatus.PENDING)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return [
        PendingUserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            created_at=u.created_at.isoformat() if u.created_at else "",
            status=u.status,
        )
        for u in users
    ]


@router.post("/{user_id}/approve", response_model=ApproveResponse)
async def approve_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Approve a pending user and grant initial points"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"User status is '{user.status}', not 'pending'")

    user.status = UserStatus.APPROVED
    await db.commit()
    await db.refresh(user)

    # Grant initial 500 points
    try:
        from app.api.points import get_or_create_user_account, execute_transaction
        from app.models import TransactionType
        account = await get_or_create_user_account(db, user.id)
        await execute_transaction(
            db=db,
            account=account,
            transaction_type=TransactionType.GRANT,
            amount=500,
            description="New user registration bonus",
        )
    except Exception as e:
        # Non-critical: user is approved even if points fail
        print(f"Failed to grant initial points for {user.id}: {e}")

    return ApproveResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        status=user.status,
    )


@router.post("/{user_id}/reject", response_model=ApproveResponse)
async def reject_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Reject a pending user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"User status is '{user.status}', not 'pending'")

    user.status = UserStatus.REJECTED
    await db.commit()
    await db.refresh(user)

    return ApproveResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        status=user.status,
    )


@router.get("/all", response_model=List[PendingUserResponse])
async def list_all_users(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all users with optional status filter"""
    query = select(User).order_by(User.created_at.desc())
    if status_filter:
        query = query.where(User.status == status_filter)

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        PendingUserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            created_at=u.created_at.isoformat() if u.created_at else "",
            status=u.status,
        )
        for u in users
    ]
