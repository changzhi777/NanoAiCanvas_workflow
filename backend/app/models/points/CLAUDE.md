[根目录](../../../../CLAUDE.md) > [backend](../../) > [app](../) > [models](./) > **points**

---

# Points 模型 - 积分账户和交易系统

> 积分账户、积分交易、团队管理、计费规则

**最后更新**: 2026-05-05
**维护者**: NanoAiCanvas Backend Team

---

## 模块职责

Points 模型模块负责：
- **积分账户管理**: 用户积分账户的创建、查询、扣减
- **积分交易记录**: 所有积分变动的流水记录
- **团队积分管理**: 团队共享积分池
- **计费规则**: 各操作的积分扣减规则
- **充值记录**: 用户充值记录

---

## 数据模型

### PointsAccount（积分账户）

```python
class PointsAccount(Base):
    __tablename__ = "points_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Numeric(10, 2), default=0.0)  # 当前积分余额
    totalEarned = Column(Numeric(10, 2), default=0.0)  # 累计获得
    totalSpent = Column(Numeric(10, 2), default=0.0)  # 累计消耗
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="points_account")
    transactions = relationship("PointsTransaction", back_populates="account")
```

### PointsTransaction（积分交易记录）

```python
class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("points_accounts.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # 正数=收入，负数=支出
    transaction_type = Column(String(50), nullable=False)  # e.g., 'earn', 'spend', 'refund', 'recharge'
    status = Column(String(50), default=TransactionStatus.PENDING)  # pending, completed, failed
    description = Column(String(255), nullable=True)
    metadata_ = Column(JSON, nullable=True)  # 额外数据（如订单ID）
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    account = relationship("PointsAccount", back_populates="transactions")

class TransactionType(str, enum.Enum):
    EARN = "earn"           # 获得（奖励）
    SPEND = "spend"         # 消耗
    REFUND = "refund"       # 退款
    RECHARGE = "recharge"   # 充值
    TRANSFER_IN = "transfer_in"   # 转入
    TRANSFER_OUT = "transfer_out"  # 转出

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
```

### Team（团队）

```python
class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    points_balance = Column(Numeric(10, 2), default=0.0)  # 团队共享积分
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_teams")
    admin = relationship("User", foreign_keys=[admin_id])
    members = relationship("TeamMember", back_populates="team")
    assets = relationship("TeamAsset", back_populates="team")
```

### TeamMember（团队成员）

```python
class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # owner, admin, member
    can_edit = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
```

### TeamAsset（团队资产）

```python
class TeamAsset(Base):
    __tablename__ = "team_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="assets")
    asset = relationship("Asset")
```

### BillingRule（计费规则）

```python
class BillingRule(Base):
    __tablename__ = "billing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action = Column(String(100), unique=True, nullable=False)  # e.g., 'image_generation', 'video_generation'
    points_cost = Column(Numeric(10, 2), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### RechargeRecord（充值记录）

```python
class RechargeRecord(Base):
    __tablename__ = "recharge_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("points_accounts.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # 充值金额
    points_given = Column(Numeric(10, 2), nullable=False)  # 赠送积分
    payment_method = Column(String(50), nullable=True)
    payment_id = Column(String(100), nullable=True)  # 第三方支付ID
    status = Column(String(50), default="pending")  # pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    account = relationship("PointsAccount")
```

---

## API 端点

### Points API (`/api/points`)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/points` | 获取当前用户积分余额 |
| POST | `/api/points/deduct` | 扣减积分 |

### Points Admin API (`/api/points_admin`)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/points_admin/accounts` | 列出所有积分账户 |
| GET | `/api/points_admin/transactions` | 列出所有交易记录 |
| POST | `/api/points_admin/recharge` | 为账户充值 |
| GET | `/api/points_admin/rules` | 列出计费规则 |
| POST | `/api/points_admin/rules` | 创建计费规则 |
| PATCH | `/api/points_admin/rules/{id}` | 更新计费规则 |

---

## 业务逻辑

### 积分扣减流程

```python
async def deduct_points(account_id: UUID, amount: Decimal, action: str, description: str):
    """扣减积分（原子操作）"""
    async with db.begin():
        # 1. 锁定账户行（SELECT FOR UPDATE）
        account = await db.execute(
            select(PointsAccount).where(...).with_for_update()
        )

        # 2. 检查余额
        if account.balance < amount:
            raise InsufficientPointsError()

        # 3. 扣减余额
        account.balance -= amount
        account.totalSpent += amount

        # 4. 记录交易
        transaction = PointsTransaction(
            account_id=account_id,
            amount=-amount,
            transaction_type=TransactionType.SPEND,
            status=TransactionStatus.COMPLETED,
            description=description,
        )
        db.add(transaction)

        # 5. 提交事务
        await db.commit()
```

### 积分奖励流程

```python
async def earn_points(account_id: UUID, amount: Decimal, action: str, description: str):
    """奖励积分"""
    async with db.begin():
        account = await db.execute(select(PointsAccount)...)

        account.balance += amount
        account.totalEarned += amount

        transaction = PointsTransaction(
            account_id=account_id,
            amount=amount,
            transaction_type=TransactionType.EARN,
            status=TransactionStatus.COMPLETED,
            description=description,
        )
        db.add(transaction)
```

---

## 测试

### 测试覆盖

- [ ] 积分扣减（余额不足）
- [ ] 积分扣减（成功）
- [ ] 积分奖励
- [ ] 交易记录查询
- [ ] 团队积分共享
- [ ] 计费规则更新

---

## 相关文件

```
backend/app/models/
├── points.py              # 本模块
├── user.py                # User 模型（含 points_account 关系）
└── asset.py               # Asset 模型（含 team_asset 关系）
```

---

## 变更记录 (Changelog)

### 2026-05-05
- 初始化模块文档
- 完善积分账户、交易、团队等模型说明
- 添加 API 端点说明
- 添加业务逻辑说明