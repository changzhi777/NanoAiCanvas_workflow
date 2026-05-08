import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.asset import Asset


class Category(Base):
    """资产分类表"""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True)

    name = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)
    is_system = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="categories")
    team = relationship("Team", back_populates="categories")
    assets = relationship("Asset", foreign_keys="Asset.category_ref", primaryjoin="Category.id == foreign(Asset.category_ref)")

    # Unique constraints: user_id + name (个人类型) 或 team_id + name (团队类型)
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_category'),
        UniqueConstraint('team_id', 'name', name='uq_team_category'),
    )