# Nanoai Team8 Agent System — Data Models
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class PipelineType(str, enum.Enum):
    ADAPTATION = "adaptation"
    TVC = "tvc"
    STORYBOARD = "storyboard"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class SkillStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PINNED = "pinned"
    ARCHIVED = "archived"


class UserSkillStatus(str, enum.Enum):
    PERSONAL = "personal"
    PROMOTED = "promoted"
    MERGED = "merged"
    DIVERGED = "diverged"


class PromotionStatus(str, enum.Enum):
    PENDING = "pending"
    TESTING = "testing"
    APPROVED = "approved"
    REJECTED = "rejected"
    MERGED = "merged"


class MemoryLayer(int, enum.Enum):
    IDENTITY = 0      # L0: 身份 + 核心规则
    ESSENTIAL = 1     # L1: 精华经验
    ON_DEMAND = 2     # L2: 按需检索
    DEEP_SEARCH = 3   # L3: 深度归档


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default=SessionStatus.ACTIVE, nullable=False, index=True)
    pipeline_type = Column(String(30), default=PipelineType.ADAPTATION, nullable=False)
    context_json = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="agent_sessions")


class AgentMemory(Base):
    __tablename__ = "agent_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    layer = Column(Integer, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    content = Column(Text, nullable=False)
    stability = Column(Float, default=1.0, nullable=False)
    access_count = Column(Integer, default=0)
    half_life_days = Column(Float, default=30.0)
    last_accessed = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_agent_memories_layer_category", "layer", "category"),
    )

    user = relationship("User", backref="agent_memories")

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at

    def recency_factor(self) -> float:
        if not self.last_accessed:
            return 0.1
        days = (datetime.now(timezone.utc) - self.last_accessed).days
        if self.half_life_days <= 0:
            return 0.1
        return 0.5 ** (days / self.half_life_days)

    def calc_stability(self, cue: float = 1.0) -> float:
        return self.stability * cue * self.recency_factor()


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("agent_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    pipeline_type = Column(String(30), nullable=False)
    status = Column(String(20), default=TaskStatus.QUEUED, nullable=False, index=True)
    params_json = Column(JSONB, default=dict)
    result_json = Column(JSONB, nullable=True)
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_agent_tasks_status", "status"),
    )

    user = relationship("User", backref="agent_tasks")
    session = relationship("AgentSession", backref="tasks")
    execution_logs = relationship("AgentExecutionLog", back_populates="task", cascade="all, delete-orphan")


class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("agent_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_name = Column(String(50), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    model_used = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_execution_logs_agent_stage", "agent_name", "stage"),
        Index("ix_execution_logs_created", "created_at"),
    )

    user = relationship("User", backref="agent_execution_logs")
    task = relationship("AgentTask", back_populates="execution_logs")


class SystemSkill(Base):
    __tablename__ = "system_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    version = Column(String(20), nullable=False)
    skill_md = Column(Text, nullable=False)
    config_json = Column(JSONB, default=dict)
    status = Column(String(20), default=SkillStatus.DRAFT, nullable=False, index=True)
    stability = Column(Float, default=1.0)
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    avg_duration_ms = Column(Integer, default=0)
    source_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    source_user = relationship("User", backref="contributed_skills")
    user_skills = relationship("UserSkill", back_populates="system_skill", cascade="all, delete-orphan")


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    system_skill_id = Column(UUID(as_uuid=True), ForeignKey("system_skills.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    skill_md = Column(Text, nullable=False)
    config_json = Column(JSONB, default=dict)
    status = Column(String(20), default=UserSkillStatus.PERSONAL, nullable=False, index=True)
    fork_version = Column(String(20), nullable=True)
    stability = Column(Float, default=1.0)
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    avg_duration_ms = Column(Integer, default=0)
    divergence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_user_skills_user_name", "user_id", "name"),
    )

    user = relationship("User", backref="user_skills")
    system_skill = relationship("SystemSkill", back_populates="user_skills")


class SkillPromotionRequest(Base):
    __tablename__ = "skill_promotion_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_skill_id = Column(UUID(as_uuid=True), ForeignKey("user_skills.id", ondelete="CASCADE"), nullable=False)
    system_skill_id = Column(UUID(as_uuid=True), ForeignKey("system_skills.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default=PromotionStatus.PENDING, nullable=False, index=True)
    diff_summary = Column(Text, nullable=True)
    test_results_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="skill_promotion_requests")
    user_skill = relationship("UserSkill", backref="promotion_requests")
    system_skill = relationship("SystemSkill", backref="promotion_requests")
