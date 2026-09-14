"""
TVC 工作流配置模型
单表 scope 区分：global（管理员全局） / user（用户覆盖）
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class TvcWorkflowConfig(Base):
    __tablename__ = "tvc_workflow_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(String(20), nullable=False, index=True)  # "global" | "user"
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(100), nullable=False, default="default")

    # 各步骤配置 JSON
    step1_script = Column(JSONB, nullable=True)     # { model, temperature, max_tokens, system_prompt }
    step2_optimize = Column(JSONB, nullable=True)    # { model, temperature, max_tokens, system_prompt }
    step3_breakdown = Column(JSONB, nullable=True)   # { mode: "logic" | "ai", model, prompt_template }
    step4_image = Column(JSONB, nullable=True)       # { default_provider, timeout, max_retries, batch_size }
    step5_video = Column(JSONB, nullable=True)       # { default_provider, timeout, max_retries, resolution, duration, prompt_template }
    step5_bgm = Column(JSONB, nullable=True)         # { model, prompt_template, is_instrumental }

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
