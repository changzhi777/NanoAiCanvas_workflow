import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
import enum


class GenerationStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    ABORTED = "aborted"


class GenerationTaskLog(Base):
    __tablename__ = "generation_task_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    node_id = Column(String(64), nullable=True, index=True)
    workflow_id = Column(UUID(as_uuid=True), nullable=True)
    skill_id = Column(String(64), nullable=True, index=True)
    prompt = Column(Text, nullable=True)
    status = Column(SQLEnum(GenerationStatus), nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    total_time_ms = Column(Integer, nullable=True)
    step_durations = Column(JSONB, nullable=True)
    model_params = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
