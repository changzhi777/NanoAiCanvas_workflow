"""用户通知 API + 管理端通知接口"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc, or_, text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models import User, Notification
from app.models.notification import NotificationType, NotificationStatus
from app.api.auth import get_current_user, require_admin

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ============ Pydantic Schemas ============

class NotificationResponse(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    notification_type: str
    status: str
    sender_name: Optional[str] = None
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
    id: str
    receiver_id: str
    title: str
    content: Optional[str] = None
    notification_type: str
    status: str
    sender_name: Optional[str] = None
    created_at: str


# ============ 用户端接口 ============

@router.get("")
async def list_notifications(
    limit: int = 30,
    offset: int = 0,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if offset == 0 and page > 1:
        offset = (page - 1) * limit
    result = await db.execute(
        select(Notification, User)
        .outerjoin(User, Notification.sender_id == User.id)
        .where(Notification.receiver_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    items = []
    for n, sender in rows:
        items.append({
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "notification_type": n.notification_type if isinstance(n.notification_type, str) else (n.notification_type.value if n.notification_type else "system"),
            "status": n.status if isinstance(n.status, str) else (n.status.value if n.status else "pending"),
            "sender_name": sender.username if sender else None,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        })

    # 统计总数和未读数
    total_result = await db.execute(
        select(func.count()).select_from(Notification)
        .where(Notification.receiver_id == current_user.id)
    )
    unread_result = await db.execute(
        select(func.count()).select_from(Notification)
        .where(Notification.receiver_id == current_user.id, Notification.status != text("'READ'::notificationstatus"))
    )
    return {
        "notifications": items,
        "total": total_result.scalar() or 0,
        "unread_count": unread_result.scalar() or 0,
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.receiver_id == current_user.id,
            Notification.status != text("'READ'::notificationstatus"),
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
            Notification.receiver_id == current_user.id,
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.status = "READ"
    n.read_at = datetime.utcnow()
    await db.commit()
    return {"success": True}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.receiver_id == current_user.id, Notification.status != text("'READ'::notificationstatus"))
        .values(status=text("'READ'::notificationstatus"), read_at=datetime.utcnow())
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
        User, Notification.receiver_id == User.id, isouter=True
    )

    if notification_type:
        query = query.where(Notification.notification_type == notification_type)

    offset = (page - 1) * page_size
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    return [
        AdminNotificationRecord(
            id=str(n.id),
            receiver_id=str(n.receiver_id),
            title=n.title,
            content=n.content,
            notification_type=n.notification_type if isinstance(n.notification_type, str) else str(n.notification_type),
            status=n.status if isinstance(n.status, str) else str(n.status),
            sender_name="系统",
            created_at=n.created_at.isoformat() if n.created_at else "",
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
    recipients_count = 0

    if data.notification_type == "broadcast":
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()
        for user in users:
            n = Notification(
                sender_id=admin.id,
                receiver_id=user.id,
                notification_type=data.notification_type,
                title=data.title,
                content=data.content,
            )
            db.add(n)
            recipients_count += 1
    elif data.receiver_id:
        n = Notification(
            sender_id=admin.id,
            receiver_id=UUID(data.receiver_id),
            notification_type=data.notification_type,
            title=data.title,
            content=data.content,
        )
        db.add(n)
        recipients_count = 1
    elif data.team_id:
        from app.models import TeamMember
        members_result = await db.execute(
            select(TeamMember).where(TeamMember.team_id == int(data.team_id))
        )
        members = members_result.scalars().all()
        for member in members:
            n = Notification(
                sender_id=admin.id,
                receiver_id=member.user_id,
                notification_type=data.notification_type,
                title=data.title,
                content=data.content,
            )
            db.add(n)
            recipients_count += 1
    else:
        raise HTTPException(status_code=400, detail="请指定接收者（receiver_id/team_id）或使用 broadcast 类型")

    await db.commit()
    return {
        "success": True,
        "recipients_count": recipients_count,
    }
