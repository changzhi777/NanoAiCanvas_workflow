"""
积分服务层 — 封装计价、扣费、校验的完整流程
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, Tuple

from app.models.points import PointsAccount, PointsTransaction, TransactionType, TransactionStatus, BillingRule


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
    """按 model_type 查询 BillingRule，返回每单位积分价格"""
    result = await db.execute(
        select(BillingRule).where(
            BillingRule.model_type == model_type,
            BillingRule.is_active == 1,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        return 0  # 无规则 = 免费
    return int(rule.points_per_unit)


def node_type_to_model_type(node_type: str) -> str:
    """将工作流节点类型映射为计费模型类型"""
    mapping = {
        # image
        "nano_banana_2": "image", "nano_banana_pro": "image", "gpt_image_2": "image",
        "minimax_image": "image", "jimeng_image": "image",
        "character_designer": "image", "scene_designer": "image",
        "storyboard_generator": "image",
        # video
        "minimax_video": "video", "jimeng_video": "video", "glm_video": "video",
        # audio
        "minimax_speech": "audio", "minimax_music": "audio", "glm_tts": "audio",
        "background_music": "audio",
        # text
        "script_generator": "text", "dialogue_generator": "text",
        "minimax_text": "text", "glm_text": "text", "glm_multimodal": "text",
        "qwen_text": "text", "qwen_coding": "text", "kimi_text": "text",
        "minimax_coding": "text",
        "director_agent": "text", "screenwriter_agent": "text",
    }
    return mapping.get(node_type, "text")


async def check_balance(
    db: AsyncSession, user_id: UUID, model_type: str, amount: Optional[int] = None
) -> dict:
    """检查用户余额是否足够"""
    account = await get_or_create_account(db, user_id)
    required = amount if amount else await resolve_price(db, model_type)
    return {
        "sufficient": account.balance >= required,
        "required": required,
        "balance": account.balance,
        "account_id": account.id,
    }


async def auto_deduct(
    db: AsyncSession,
    user_id: UUID,
    node_type: str,
    description: Optional[str] = None,
    related_order_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> PointsTransaction:
    """
    自动计价并扣费：查规则 → 检查余额 → 扣费 → 记录
    """
    model_type = node_type_to_model_type(node_type)
    amount = await resolve_price(db, model_type)
    account = await get_or_create_account(db, user_id)
    balance_before = account.balance

    if amount > 0:
        if account.balance < amount:
            raise HTTPException(
                status_code=402,
                detail=f"积分不足: 需要 {amount}，当前余额 {account.balance}",
                headers={"X-Insufficient-Balance": "true"},
            )
        account.balance -= amount
        account.total_used += amount

    tx = PointsTransaction(
        account_id=account.id,
        transaction_type=TransactionType.DEDUCT,
        amount=amount,
        balance_before=balance_before,
        balance_after=account.balance,
        status=TransactionStatus.SUCCESS,
        description=description or (f"[免费] {node_type}" if amount == 0 else f"AI任务扣费 ({node_type})"),
        related_order_id=related_order_id,
        meta_data=str(metadata) if metadata else None,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx
