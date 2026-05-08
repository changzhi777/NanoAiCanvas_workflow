import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

import enum


class UserRole(str, enum.Enum):
    """User role"""
    ADMIN = "admin"
    USER = "user"


class UserStatus(str, enum.Enum):
    """User account status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    status = Column(String(20), default=UserStatus.APPROVED, nullable=False)
    role = Column(String(20), default=UserRole.USER, nullable=False)
    avatar_url = Column(Text, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
    operations = relationship("Operation", back_populates="user", cascade="all, delete-orphan")
    points_account = relationship("PointsAccount", back_populates="user", uselist=False)
    owned_teams = relationship("Team", foreign_keys="Team.owner_id", back_populates="owner")
    team_memberships = relationship("TeamMember", back_populates="user")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
