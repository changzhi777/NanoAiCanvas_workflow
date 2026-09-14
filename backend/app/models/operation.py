import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class OperationType(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class EntityType(str, enum.Enum):
    NODE = "node"
    EDGE = "edge"
    WORKFLOW = "workflow"
    ASSET = "asset"
    TEMPLATE = "template"
    CONFIG = "config"


class Operation(Base):
    __tablename__ = "operations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    device_id = Column(String(100), nullable=False, index=True)  # Device identifier
    op_type = Column(SQLEnum(OperationType), nullable=False)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)

    payload = Column(JSONB, nullable=False)  # Operation data
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    synced = Column(Boolean, default=False, index=True)

    # Relationships
    user = relationship("User", back_populates="operations")