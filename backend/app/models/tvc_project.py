"""
TVC 项目数据模型
TVC Project: 项目级组织，关联原始文案 → 剧本 → 镜头 → 成片
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class TvcProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TvcShotStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class TvcProject(Base):
    """TVC 项目表 — 按 TVC 广告项目归类所有生成内容"""
    __tablename__ = "tvc_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    original_text = Column(Text, nullable=False, default="")

    # 结构化剧本 JSON（TvcScript 格式）
    script = Column(JSONB, nullable=True)
    # 最终合成视频 URL
    composed_video_url = Column(Text, nullable=True)
    # BGM URL
    bgm_url = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default=TvcProjectStatus.DRAFT, index=True)

    # 关联的 TVC 后台任务 ID
    task_id = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = relationship("User", back_populates="tvc_projects")
    shots = relationship("TvcProjectShot", back_populates="project", cascade="all, delete-orphan", order_by="TvcProjectShot.shot_index")


class TvcProjectShot(Base):
    """TVC 项目镜头表 — 每个镜头含 prompt + 图片 + 视频"""
    __tablename__ = "tvc_project_shots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("tvc_projects.id", ondelete="CASCADE"), nullable=False, index=True)

    shot_index = Column(Integer, nullable=False)
    scene_number = Column(Integer, nullable=True)
    scene_description = Column(Text, nullable=True)

    # 提示词
    video_prompt = Column(Text, nullable=True)
    start_frame_prompt = Column(Text, nullable=True)
    end_frame_prompt = Column(Text, nullable=True)
    bgm_mood = Column(String(50), nullable=True)

    # 生成结果
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    duration = Column(Float, nullable=True, default=5.0)

    # 关联资产 ID（溯源到资产库）
    image_asset_id = Column(UUID(as_uuid=True), nullable=True)
    video_asset_id = Column(UUID(as_uuid=True), nullable=True)

    # 对话
    dialogue = Column(JSONB, nullable=True)

    status = Column(String(20), nullable=False, default=TvcShotStatus.PENDING)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("TvcProject", back_populates="shots")
