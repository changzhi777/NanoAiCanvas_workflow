"""即时聊天 API — REST + WebSocket"""
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select, update, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.models.conversation import Conversation, ConversationMember, Message, ConversationType
from app.api.auth import get_current_user
from app.redis import redis_client

router = APIRouter(prefix="/chat", tags=["chat"])

# ============ WebSocket 连接管理 ============

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws
        await self._set_online(user_id)

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    async def broadcast_online_status(self, user_id: str, online: bool):
        msg = {"type": "online_status", "payload": {"user_id": user_id, "online": online}}
        for uid, ws in list(self.active.items()):
            if uid != user_id:
                try:
                    await ws.send_json(msg)
                except Exception:
                    pass

    async def _set_online(self, user_id: str):
        try:
            await redis_client.set(f"chat:online:{user_id}", "1", ex=120)
        except Exception:
            pass

    async def is_online(self, user_id: str) -> bool:
        try:
            return await redis_client.exists(f"chat:online:{user_id}")
        except Exception:
            return user_id in self.active

    async def get_online_users(self) -> list[str]:
        try:
            keys = await redis_client.keys("chat:online:*")
            return [k.split(":")[-1] for k in keys]
        except Exception:
            return list(self.active.keys())


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def chat_ws(ws: WebSocket, user_id: str):
    await manager.connect(user_id, ws)
    await manager.broadcast_online_status(user_id, True)
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await manager._set_online(user_id)
                await ws.send_json({"type": "pong"})
            elif msg_type == "message":
                await _handle_chat_message(user_id, data.get("payload", {}))
            elif msg_type == "read":
                await _handle_mark_read(user_id, data.get("payload", {}))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
        try:
            await redis_client.delete(f"chat:online:{user_id}")
        except Exception:
            pass
        await manager.broadcast_online_status(user_id, False)


async def _handle_chat_message(sender_id: str, payload: dict):
    conversation_id = payload.get("conversation_id")
    content = payload.get("content", "").strip()
    if not conversation_id or not content:
        return

    from app.database import async_session_maker
    async with async_session_maker() as db:
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=uuid.UUID(conversation_id),
            sender_id=uuid.UUID(sender_id),
            content=content,
        )
        db.add(msg)

        conv = await db.get(Conversation, uuid.UUID(conversation_id))
        if conv:
            conv.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(msg)

        msg_data = {
            "type": "message",
            "payload": {
                "id": str(msg.id),
                "conversation_id": str(msg.conversation_id),
                "sender_id": str(msg.sender_id),
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else "",
            },
        }

        # 发送给自己（确认）
        await manager.send_to_user(sender_id, msg_data)

        # 发送给同会话的其他成员
        result = await db.execute(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == uuid.UUID(conversation_id)
            )
        )
        for (member_id,) in result.all():
            uid = str(member_id)
            if uid != sender_id:
                await manager.send_to_user(uid, msg_data)


async def _handle_mark_read(user_id: str, payload: dict):
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        return
    from app.database import async_session_maker
    async with async_session_maker() as db:
        await db.execute(
            update(Message)
            .where(
                Message.conversation_id == uuid.UUID(conversation_id),
                Message.sender_id != uuid.UUID(user_id),
                Message.is_read == False,
            )
            .values(is_read=True)
        )
        await db.execute(
            update(ConversationMember)
            .where(
                ConversationMember.conversation_id == uuid.UUID(conversation_id),
                ConversationMember.user_id == uuid.UUID(user_id),
            )
            .values(last_read_at=datetime.utcnow())
        )
        await db.commit()


# ============ REST: 会话列表 ============

class ConversationResponse(BaseModel):
    id: str
    type: str
    name: str | None
    other_user: dict | None
    last_message: dict | None
    unread_count: int
    created_at: str
    updated_at: str


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConversationMember.conversation_id)
        .where(ConversationMember.user_id == current_user.id)
    )
    conv_ids = [row[0] for row in result.all()]

    if not conv_ids:
        return []

    resp = []
    for conv_id in conv_ids:
        conv = await db.get(Conversation, conv_id)
        if not conv:
            continue

        # 对方用户信息（私聊）
        other_user = None
        if conv.type == ConversationType.DIRECT:
            r = await db.execute(
                select(ConversationMember.user_id).where(
                    ConversationMember.conversation_id == conv_id,
                    ConversationMember.user_id != current_user.id,
                )
            )
            other_row = r.first()
            if other_row:
                other = await db.get(User, other_row[0])
                if other:
                    other_user = {
                        "id": str(other.id),
                        "username": other.username,
                        "avatar_url": other.avatar_url,
                        "online": await manager.is_online(str(other.id)),
                    }

        # 最后一条消息
        msg_result = await db.execute(
            select(Message).where(Message.conversation_id == conv_id)
            .order_by(desc(Message.created_at)).limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()
        last_message = None
        if last_msg:
            last_message = {
                "id": str(last_msg.id),
                "sender_id": str(last_msg.sender_id) if last_msg.sender_id else None,
                "content": last_msg.content,
                "created_at": last_msg.created_at.isoformat() if last_msg.created_at else "",
            }

        # 未读数
        member_result = await db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conv_id,
                ConversationMember.user_id == current_user.id,
            )
        )
        member = member_result.scalar_one_or_none()
        last_read = member.last_read_at if member else None

        unread_result = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.conversation_id == conv_id,
                Message.sender_id != current_user.id,
            )
        )
        total_from_others = unread_result.scalar() or 0

        if last_read:
            read_count = await db.execute(
                select(func.count()).select_from(Message).where(
                    Message.conversation_id == conv_id,
                    Message.sender_id != current_user.id,
                    Message.created_at <= last_read,
                )
            )
            unread_count = total_from_others - (read_count.scalar() or 0)
        else:
            unread_count = total_from_others

        resp.append(ConversationResponse(
            id=str(conv.id),
            type=conv.type.value,
            name=conv.name,
            other_user=other_user,
            last_message=last_message,
            unread_count=max(0, unread_count),
            created_at=conv.created_at.isoformat() if conv.created_at else "",
            updated_at=conv.updated_at.isoformat() if conv.updated_at else "",
        ))

    resp.sort(key=lambda c: c.updated_at, reverse=True)
    return resp


# ============ REST: 创建会话 ============

class CreateConversationRequest(BaseModel):
    user_id: str


@router.post("/conversations")
async def create_conversation(
    data: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    other_id = uuid.UUID(data.user_id)
    if other_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能和自己创建会话")

    # 检查是否已有私聊会话
    my_convs = await db.execute(
        select(ConversationMember.conversation_id).where(
            ConversationMember.user_id == current_user.id
        )
    )
    my_conv_ids = [r[0] for r in my_convs.all()]

    for conv_id in my_conv_ids:
        other_member = await db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conv_id,
                ConversationMember.user_id == other_id,
            )
        )
        conv = await db.get(Conversation, conv_id)
        if conv and conv.type == ConversationType.DIRECT and other_member.scalar_one_or_none():
            return {"id": str(conv.id), "type": "direct"}

    conv = Conversation(id=uuid.uuid4(), type=ConversationType.DIRECT)
    db.add(conv)
    await db.flush()

    db.add(ConversationMember(id=uuid.uuid4(), conversation_id=conv.id, user_id=current_user.id))
    db.add(ConversationMember(id=uuid.uuid4(), conversation_id=conv.id, user_id=other_id))
    await db.commit()

    return {"id": str(conv.id), "type": "direct"}


# ============ REST: 消息历史 ============

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str | None
    sender_name: str | None
    sender_avatar: str | None
    content: str
    is_read: bool
    created_at: str


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conv_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证成员身份
    member = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == uuid.UUID(conv_id),
            ConversationMember.user_id == current_user.id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="非会话成员")

    query = (
        select(Message, User)
        .outerjoin(User, Message.sender_id == User.id)
        .where(Message.conversation_id == uuid.UUID(conv_id))
        .order_by(desc(Message.created_at))
        .limit(limit)
    )

    if before:
        query = query.where(Message.created_at < datetime.fromisoformat(before))

    result = await db.execute(query)
    rows = result.all()

    return [
        MessageResponse(
            id=str(m.id),
            conversation_id=str(m.conversation_id),
            sender_id=str(m.sender_id) if m.sender_id else None,
            sender_name=u.username if u else None,
            sender_avatar=u.avatar_url if u else None,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m, u in reversed(rows)
    ]


# ============ REST: 标记已读 ============

@router.post("/conversations/{conv_id}/read")
async def mark_conversation_read(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _handle_mark_read(str(current_user.id), {"conversation_id": conv_id})
    return {"success": True}


# ============ REST: 在线用户 ============

@router.get("/online-users")
async def online_users(
    current_user: User = Depends(get_current_user),
):
    user_ids = await manager.get_online_users()
    return {"user_ids": user_ids}


# ============ REST: 获取团队成员列表（用于发起对话） ============

@router.get("/users")
async def list_chat_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取可对话的用户列表（同团队成员 + 自己可见的用户）"""
    result = await db.execute(
        select(User.id, User.username, User.avatar_url)
        .where(User.is_active == True)
        .where(User.id != current_user.id)
        .order_by(User.username)
    )
    users = []
    for uid, username, avatar_url in result.all():
        users.append({
            "id": str(uid),
            "username": username,
            "avatar_url": avatar_url,
            "online": await manager.is_online(str(uid)),
        })
    return {"users": users}
