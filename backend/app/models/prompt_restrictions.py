"""
提示词限制词库
用于过滤和限制AI图像生成中的敏感内容
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PromptRestrictionCategory(Base):
    """限制词分类"""
    __tablename__ = "prompt_restriction_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False, unique=True)  # 如: "年龄相关", "人物相关"
    description = Column(Text, nullable=True)  # 分类描述
    is_active = Column(Integer, default=1)  # 1=启用, 0=禁用
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关联的词条 - 使用 back_populates 指定反向关系
    words = relationship("PromptRestrictionWord", back_populates="category", cascade="all, delete-orphan")


class PromptRestrictionWord(Base):
    """限制词条目"""
    __tablename__ = "prompt_restriction_words"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("prompt_restriction_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    word = Column(String(128), nullable=False)  # 限制词
    alternative = Column(String(128), nullable=True)  # 建议替代词
    severity = Column(Integer, default=1)  # 1=轻微, 2=中等, 3=严重
    is_active = Column(Integer, default=1)  # 1=启用, 0=禁用
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    category = relationship("PromptRestrictionCategory", back_populates="words")
