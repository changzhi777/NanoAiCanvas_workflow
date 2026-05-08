"""会话和消息模型"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ConversationType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(20), nullable=False, default=ConversationType.DIRECT)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                            order_by="Message.created_at.desc()")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_read_at = Column(DateTime, nullable=True, default=None)
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")


class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    MIXED = "mixed"


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False, default=MessageType.TEXT)
    attachments = Column(JSONB, default=list)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
