"""
管理员积分系统 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, String
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import User, PointsAccount, PointsTransaction, TransactionType, TransactionStatus, BillingRule, RechargeRecord
from app.api.auth import require_admin

router = APIRouter(prefix="/v2/admin/points", tags=["points-admin"])


# ============ Pydantic Schemas ============

class UserPointsInfo(BaseModel):
    """用户积分信息"""
    user_id: str
    username: str
    email: str
    balance: int
    total_granted: int
    total_used: int
    created_at: str


class UserListResponse(BaseModel):
    """用户列表响应"""
    users: List[UserPointsInfo]
    total: int


class RechargeRequest(BaseModel):
    """充值请求"""
    user_id: UUID
    amount: int
    description: Optional[str] = "管理员充值"


class RechargeResponse(BaseModel):
    """充值响应"""
    success: bool
    transaction_id: int
    new_balance: int
    amount: int


class BillingRuleSchema(BaseModel):
    """扣费规则"""
    id: int
    name: str
    model_type: str
    points_per_unit: float
    unit: str
    is_active: bool
    created_at: str


class BillingRuleCreate(BaseModel):
    """创建扣费规则"""
    name: str
    model_type: str
    points_per_unit: float
    unit: str = "per_call"


class BillingRuleUpdate(BaseModel):
    """更新扣费规则"""
    name: Optional[str] = None
    points_per_unit: Optional[float] = None
    is_active: Optional[bool] = None


class TransactionRecordSchema(BaseModel):
    """交易记录"""
    id: int
    user_id: str
    username: str
    transaction_type: str
    amount: int
    balance_before: int
    balance_after: int
    status: str
    description: Optional[str]
    created_at: str


class RechargeRecordSchema(BaseModel):
    """充值记录"""
    id: int
    user_id: str
    username: str
    amount: int
    payment_method: Optional[str]
    payment_status: str
    order_id: Optional[str]
    created_at: str
    paid_at: Optional[str]


# ============ 辅助函数 ============

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


async def execute_recharge(
    db: AsyncSession,
    account: PointsAccount,
    amount: int,
    description: str
) -> PointsTransaction:
    """执行充值"""
    balance_before = account.balance
    account.balance += amount
    account.total_granted += amount
    balance_after = account.balance

    transaction = PointsTransaction(
        account_id=account.id,
        transaction_type="grant",
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        status="success",
        description=description
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    return transaction


# ============ API Endpoints ============

@router.get("/users", response_model=UserListResponse)
async def list_users_with_points(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    获取所有用户及其积分信息
    支持分页和搜索
    """
    # 构建查询
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        search_filter = f"%{search}%"
        query = query.where(User.username.ilike(search_filter) | User.email.ilike(search_filter))
        count_query = count_query.where(User.username.ilike(search_filter) | User.email.ilike(search_filter))

    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询用户
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(desc(User.created_at))
    users_result = await db.execute(query)
    users = users_result.scalars().all()

    # 获取每个用户的积分账户
    user_ids = [u.id for u in users]
    accounts_result = await db.execute(
        select(PointsAccount).where(PointsAccount.user_id.in_(user_ids))
    )
    accounts = {acc.user_id: acc for acc in accounts_result.scalars().all()}

    # 构建响应
    user_points_list = []
    for user in users:
        account = accounts.get(user.id)
        user_points_list.append(UserPointsInfo(
            user_id=str(user.id),
            username=user.username,
            email=user.email,
            balance=account.balance if account else 0,
            total_granted=account.total_granted if account else 0,
            total_used=account.total_used if account else 0,
            created_at=user.created_at.isoformat() if user.created_at else ""
        ))

    return UserListResponse(users=user_points_list, total=total)


@router.post("/recharge", response_model=RechargeResponse)
async def recharge_user_points(
    request: RechargeRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    管理员为用户充值积分
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="充值金额必须大于 0")

    # 验证用户存在
    user_result = await db.execute(select(User).where(User.id == request.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 获取或创建积分账户
    account = await get_or_create_user_account(db, request.user_id)

    # 执行充值
    transaction = await execute_recharge(
        db=db,
        account=account,
        amount=request.amount,
        description=request.description or f"管理员充值"
    )

    return RechargeResponse(
        success=True,
        transaction_id=transaction.id,
        new_balance=account.balance,
        amount=request.amount
    )


@router.get("/transactions", response_model=List[TransactionRecordSchema])
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_id: Optional[UUID] = None,
    transaction_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    获取交易记录列表
    支持按用户和交易类型筛选
    """
    # 获取所有用户积分账户
    if user_id:
        accounts_result = await db.execute(
            select(PointsAccount).where(PointsAccount.user_id == user_id)
        )
        accounts = [accounts_result.scalar_one_or_none()]
    else:
        accounts_result = await db.execute(select(PointsAccount))
        accounts = list(accounts_result.scalars().all())

    if not accounts:
        return []

    account_ids = [a.id for a in accounts if a]
    if not account_ids:
        return []

    # 查询交易记录
    query = select(PointsTransaction, PointsAccount, User).join(
        PointsAccount, PointsTransaction.account_id == PointsAccount.id
    ).join(User, PointsAccount.user_id == User.id).where(
        PointsTransaction.account_id.in_(account_ids)
    )

    if transaction_type:
        query = query.where(PointsTransaction.transaction_type == transaction_type)

    offset = (page - 1) * page_size
    query = query.order_by(desc(PointsTransaction.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    return [
        TransactionRecordSchema(
            id=t.id,
            user_id=str(u.id),
            username=u.username,
            transaction_type=t.transaction_type if isinstance(t.transaction_type, str) else t.transaction_type.value,
            amount=t.amount,
            balance_before=t.balance_before,
            balance_after=t.balance_after,
            status=t.status if isinstance(t.status, str) else t.status.value,
            description=t.description,
            created_at=t.created_at.isoformat() if t.created_at else ""
        )
        for t, a, u in rows
    ]


# ============ 扣费规则管理 ============

@router.get("/rules", response_model=List[BillingRuleSchema])
async def list_billing_rules(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """获取扣费规则列表"""
    result = await db.execute(select(BillingRule).order_by(BillingRule.id))
    rules = result.scalars().all()

    return [
        BillingRuleSchema(
            id=r.id,
            name=r.name,
            model_type=r.model_type,
            points_per_unit=r.points_per_unit,
            unit=r.unit,
            is_active=bool(r.is_active),
            created_at=r.created_at.isoformat() if r.created_at else ""
        )
        for r in rules
    ]


@router.post("/rules", response_model=BillingRuleSchema)
async def create_billing_rule(
    request: BillingRuleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """创建扣费规则"""
    if request.points_per_unit <= 0:
        raise HTTPException(status_code=400, detail="每单位积分必须大于 0")

    if request.unit not in ["per_call", "per_token", "per_second"]:
        raise HTTPException(status_code=400, detail="无效的单位类型")

    rule = BillingRule(
        name=request.name,
        model_type=request.model_type,
        points_per_unit=request.points_per_unit,
        unit=request.unit,
        is_active=1
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    return BillingRuleSchema(
        id=rule.id,
        name=rule.name,
        model_type=rule.model_type,
        points_per_unit=rule.points_per_unit,
        unit=rule.unit,
        is_active=bool(rule.is_active),
        created_at=rule.created_at.isoformat() if rule.created_at else ""
    )


@router.put("/rules/{rule_id}", response_model=BillingRuleSchema)
async def update_billing_rule(
    rule_id: int,
    request: BillingRuleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """更新扣费规则"""
    result = await db.execute(select(BillingRule).where(BillingRule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    if request.name is not None:
        rule.name = request.name
    if request.points_per_unit is not None:
        if request.points_per_unit <= 0:
            raise HTTPException(status_code=400, detail="每单位积分必须大于 0")
        rule.points_per_unit = request.points_per_unit
    if request.is_active is not None:
        rule.is_active = 1 if request.is_active else 0

    await db.commit()
    await db.refresh(rule)

    return BillingRuleSchema(
        id=rule.id,
        name=rule.name,
        model_type=rule.model_type,
        points_per_unit=rule.points_per_unit,
        unit=rule.unit,
        is_active=bool(rule.is_active),
        created_at=rule.created_at.isoformat() if rule.created_at else ""
    )


@router.delete("/rules/{rule_id}")
async def delete_billing_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """删除扣费规则"""
    result = await db.execute(select(BillingRule).where(BillingRule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    await db.delete(rule)
    await db.commit()

    return {"success": True, "message": "规则已删除"}


@router.get("/rules/{rule_id}", response_model=BillingRuleSchema)
async def get_billing_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """获取单个扣费规则"""
    result = await db.execute(select(BillingRule).where(BillingRule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    return BillingRuleSchema(
        id=rule.id,
        name=rule.name,
        model_type=rule.model_type,
        points_per_unit=rule.points_per_unit,
        unit=rule.unit,
        is_active=bool(rule.is_active),
        created_at=rule.created_at.isoformat() if rule.created_at else ""
    )


# ============ 充值记录查询 ============

@router.get("/recharge-records", response_model=List[RechargeRecordSchema])
async def list_recharge_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    获取充值记录列表
    支持按用户和状态筛选
    """
    query = select(RechargeRecord, User).join(User, RechargeRecord.user_id == User.id)

    if user_id:
        query = query.where(RechargeRecord.user_id == user_id)
    if status:
        query = query.where(RechargeRecord.payment_status == status)

    offset = (page - 1) * page_size
    query = query.order_by(desc(RechargeRecord.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    return [
        RechargeRecordSchema(
            id=r.id,
            user_id=str(u.id),
            username=u.username,
            amount=r.amount,
            payment_method=r.payment_method,
            payment_status=r.payment_status,
            order_id=r.order_id,
            created_at=r.created_at.isoformat() if r.created_at else "",
            paid_at=r.paid_at.isoformat() if r.paid_at else None
        )
        for r, u in rows
    ]


@router.post("/recharge/create", response_model=dict)
async def create_recharge_order(
    user_id: UUID,
    amount: int,
    payment_method: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    创建充值订单（扫码充值）
    返回订单号用于生成支付二维码
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail="充值金额必须大于 0")

    if payment_method not in ["wechat", "alipay"]:
        raise HTTPException(status_code=400, detail="无效的支付方式")

    # 生成订单号
    order_id = f"RECHARGE_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{user_id.hex[:8]}"

    record = RechargeRecord(
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        payment_status="pending",
        order_id=order_id
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return {
        "order_id": order_id,
        "qr_code_url": f"/api/v2/admin/points/recharge/qrcode/{order_id}",  # 预留扩展
        "amount": amount,
        "payment_method": payment_method
    }


@router.get("/recharge/records/{order_id}", response_model=RechargeRecordSchema)
async def get_recharge_record(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """根据订单号查询充值记录"""
    result = await db.execute(
        select(RechargeRecord, User).join(User, RechargeRecord.user_id == User.id).where(
            RechargeRecord.order_id == order_id
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="订单不存在")

    r, u = row
    return RechargeRecordSchema(
        id=r.id,
        user_id=str(u.id),
        username=u.username,
        amount=r.amount,
        payment_method=r.payment_method,
        payment_status=r.payment_status,
        order_id=r.order_id,
        created_at=r.created_at.isoformat() if r.created_at else "",
        paid_at=r.paid_at.isoformat() if r.paid_at else None
    )


# ============ 统计仪表盘 ============

@router.get("/stats")
async def get_points_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """积分系统全局统计"""
    from datetime import timedelta

    # 总发放 / 总消耗
    grant_total = await db.execute(
        select(func.coalesce(func.sum(PointsAccount.total_granted), 0))
    )
    used_total = await db.execute(
        select(func.coalesce(func.sum(PointsAccount.total_used), 0))
    )
    # 活跃用户数（有余额或消耗过的）
    active_users = await db.execute(
        select(func.count(PointsAccount.id)).where(
            (PointsAccount.total_used > 0) | (PointsAccount.balance > 0)
        )
    )
    # 今日消耗
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_used = await db.execute(
        select(func.coalesce(func.sum(PointsTransaction.amount), 0)).where(
            PointsTransaction.transaction_type.cast(String) == "deduct",
            PointsTransaction.created_at >= today,
        )
    )
    # 模型消耗分布（近 7 天）
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    model_dist_rows = await db.execute(
        select(
            PointsTransaction.description,
            func.sum(PointsTransaction.amount).label("total"),
        )
        .where(
            PointsTransaction.transaction_type.cast(String) == "deduct",
            PointsTransaction.created_at >= seven_days_ago,
            PointsTransaction.amount > 0,
        )
        .group_by(PointsTransaction.description)
        .order_by(desc("total"))
        .limit(10)
    )
    model_distribution = [
        {"name": r[0] or "未知", "total": r[1]}
        for r in model_dist_rows.all()
    ]

    # 近 7 天每日消耗
    daily_rows = await db.execute(
        select(
            func.date_trunc("day", PointsTransaction.created_at).label("day"),
            func.sum(PointsTransaction.amount).label("total"),
        )
        .where(
            PointsTransaction.transaction_type.cast(String) == "deduct",
            PointsTransaction.created_at >= seven_days_ago,
            PointsTransaction.amount > 0,
        )
        .group_by("day")
        .order_by("day")
    )
    daily_trend = [
        {"date": r[0].strftime("%m-%d") if r[0] else "", "total": r[1]}
        for r in daily_rows.all()
    ]

    return {
        "total_granted": grant_total.scalar(),
        "total_used": used_total.scalar(),
        "active_users": active_users.scalar(),
        "today_used": today_used.scalar(),
        "model_distribution": model_distribution,
        "daily_trend": daily_trend,
    }