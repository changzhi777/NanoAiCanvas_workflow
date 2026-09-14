"""图片视觉描述缓存表 — 存 minimax M3 视觉理解结果，hash 寻址。"""
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime

from app.database import Base


class ImageDescription(Base):
    __tablename__ = "image_descriptions"

    image_hash = Column(String(64), primary_key=True)  # sha256 hex
    model = Column(String(64), primary_key=True)       # "MiniMax-M3" 等
    description = Column(Text, nullable=False)
    hit_count = Column(Integer, default=0, nullable=False)
    last_hit_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
