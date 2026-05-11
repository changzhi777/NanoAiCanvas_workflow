"""
积分系统 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import User, PointsAccount, PointsTransaction, TransactionType, TransactionStatus, Team, TeamMember
from app.api.auth import get_current_user
from app.core.security import decode_token
from uuid import UUID

router = APIRouter(prefix="/points", tags=["points"])


# ============ Pydantic Schemas ============

class BalanceResponse(BaseModel):
    balance: int
    total_granted: int
    total_used: int


class DeductRequest(BaseModel):
    amount: int = 0
    model_type: Optional[str] = None  # 传入时自动按规则计价
    description: Optional[str] = None
    related_order_id: Optional[str] = None
    metadata: Optional[dict] = None


class DeductResponse(BaseModel):
    success: bool
    balance_before: int
    balance_after: int
    transaction_id: int


class GrantRequest(BaseModel):
    user_id: Optional[UUID] = None
    team_id: Optional[int] = None
    amount: int
    description: Optional[str] = None


class TransferRequest(BaseModel):
    from_user_id: Optional[UUID] = None
    from_team_id: Optional[int] = None
    to_user_id: Optional[UUID] = None
    to_team_id: Optional[int] = None
    amount: int
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    transaction_type: str
    amount: int
    balance_before: int
    balance_after: int
    status: str
    description: Optional[str]
    related_order_id: Optional[str]
    created_at: str


class TeamCreate(BaseModel):
    name: str


class TeamMemberAdd(BaseModel):
    user_id: UUID
    role: str = "member"


# ============ Helper Functions ============

async def get_or_create_user_account(db: AsyncSession, user_id: UUID) -> PointsAccount:
    """获取或创建用户积分账户"""
    result = await db.execute(
        select(PointsAccount).where(PointsAccount.user_id == user_id, PointsAccount.team_id.is_(None))
    )
    account = result.scalar_one_or_none()
    if not account:
        account = PointsAccount(user_id=user_id, balance=0)
        db.add(account)
        await db.commit()
        await db.refresh(account)
    return account


async def get_or_create_team_account(db: AsyncSession, team_id: int) -> PointsAccount:
    """获取或创建团队积分账户"""
    result = await db.execute(
        select(PointsAccount).where(PointsAccount.team_id == team_id, PointsAccount.user_id.is_(None))
    )
    account = result.scalar_one_or_none()
    if not account:
        account = PointsAccount(team_id=team_id, balance=0)
        db.add(account)
        await db.commit()
        await db.refresh(account)
    return account


async def execute_transaction(
    db: AsyncSession,
    account: PointsAccount,
    transaction_type: TransactionType,
    amount: int,
    description: Optional[str] = None,
    related_order_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> PointsTransaction:
    """执行积分交易"""
    balance_before = account.balance

    if transaction_type in [TransactionType.DEDUCT, TransactionType.TRANSFER_OUT]:
        if account.balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        account.balance -= amount
        account.total_used += amount
    else:
        account.balance += amount
        account.total_granted += amount

    balance_after = account.balance

    transaction = PointsTransaction(
        account_id=account.id,
        transaction_type=transaction_type.value if hasattr(transaction_type, 'value') else transaction_type,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        status="success",
        description=description,
        related_order_id=related_order_id,
        meta_data=str(metadata) if metadata else None
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    return transaction


# ============ API Endpoints ============

@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户积分余额"""
    account = await get_or_create_user_account(db, current_user.id)
    return BalanceResponse(
        balance=account.balance,
        total_granted=account.total_granted,
        total_used=account.total_used
    )


@router.post("/balance", response_model=BalanceResponse)
async def create_personal_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """为当前用户创建积分账户"""
    account = await get_or_create_user_account(db, current_user.id)
    return BalanceResponse(
        balance=account.balance,
        total_granted=account.total_granted,
        total_used=account.total_used
    )


class CheckRequest(BaseModel):
    model_type: str = ""
    amount: int = 0


@router.post("/check")
async def check_points_balance(
    request: CheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """检查用户积分余额是否足够执行任务"""
    from app.services.points_service import check_balance as _check

    result = await _check(db, current_user.id, request.model_type, request.amount if request.amount else None)
    return result


@router.post("/deduct", response_model=DeductResponse)
async def deduct_points(
    request: DeductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    扣减用户积分（AI任务完成时调用）
    支持 model_type 自动按规则计价，或直接传 amount
    """
    from app.services.points_service import auto_deduct

    # 有 model_type 时走自动计价（忽略 amount）
    if request.model_type:
        tx = await auto_deduct(
            db=db,
            user_id=current_user.id,
            node_type=request.model_type,
            description=request.description,
            related_order_id=request.related_order_id,
            metadata=request.metadata,
        )
        return DeductResponse(
            success=True,
            balance_before=tx.balance_before,
            balance_after=tx.balance_after,
            transaction_id=tx.id,
        )

    # 兼容旧逻辑：直接传 amount
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    account = await get_or_create_user_account(db, current_user.id)

    if account.balance < request.amount:
        raise HTTPException(
            status_code=402,
            detail="Insufficient balance",
            headers={"X-Insufficient-Balance": "true"}
        )

    transaction = await execute_transaction(
        db=db,
        account=account,
        transaction_type=TransactionType.DEDUCT,
        amount=request.amount,
        description=request.description or "AI任务扣费",
        related_order_id=request.related_order_id,
        metadata=request.metadata
    )

    return DeductResponse(
        success=True,
        balance_before=transaction.balance_before,
        balance_after=transaction.balance_after,
        transaction_id=transaction.id
    )


@router.post("/grant", response_model=BalanceResponse)
async def grant_points(
    request: GrantRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    发放积分（管理员功能）
    可以发给用户或团队
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    if request.user_id:
        account = await get_or_create_user_account(db, request.user_id)
        transaction_type = TransactionType.GRANT
        description = request.description or f"管理员发放积分给用户 {request.user_id}"
    elif request.team_id:
        account = await get_or_create_team_account(db, request.team_id)
        transaction_type = TransactionType.GRANT
        description = request.description or f"管理员发放积分给团队 {request.team_id}"
    else:
        raise HTTPException(status_code=400, detail="Must specify user_id or team_id")

    await execute_transaction(
        db=db,
        account=account,
        transaction_type=transaction_type,
        amount=request.amount,
        description=description
    )

    return BalanceResponse(
        balance=account.balance,
        total_granted=account.total_granted,
        total_used=account.total_used
    )


@router.post("/transfer", response_model=DeductResponse)
async def transfer_points(
    request: TransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    转账积分（用户之间或团队之间）
    支持：用户->用户、团队->用户、用户->团队、团队->团队
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # 确定转出账户
    if request.from_user_id:
        from_account = await get_or_create_user_account(db, request.from_user_id)
    elif request.from_team_id:
        from_account = await get_or_create_team_account(db, request.from_team_id)
    else:
        # 默认从当前用户转出
        from_account = await get_or_create_user_account(db, current_user.id)

    # 确定转入账户
    if request.to_user_id:
        to_account = await get_or_create_user_account(db, request.to_user_id)
        to_type = TransactionType.TRANSFER_IN
    elif request.to_team_id:
        to_account = await get_or_create_team_account(db, request.to_team_id)
        to_type = TransactionType.TRANSFER_IN
    else:
        raise HTTPException(status_code=400, detail="Must specify to_user_id or to_team_id")

    # 执行转出
    out_transaction = await execute_transaction(
        db=db,
        account=from_account,
        transaction_type=TransactionType.TRANSFER_OUT,
        amount=request.amount,
        description=request.description or f"积分转出"
    )

    # 执行转入
    in_transaction = await execute_transaction(
        db=db,
        account=to_account,
        transaction_type=to_type,
        amount=request.amount,
        description=request.description or f"积分转入"
    )

    return DeductResponse(
        success=True,
        balance_before=out_transaction.balance_before,
        balance_after=out_transaction.balance_after,
        transaction_id=out_transaction.id
    )


@router.get("/history", response_model=List[TransactionResponse])
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的积分交易历史"""
    account = await get_or_create_user_account(db, current_user.id)

    result = await db.execute(
        select(PointsTransaction)
        .where(PointsTransaction.account_id == account.id)
        .order_by(desc(PointsTransaction.created_at))
        .offset(offset)
        .limit(limit)
    )
    transactions = result.scalars().all()

    return [
        TransactionResponse(
            id=t.id,
            transaction_type=t.transaction_type.value,
            amount=t.amount,
            balance_before=t.balance_before,
            balance_after=t.balance_after,
            status=t.status.value,
            description=t.description,
            related_order_id=t.related_order_id,
            created_at=t.created_at.isoformat() if t.created_at else ""
        )
        for t in transactions
    ]


# ============ Team Points Pool APIs ============

@router.post("/team/create", response_model=dict)
async def create_team(
    request: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建团队（自动创建团队积分池）"""
    team = Team(name=request.name, owner_id=current_user.id)
    db.add(team)
    await db.commit()
    await db.refresh(team)

    # 创建团队积分账户
    team_account = PointsAccount(team_id=team.id, balance=0)
    db.add(team_account)
    await db.commit()

    return {"id": team.id, "name": team.name, "created_at": team.created_at.isoformat()}


@router.get("/team/{team_id}", response_model=dict)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取团队信息（包含积分池余额）"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 检查权限：团队成员或管理员
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none() and team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 获取团队积分池
    account = await get_or_create_team_account(db, team_id)

    return {
        "id": team.id,
        "name": team.name,
        "owner_id": team.owner_id,
        "points_balance": account.balance,
        "total_granted": account.total_granted,
        "total_used": account.total_used,
        "members": [
            {"user_id": m.user_id, "role": m.role, "joined_at": m.joined_at.isoformat()}
            for m in team.members
        ]
    }


@router.post("/team/{team_id}/grant", response_model=BalanceResponse)
async def grant_to_team_pool(
    team_id: int,
    request: GrantRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """向团队积分池发放积分"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 检查权限：仅团队所有者或管理员
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only team owner can grant points")

    account = await get_or_create_team_account(db, team_id)

    await execute_transaction(
        db=db,
        account=account,
        transaction_type=TransactionType.GRANT,
        amount=request.amount,
        description=request.description or f"向团队积分池发放积分"
    )

    return BalanceResponse(
        balance=account.balance,
        total_granted=account.total_granted,
        total_used=account.total_used
    )


@router.post("/team/{team_id}/use", response_model=DeductResponse)
async def use_team_points(
    team_id: int,
    request: DeductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    使用团队积分池（成员调用）
    从团队积分池扣费
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 检查是否是团队成员
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none() and team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a team member")

    account = await get_or_create_team_account(db, team_id)

    if account.balance < request.amount:
        raise HTTPException(
            status_code=402,
            detail="Team points pool insufficient",
            headers={"X-Insufficient-Balance": "true"}
        )

    transaction = await execute_transaction(
        db=db,
        account=account,
        transaction_type=TransactionType.DEDUCT,
        amount=request.amount,
        description=request.description or f"使用团队积分池: {current_user.username}",
        related_order_id=request.related_order_id,
        metadata=request.metadata
    )

    return DeductResponse(
        success=True,
        balance_before=transaction.balance_before,
        balance_after=transaction.balance_after,
        transaction_id=transaction.id
    )


@router.post("/team/{team_id}/member/add", response_model=dict)
async def add_team_member(
    team_id: int,
    request: TeamMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """添加团队成员"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 检查权限：仅团队所有者或管理员
    if team.owner_id != current_user.id:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id,
                TeamMember.role.in_(["owner", "admin"])
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized")

    # 检查用户是否已是成员
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == request.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already a member")

    member = TeamMember(team_id=team_id, user_id=request.user_id, role=request.role)
    db.add(member)
    await db.commit()

    return {"success": True, "message": "Member added"}


@router.get("/team/{team_id}/members", response_model=List[dict])
async def list_team_members(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """列出团队成员"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 检查权限
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none() and team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "role": m.role,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None
        }
        for m in team.members
    ]