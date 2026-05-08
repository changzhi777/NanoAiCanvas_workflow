"""用户通知 API + 管理端通知接口"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import User, Notification
from app.models.notification import NotificationType
from app.api.auth import get_current_user, require_admin

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ============ Pydantic Schemas ============

class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: Optional[str]
    is_read: bool
    created_at: str


class UnreadCountResponse(BaseModel):
    count: int


class AdminNotificationSend(BaseModel):
    title: str
    content: str
    notification_type: str = "system"
    receiver_id: Optional[str] = None
    team_id: Optional[str] = None


class AdminNotificationRecord(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: Optional[str]
    is_read: bool
    created_at: str
    sender_name: Optional[str] = None


# ============ Helper ============

async def create_notification(
    db: AsyncSession,
    user_id,
    ntype: NotificationType,
    title: str,
    message: str = None,
) -> Notification:
    n = Notification(user_id=user_id, type=ntype, title=title, message=message)
    db.add(n)
    await db.commit()
    await db.refresh(n)
    return n


def _notification_type_from_str(ntype: str) -> NotificationType:
    mapping = {
        "system": NotificationType.SYSTEM,
        "approval": NotificationType.APPROVAL,
        "rejection": NotificationType.REJECTION,
        "points_grant": NotificationType.POINTS_GRANT,
        "points_deduct": NotificationType.POINTS_DEDUCT,
        "team_invite": NotificationType.TEAM_INVITE,
    }
    return mapping.get(ntype, NotificationType.SYSTEM)


# ============ 用户端接口 ============

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = 30,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()
    return [
        NotificationResponse(
            id=n.id,
            type=n.type.value,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in items
    ]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    return UnreadCountResponse(count=result.scalar() or 0)


@router.post("/read/{notification_id}")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    await db.commit()
    return {"success": True}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"success": True}


# ============ 管理端接口 ============

@router.get("/records", response_model=List[AdminNotificationRecord])
async def list_notification_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    notification_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """管理端：获取所有通知记录"""
    query = select(Notification, User).join(
        User, Notification.user_id == User.id, isouter=True
    )

    if notification_type:
        try:
            nt = _notification_type_from_str(notification_type)
            query = query.where(Notification.type == nt)
        except ValueError:
            pass

    offset = (page - 1) * page_size
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    return [
        AdminNotificationRecord(
            id=n.id,
            user_id=n.user_id,
            type=n.type.value if hasattr(n.type, 'value') else str(n.type),
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else "",
            sender_name=u.username if u else "系统",
        )
        for n, u in rows
    ]


@router.post("", response_model=dict)
async def admin_send_notification(
    data: AdminNotificationSend,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """管理端：发送通知"""
    ntype = _notification_type_from_str(data.notification_type)
    recipients_count = 0

    if data.notification_type == "broadcast":
        # 全站广播：给所有用户发送
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()
        for user in users:
            await _create_notification_silent(db, user.id, ntype, data.title, data.content)
            recipients_count += 1
    elif data.receiver_id:
        # 指定用户
        await _create_notification_silent(db, UUID(data.receiver_id), ntype, data.title, data.content)
        recipients_count = 1
    elif data.team_id:
        # 团队消息
        from app.models import TeamMember
        members_result = await db.execute(
            select(TeamMember).where(TeamMember.team_id == UUID(data.team_id))
        )
        members = members_result.scalars().all()
        for member in members:
            await _create_notification_silent(db, member.user_id, ntype, data.title, data.content)
            recipients_count += 1
    else:
        raise HTTPException(status_code=400, detail="请指定接收者（receiver_id/team_id）或使用 broadcast 类型")

    return {
        "success": True,
        "notification_id": "",
        "recipients_count": recipients_count,
    }


async def _create_notification_silent(
    db: AsyncSession,
    user_id: UUID,
    ntype: NotificationType,
    title: str,
    message: str = None,
) -> Notification:
    n = Notification(user_id=user_id, type=ntype, title=title, message=message)
    db.add(n)
    return n
