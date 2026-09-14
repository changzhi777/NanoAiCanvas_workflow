"""
应用可见性配置模型
- AppVisibilityItem: 模板/节点/模块的可见性状态
- VisibilityAuditLog: 配置变更审计日志
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, Index, func
from app.database import Base


class AppVisibilityItem(Base):
    __tablename__ = "app_visibility_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scope = Column(String(50), nullable=False, index=True)  # template / node / nano2_module
    item_id = Column(String(100), nullable=False)            # 模板ID/节点类型/模块ID
    item_name = Column(String(200), nullable=False, default="")
    description = Column(String(500), nullable=False, default="")
    category = Column(String(100), nullable=False, default="")
    visibility = Column(String(20), nullable=False, default="disabled")  # active / disabled / hidden
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_av_scope_item", "scope", "item_id", unique=True),
    )


class VisibilityAuditLog(Base):
    __tablename__ = "visibility_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(String(100), nullable=True)
    admin_name = Column(String(100), nullable=True)
    scope = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # create / update / batch_update / reset
    changes = Column(JSON, nullable=True)         # [{"item_id": "xx", "old": "disabled", "new": "active"}, ...]
    snapshot = Column(JSON, nullable=True)        # 完整快照（仅 reset 时记录）
    created_at = Column(DateTime, server_default=func.now())
