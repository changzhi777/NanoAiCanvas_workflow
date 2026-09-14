"""
积分服务层 — 封装计价、扣费、校验的完整流程
支持团队优先扣减：先扣团队积分，不足时扣个人积分
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from app.models.points import PointsAccount, PointsTransaction, TransactionType, TransactionStatus, BillingRule, TeamMember, Team


async def get_or_create_account(db: AsyncSession, user_id: UUID) -> PointsAccount:
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


async def resolve_price(db: AsyncSession, model_type: str) -> int:
    result = await db.execute(
        select(BillingRule).where(BillingRule.model_type == model_type, BillingRule.is_active == 1)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        return 0
    return int(rule.points_per_unit)


FRIENDLY_NAMES = {
    "jimeng_image": "即梦SD 2.0", "jimeng_video": "即梦视频",
    "image": "通用图片", "video": "通用视频",
    "audio": "音频", "text": "文本",
    "storyboard_image": "分镜图", "storyboard_video": "分镜视频",
    "tvc": "TVC宣传片",
}


def node_type_to_model_type(node_type: str) -> str:
    mapping = {
        "jimeng_image": "jimeng_image",
        "nano_banana_2": "image", "nano_banana_pro": "image", "gpt_image_2": "image",
        "minimax_image": "image",
        "character_designer": "image", "scene_designer": "image",
        "storyboard_generator": "image",
        "storyboard_image": "image",
        "jimeng_video": "jimeng_video",
        "minimax_video": "video", "glm_video": "video",
        "storyboard_video": "video",
        "tvc": "video",
        "minimax_speech": "audio", "minimax_music": "audio", "glm_tts": "audio",
        "background_music": "audio",
        "script_generator": "text", "dialogue_generator": "text",
        "minimax_text": "text", "glm_text": "text", "glm_multimodal": "text",
        "qwen_text": "text", "qwen_coding": "text", "kimi_text": "text",
        "minimax_coding": "text",
        "director_agent": "text", "screenwriter_agent": "text",
        "tvc_script": "text",
    }
    return mapping.get(node_type, "text")


async def check_balance(db: AsyncSession, user_id: UUID, model_type: str, amount: Optional[int] = None) -> dict:
    account = await get_or_create_account(db, user_id)
    required = amount if amount else await resolve_price(db, model_type)
    return {"sufficient": account.balance >= required, "required": required, "balance": account.balance, "account_id": account.id}


async def auto_deduct(db: AsyncSession, user_id: UUID, node_type: str, description: Optional[str] = None, related_order_id: Optional[str] = None, metadata: Optional[dict] = None) -> PointsTransaction:
    model_type = node_type_to_model_type(node_type)
    amount = await resolve_price(db, model_type)
    account = await get_or_create_account(db, user_id)
    balance_before = account.balance
    friendly = FRIENDLY_NAMES.get(model_type, model_type)
    if amount > 0:
        if account.balance < amount:
            raise HTTPException(status_code=402, detail=f"积分不足: 需要{amount}，当前余额 {account.balance}", headers={"X-Insufficient-Balance": "true"})
        account.balance -= amount
        account.total_used += amount
    tx = PointsTransaction(
        account_id=account.id, transaction_type="deduct", amount=amount,
        balance_before=balance_before, balance_after=account.balance,
        status="success",
        description=description or (f"[免费] {friendly}" if amount == 0 else f"AI任务扣费 - {friendly}"),
        related_order_id=related_order_id, meta_data=str(metadata) if metadata else None,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


async def get_user_team(db: AsyncSession, user_id: UUID) -> Optional[int]:
    """获取用户所属团队 ID（取第一个）"""
    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id).limit(1)
    )
    row = result.scalar_one_or_none()
    return row


async def get_team_account(db: AsyncSession, team_id: int) -> Optional[PointsAccount]:
    """获取团队积分账户"""
    result = await db.execute(
        select(PointsAccount).where(PointsAccount.team_id == team_id)
    )
    return result.scalar_one_or_none()


async def deduct_team_first(
    db: AsyncSession,
    user_id: UUID,
    amount: int,
    description: Optional[str] = None,
    force_personal: bool = False,
) -> dict:
    """
    团队优先扣减积分
    - 先尝试扣团队积分
    - 团队不足时返回标记，由调用方决定是否扣个人
    - force_personal=True 时直接扣个人（用户已确认）
    返回 {"source": "team"|"personal", "amount": int, "team_remaining": int|None}
    """
    if amount <= 0:
        return {"source": "free", "amount": 0, "team_remaining": None}

    # 强制扣个人模式
    if force_personal:
        account = await get_or_create_account(db, user_id)
        if account.balance < amount:
            raise HTTPException(
                status_code=402,
                detail=f"个人积分不足: 需要{amount}，当前余额{account.balance}",
                headers={"X-Insufficient-Balance": "true"},
            )
        account.balance -= amount
        account.total_used += amount
        tx = PointsTransaction(
            account_id=account.id, transaction_type="deduct", amount=amount,
            balance_before=account.balance + amount, balance_after=account.balance,
            status="success", description=description or "个人积分扣费",
        )
        db.add(tx)
        await db.commit()
        return {"source": "personal", "amount": amount, "team_remaining": None}

    # 查找团队
    team_id = await get_user_team(db, user_id)
    if team_id:
        team_account = await get_team_account(db, team_id)
        if team_account and team_account.balance >= amount:
            # 团队余额充足，直接扣
            balance_before = team_account.balance
            team_account.balance -= amount
            team_account.total_used += amount
            tx = PointsTransaction(
                account_id=team_account.id, transaction_type="deduct", amount=amount,
                balance_before=balance_before, balance_after=team_account.balance,
                status="success", description=description or "团队积分扣费",
            )
            db.add(tx)
            await db.commit()
            return {"source": "team", "amount": amount, "team_remaining": team_account.balance}

        # 团队余额不足，标记需要确认
        team_balance = team_account.balance if team_account else 0
        raise HTTPException(
            status_code=402,
            detail=f"团队积分不足(余额{team_balance})，需要{amount}。是否使用个人积分支付？",
            headers={
                "X-Insufficient-Balance": "true",
                "X-Team-Insufficient": "true",
                "X-Required": str(amount),
                "X-Team-Balance": str(team_balance),
            },
        )

    # 没有团队，直接扣个人
    account = await get_or_create_account(db, user_id)
    if account.balance < amount:
        raise HTTPException(
            status_code=402,
            detail=f"积分不足: 需要{amount}，当前余额{account.balance}",
            headers={"X-Insufficient-Balance": "true"},
        )
    account.balance -= amount
    account.total_used += amount
    tx = PointsTransaction(
        account_id=account.id, transaction_type="deduct", amount=amount,
        balance_before=account.balance + amount, balance_after=account.balance,
        status="success", description=description or "个人积分扣费",
    )
    db.add(tx)
    await db.commit()
    return {"source": "personal", "amount": amount, "team_remaining": None}
