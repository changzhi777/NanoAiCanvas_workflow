"""即时聊天 API — REST + WebSocket"""
import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, update, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.models.conversation import Conversation, ConversationMember, Message, ConversationType
from app.models.asset import Asset, AssetType
from app.api.auth import get_current_user
from app.redis import redis_client


def get_email_domain(user: User) -> str | None:
    """提取用户邮箱域名"""
    if not user.email or "@" not in user.email:
        return None
    return user.email.split("@", 1)[1].lower()

# 聊天文件上传目录
UPLOAD_DIR = os.environ.get("CHAT_UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chat-uploads"))

ALLOWED_TYPES = {
    "image": {"exts": {".jpg", ".jpeg", ".png", ".gif", ".webp"}, "max_size": 10 * 1024 * 1024},
    "video": {"exts": {".mp4", ".webm", ".mov"}, "max_size": 100 * 1024 * 1024},
    "audio": {"exts": {".mp3", ".wav", ".ogg", ".m4a"}, "max_size": 50 * 1024 * 1024},
}

router = APIRouter(prefix="/chat", tags=["chat"])

# ============ WebSocket 连接管理 ============

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}
        self._pubsub = None
        self._pubsub_redis = None
        self._listener_task = None

    async def start_subscriber(self):
        """启动 Redis pub/sub 订阅，实现跨 Worker 消息分发"""
        import redis.asyncio as aioredis
        from app.config import get_settings
        s = get_settings()
        self._pubsub_redis = aioredis.Redis(
            host=s.REDIS_HOST, port=s.REDIS_PORT,
            password=s.REDIS_PASSWORD, decode_responses=True,
        )
        self._pubsub = self._pubsub_redis.pubsub()
        await self._pubsub.psubscribe("chat:user:*", "chat:broadcast:*")
        self._listener_task = asyncio.create_task(self._redis_listener())

    async def stop_subscriber(self):
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            await self._pubsub.close()
        if self._pubsub_redis:
            await self._pubsub_redis.aclose()

    async def _redis_listener(self):
        """后台任务：监听 Redis 消息，分发到本 Worker 的本地 WebSocket"""
        try:
            async for message in self._pubsub.listen():
                if message["type"] != "pmessage":
                    continue
                channel = message["channel"]
                data = json.loads(message["data"])

                if channel.startswith("chat:user:"):
                    user_id = channel.split(":")[-1]
                    ws = self.active.get(user_id)
                    if ws:
                        try:
                            await ws.send_json(data)
                        except Exception:
                            self.disconnect(user_id)
                elif channel == "chat:broadcast:online":
                    broadcaster_id = data.get("payload", {}).get("user_id")
                    for uid, ws in list(self.active.items()):
                        if uid != broadcaster_id:
                            try:
                                await ws.send_json(data)
                            except Exception:
                                pass
        except asyncio.CancelledError:
            raise
        except Exception:
            pass

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws
        await self._set_online(user_id)

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict):
        """通过 Redis pub/sub 发送消息，所有 Worker 均可接收"""
        try:
            await redis_client.publish(f"chat:user:{user_id}", json.dumps(data))
        except Exception:
            ws = self.active.get(user_id)
            if ws:
                try:
                    await ws.send_json(data)
                except Exception:
                    self.disconnect(user_id)

    async def broadcast_online_status(self, user_id: str, online: bool):
        msg = {"type": "online_status", "payload": {"user_id": user_id, "online": online}}
        try:
            await redis_client.publish("chat:broadcast:online", json.dumps(msg))
        except Exception:
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
    # 简单认证：从 query param 验证 token
    token = ws.query_params.get("token")
    if token:
        try:
            from app.core.security import decode_token
            payload = decode_token(token)
            if not payload or payload.get("sub") != user_id:
                await ws.close(code=4001)
                return
        except Exception:
            await ws.close(code=4001)
            return

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
    message_type = payload.get("message_type", "text")
    attachments = payload.get("attachments", [])
    if not conversation_id or (not content and not attachments):
        return

    from app.database import async_session_maker
    async with async_session_maker() as db:
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=uuid.UUID(conversation_id),
            sender_id=uuid.UUID(sender_id),
            content=content,
            message_type=message_type,
            attachments=attachments,
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
                "message_type": msg.message_type if isinstance(msg.message_type, str) else (msg.message_type.value if msg.message_type else "text"),
                "attachments": msg.attachments or [],
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat() if msg.created_at else "",
            },
        }

        await manager.send_to_user(sender_id, msg_data)

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
    # 批量获取当前用户的会话 ID
    result = await db.execute(
        select(ConversationMember.conversation_id)
        .where(ConversationMember.user_id == current_user.id)
    )
    conv_ids = [row[0] for row in result.all()]
    if not conv_ids:
        return []

    # 一次性获取在线用户集合
    online_ids = await manager.get_online_users()
    online_set = set(online_ids)

    # 批量获取会话
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id.in_(conv_ids))
    )
    conv_map = {c.id: c for c in conv_result.scalars().all()}

    # 批量获取所有会话的对方成员
    other_members = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id.in_(conv_ids),
            ConversationMember.user_id != current_user.id,
        )
    )
    other_member_map: dict = {}
    for m in other_members.scalars().all():
        other_member_map[m.conversation_id] = m.user_id

    # 批量获取对方用户信息
    other_user_ids = list(set(other_member_map.values()))
    user_map: dict = {}
    if other_user_ids:
        users_result = await db.execute(
            select(User).where(User.id.in_(other_user_ids))
        )
        for u in users_result.scalars().all():
            user_map[u.id] = u

    # 批量获取每个会话的最后一条消息
    from sqlalchemy import literal_column
    from sqlalchemy.sql import func as sqlfunc
    # 子查询：每个会话的最新消息 ID
    latest_msg_subq = (
        select(Message.conversation_id, func.max(Message.created_at).label("max_time"))
        .where(Message.conversation_id.in_(conv_ids))
        .group_by(Message.conversation_id)
        .subquery()
    )
    latest_msgs = await db.execute(
        select(Message).join(
            latest_msg_subq,
            and_(
                Message.conversation_id == latest_msg_subq.c.conversation_id,
                Message.created_at == latest_msg_subq.c.max_time,
            ),
        )
    )
    msg_map: dict = {}
    for m in latest_msgs.scalars().all():
        msg_map[m.conversation_id] = m

    # 批量获取当前用户的成员信息（last_read_at）
    my_members = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id.in_(conv_ids),
            ConversationMember.user_id == current_user.id,
        )
    )
    my_member_map: dict = {}
    for m in my_members.scalars().all():
        my_member_map[m.conversation_id] = m

    # 批量统计未读数
    unread_counts: dict = {}
    for conv_id in conv_ids:
        member = my_member_map.get(conv_id)
        last_read = member.last_read_at if member else None
        unread_q = select(func.count()).select_from(Message).where(
            Message.conversation_id == conv_id,
            Message.sender_id != current_user.id,
        )
        if last_read:
            unread_q = unread_q.where(Message.created_at > last_read)
        else:
            unread_q = unread_q.where(Message.is_read == False)
        count_result = await db.execute(unread_q)
        unread_counts[conv_id] = count_result.scalar() or 0

    resp = []
    for conv_id in conv_ids:
        conv = conv_map.get(conv_id)
        if not conv:
            continue

        other_user = None
        other_uid = other_member_map.get(conv_id)
        if other_uid and other_uid in user_map:
            other = user_map[other_uid]
            other_user = {
                "id": str(other.id),
                "username": other.username,
                "avatar_url": other.avatar_url,
                "online": str(other.id) in online_set,
            }

        last_msg = msg_map.get(conv_id)
        last_message = None
        if last_msg:
            last_message = {
                "id": str(last_msg.id),
                "sender_id": str(last_msg.sender_id) if last_msg.sender_id else None,
                "content": last_msg.content,
                "message_type": last_msg.message_type if isinstance(last_msg.message_type, str) else (last_msg.message_type.value if last_msg.message_type else "text"),
                "created_at": last_msg.created_at.isoformat() if last_msg.created_at else "",
            }

        resp.append(ConversationResponse(
            id=str(conv.id),
            type=conv.type if isinstance(conv.type, str) else conv.type.value,
            name=conv.name,
            other_user=other_user,
            last_message=last_message,
            unread_count=unread_counts.get(conv_id, 0),
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

    # 校验目标用户与当前用户同邮箱域
    domain = get_email_domain(current_user)
    if domain:
        other_user = await db.get(User, other_id)
        if not other_user or not other_user.email or not other_user.email.lower().endswith(f"@{domain}"):
            raise HTTPException(status_code=403, detail="只能与同域用户对话")

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
    message_type: str
    attachments: list[dict]
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
            message_type=m.message_type if isinstance(m.message_type, str) else (m.message_type.value if m.message_type else "text"),
            attachments=m.attachments or [],
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


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # verify membership
    result = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="会话不存在")
    # delete conversation (cascade deletes members + messages)
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conv_id)
    )
    conv = conv_result.scalar_one_or_none()
    if conv:
        await db.delete(conv)
        await db.commit()
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
    """获取可对话的用户列表（同邮箱域名的用户）"""
    domain = get_email_domain(current_user)
    if not domain:
        return {"users": []}

    online_ids = await manager.get_online_users()
    online_set = set(online_ids)
    result = await db.execute(
        select(User.id, User.username, User.avatar_url)
        .where(User.is_active == True)
        .where(User.id != current_user.id)
        .where(User.email.like(f"%@{domain}"))
        .order_by(User.username)
    )
    users = []
    for uid, username, avatar_url in result.all():
        users.append({
            "id": str(uid),
            "username": username,
            "avatar_url": avatar_url,
            "online": str(uid) in online_set,
        })
    return {"users": users}


# ============ REST: 文件上传 ============

@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """聊天文件上传，支持图片/视频/音频"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="缺少文件名")

    ext = os.path.splitext(file.filename)[1].lower()
    file_category = None
    for cat, cfg in ALLOWED_TYPES.items():
        if ext in cfg["exts"]:
            file_category = cat
            break

    if not file_category:
        allowed = ", ".join(e for cfg in ALLOWED_TYPES.values() for e in cfg["exts"])
        raise HTTPException(status_code=400, detail=f"不支持的文件类型，允许: {allowed}")

    content = await file.read()
    max_size = ALLOWED_TYPES[file_category]["max_size"]
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"{file_category} 文件不能超过 {max_size // 1024 // 1024}MB")

    # 保存文件
    file_id = str(uuid.uuid4())
    save_dir = os.path.join(UPLOAD_DIR, file_category)
    os.makedirs(save_dir, exist_ok=True)
    filename = f"{file_id}{ext}"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/chat-uploads/{file_category}/{filename}"
    return {
        "url": url,
        "thumbnail_url": url if file_category == "image" else None,
        "name": file.filename,
        "type": file_category,
    }


# ============ REST: 保存附件到资产库 ============

class SaveAttachmentRequest(BaseModel):
    url: str
    type: str  # image / video / audio
    name: str
    prompt: str | None = None
    thumbnail_url: str | None = None


@router.post("/save-attachment")
async def save_attachment_to_assets(
    data: SaveAttachmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将聊天中的附件保存到自己的资产库"""
    type_map = {"image": AssetType.IMAGE, "video": AssetType.VIDEO, "audio": AssetType.AUDIO}
    asset_type = type_map.get(data.type)
    if not asset_type:
        raise HTTPException(status_code=400, detail="不支持的类型")

    """将聊天中的附件保存到自己的资产库"""
    type_map = {"image": AssetType.IMAGE, "video": AssetType.VIDEO, "audio": AssetType.AUDIO}
    asset_type = type_map.get(data.type)
    if not asset_type:
        raise HTTPException(status_code=400, detail="不支持的类型")

    meta = {}
    if data.prompt:
        meta["prompt"] = data.prompt

    asset_id = uuid.uuid4()
    now = datetime.utcnow()
    # 直接用 raw SQL 避免 ORM 模型与数据库列名不匹配
    from sqlalchemy import text
    await db.execute(
        text("""INSERT INTO assets (id, user_id, type, name, url, thumbnail_url, meta, is_starred, is_deleted, created_at, updated_at)
                VALUES (:id, :uid, :type, :name, :url, :thumb, :meta, false, false, :now, :now)"""),
        {
            "id": asset_id,
            "uid": current_user.id,
            "type": asset_type.value,
            "name": data.name,
            "url": data.url,
            "thumb": data.thumbnail_url,
            "meta": json.dumps(meta),
            "now": now,
        },
    )
    await db.commit()
    return {"asset_id": str(asset_id), "success": True}
