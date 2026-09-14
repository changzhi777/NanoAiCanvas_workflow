"""
积分账户和交易模型
"""
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TransactionType(str, enum.Enum):
    """交易类型枚举"""
    DEDUCT = "deduct"           # 扣费
    GRANT = "grant"             # 发放
    TRANSFER_IN = "transfer_in" # 转入
    TRANSFER_OUT = "transfer_out"  # 转出
    REFUND = "refund"           # 退款


class TransactionStatus(str, enum.Enum):
    """交易状态枚举"""
    PENDING = "pending"         # 待处理
    SUCCESS = "success"         # 成功
    FAILED = "failed"           # 失败
    CANCELLED = "cancelled"     # 已取消


class PointsAccount(Base):
    """积分账户表"""
    __tablename__ = "points_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True)
    balance = Column(Integer, default=0, nullable=False)  # 当前积分余额
    total_granted = Column(Integer, default=0)  # 历史总发放
    total_used = Column(Integer, default=0)  # 历史总消耗
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    user = relationship("User", back_populates="points_account")
    team = relationship("Team", back_populates="points_account")
    transactions = relationship("PointsTransaction", back_populates="account", cascade="all, delete-orphan")


class PointsTransaction(Base):
    """积分交易记录表"""
    __tablename__ = "points_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("points_accounts.id"), nullable=False, index=True)
    transaction_type = Column(String(32), nullable=False)
    amount = Column(Integer, nullable=False)  # 正数表示增加，负数表示扣减
    balance_before = Column(Integer, nullable=False)  # 交易前余额
    balance_after = Column(Integer, nullable=False)  # 交易后余额
    status = Column(String(32), default="pending")
    description = Column(Text, nullable=True)  # 交易描述
    related_order_id = Column(String(64), nullable=True, index=True)  # 关联订单ID
    meta_data = Column(Text, nullable=True)  # 扩展数据JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    account = relationship("PointsAccount", back_populates="transactions")


class Team(Base):
    """团队表"""
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(128), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # 管理员
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_teams")
    admin = relationship("User", foreign_keys=[admin_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    points_account = relationship("PointsAccount", back_populates="team", uselist=False)
    categories = relationship("Category", back_populates="team")
    assets = relationship("TeamAsset", back_populates="team")


class TeamMember(Base):
    """团队成员表"""
    __tablename__ = "team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(32), default="member")  # owner, admin, member
    can_edit = Column(Boolean, default=False)  # 是否可编辑团队资产
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class TeamAsset(Base):
    """团队资产表"""
    __tablename__ = "team_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    team = relationship("Team", back_populates="assets")
    asset = relationship("Asset", back_populates="team_assets")


class BillingRule(Base):
    """扣费规则表"""
    __tablename__ = "billing_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    model_type = Column(String(32), nullable=False, index=True)  # image, video, audio, text
    points_per_unit = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False, default="per_call")  # per_call, per_token, per_second
    is_active = Column(Integer, default=1)  # 1=启用, 0=禁用
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RechargeRecord(Base):
    """充值记录表（用于扫码充值）"""
    __tablename__ = "recharge_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # 充值积分数量
    payment_method = Column(String(32), nullable=True)  # wechat, alipay
    payment_status = Column(String(32), default="pending")  # pending, paid, cancelled, refunded
    order_id = Column(String(64), nullable=True, unique=True, index=True)  # 第三方支付订单号
    qr_code_url = Column(Text, nullable=True)  # 支付二维码URL
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    user = relationship("User")