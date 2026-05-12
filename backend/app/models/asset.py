import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AssetType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    STORYBOARD_IMAGE = "storyboard_image"
    STORYBOARD_VIDEO = "storyboard_video"
    TVC = "tvc"


class AssetCategory(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    STORYBOARD_IMAGE = "storyboard_image"
    STORYBOARD_VIDEO = "storyboard_video"
    TVC = "tvc"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(String(20), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)

    meta_data = Column("meta", JSONB, default=dict)  # DB column: meta
    category = Column(String(20), nullable=True, index=True)
    tags = Column(ARRAY(String), default=list)

    workflow_snapshot = Column(JSONB, nullable=True)

    version = Column(String(10), nullable=True)
    source_node_id = Column(String(50), nullable=True)
    workflow_id = Column(UUID(as_uuid=True), nullable=True)
    parent_asset_id = Column(UUID(as_uuid=True), nullable=True)

    is_starred = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    category_ref = Column(UUID(as_uuid=True), nullable=True, index=True)

    user = relationship("User", back_populates="assets")
    team_assets = relationship("TeamAsset", back_populates="asset")
