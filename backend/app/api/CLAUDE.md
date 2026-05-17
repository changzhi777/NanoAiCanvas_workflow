[根目录](../../CLAUDE.md) > [backend](../) > [app](./) > **api**

---

# Backend API 模块 - FastAPI 路由定义

> 后端 API 路由模块，包含认证、资产管理、工作流、积分、聊天、通知等核心 API

**最后更新**: 2026-05-17
**维护者**: NanoAiCanvas Backend Team

---

## 模块职责

Backend API 模块负责：
- 提供 RESTful API 接口
- 处理认证/授权（JWT）
- 管理资产、工作流、团队、积分等数据
- 即时聊天（REST + WebSocket）
- 实时通知推送
- 任务状态 WebSocket 推送
- 离线数据同步
- Session 管理（Redis）

---

## 入口与启动

### FastAPI 应用入口

**文件**: `backend/app/main.py`

```python
from fastapi import FastAPI
from app.api import auth, assets, workflows, sync, points, points_admin, prompt_restrictions
from app.api import categories, teams, assets_export, chat, notifications
from app.api import admin_users, tags, folders, websocket

app = FastAPI(
    title="NanoAI Canvas API",
    description="Backend API for NanoAI Canvas - Workflow & Asset Management",
    version="0.1.0",
)

# 包含路由
app.include_router(auth.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
# ...
```

### 启动方式

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 目录结构

```
backend/app/api/
├── __init__.py
├── CLAUDE.md                # 本文档
├── auth.py                  # 认证路由（注册/登录/JWT）
├── assets.py                # 资产管理（CRUD + 批量）
├── workflows.py             # 工作流管理（保存/加载）
├── points.py                # 积分系统（查询/扣减/统计）
├── points_admin.py          # 积分管理后台（配置/定价）
├── categories.py            # 分类管理
├── teams.py                 # 团队管理
├── sync.py                  # 离线数据同步
├── assets_export.py         # 批量导出
├── prompt_restrictions.py   # 提示词限制
├── chat.py                  # 即时聊天（REST + WebSocket）★ 新增
├── notifications.py         # 用户通知 + 管理端通知 ★ 新增
├── admin_users.py           # 管理员用户审批 ★ 新增
├── tags.py                  # 标签管理 ★ 新增
├── folders.py               # 文件夹管理 ★ 新增
├── websocket.py             # WebSocket 任务状态推送 ★ 新增
└── v2/                      # V2 API（独立子目录，见下方）
    ├── __init__.py
    ├── admin.py             # V2 管理后台
    ├── app_visibility.py    # 应用可见性控制
    ├── generation_log.py    # 生成日志
    ├── glm_proxy.py         # GLM 代理
    ├── image.py             # 图片生成
    ├── key_mapper.py        # API Key 映射
    ├── minimax.py           # MiniMax 集成
    ├── skills.py            # Skills 任务队列
    └── workflow_tasks.py    # 工作流任务
```

---

## 对外接口

### V1 API 路由列表

| 路由前缀 | 文件 | 功能 | 认证 |
|----------|------|------|------|
| `/api/auth/*` | `auth.py` | 注册/登录/JWT/刷新/用户信息 | 部分 |
| `/api/assets` | `assets.py` | 资产 CRUD + 批量操作 | 是 |
| `/api/workflows` | `workflows.py` | 工作流保存/加载/删除 | 是 |
| `/api/points/*` | `points.py` | 积分查询/扣减/统计/余额 | 是 |
| `/api/points_admin/*` | `points_admin.py` | 积分管理后台（定价/配置） | 管理员 |
| `/api/categories` | `categories.py` | 分类 CRUD | 是 |
| `/api/teams` | `teams.py` | 团队管理 | 是 |
| `/api/sync/*` | `sync.py` | 离线数据同步（push/pull） | 是 |
| `/api/assets_export` | `assets_export.py` | 批量导出 | 是 |
| `/api/prompt_restrictions` | `prompt_restrictions.py` | 提示词限制查询 | 是 |
| `/api/chat/*` | `chat.py` | 即时聊天 REST + WebSocket | 是 |
| `/api/notifications/*` | `notifications.py` | 通知查询/已读/未读数 | 是 |
| `/api/admin/users/*` | `admin_users.py` | 用户审批/管理 | 管理员 |
| `/api/tags` | `tags.py` | 标签 CRUD | 是 |
| `/api/folders` | `folders.py` | 文件夹 CRUD（树形） | 是 |
| `/ws/tasks/{task_id}` | `websocket.py` | 任务状态实时推送 | 连接级 |

### V2 API 路由列表

V2 API 已独立到 `backend/app/api/v2/` 子目录，包含 16 个路由文件。

| 路由前缀 | 文件 | 功能 | 说明 |
|----------|------|------|------|
| `/api/v2/admin/*` | `admin.py` | V2 管理后台 | 应用/模板/节点管理 |
| `/api/v2/app-visibility/*` | `app_visibility.py` | 应用可见性控制 | 三态管理 |
| `/api/v2/generation-log/*` | `generation_log.py` | 生成日志 | 调用记录查询 |
| `/api/v2/glm/*` | `glm_proxy.py` | GLM API 代理 | SSE 流式转发 |
| `/api/v2/image/*` | `image.py` | 图片生成 | NanoBanana/GPT-Image |
| `/api/v2/key-mapper/*` | `key_mapper.py` | API Key 映射 | 热加载配置 |
| `/api/v2/minimax/*` | `minimax.py` | MiniMax 集成 | 文本/语音/视频 |
| `/api/v2/skills/*` | `skills.py` | Skills 任务队列 | Redis 队列 Worker |
| `/api/v2/tvc-tasks/*` | `workflow_tasks.py` | TVC 工作流任务 | 任务提交/查询/取消 |
| `/api/v2/tvc-engine/*` | `tvc_engine.py` | TVC 执行引擎 | 5步编排+积分管理 |
| `/api/v2/tvc-providers/*` | `tvc_providers.py` | TVC Provider 工厂 | 3图片+3视频Provider |
| `/api/v2/tvc-polling/*` | `tvc_polling.py` | TVC 视频轮询 | GLM/Seedance/MiniMax |
| `/api/v2/tvc-config/*` | `tvc_config.py` | TVC 配置管理 | 全局/用户配置 |
| `/api/v2/generation-logs/*` | `generation_log.py` | 生成日志 | 调用记录查询 |
| `/api/v2/tvc-projects/*` | `tvc_projects.py` | TVC 项目管理 | CRUD + 镜头 |
| `/api/v2/library/*` | `library.py` | V2 资产库 | 浏览/搜索/批量 |

> 详细文档见 [v2/CLAUDE.md](./v2/CLAUDE.md)

---

## 核心模块详解

### chat.py — 即时聊天

REST + WebSocket 混合架构，723 行。

- **WebSocket 端点**: `/api/chat/ws/{conversation_id}` — 实时消息收发
- **REST 端点**: 会话管理、消息历史、文件上传
- **Redis Pub/Sub**: 跨 Worker 消息分发，支持多进程部署
- **ConnectionManager**: 管理 WebSocket 连接池，按会话分组
- **文件上传**: 支持图片（10MB）、视频（100MB）、音频（50MB）
- **数据模型**: Conversation、ConversationMember、Message

### websocket.py — 任务状态推送

独立的 WebSocket 端点，100 行。

- **WebSocket 端点**: `/ws/tasks/{task_id}` — 订阅任务状态更新
- **ConnectionManager**: 按 task_id 管理连接，支持广播
- **Redis Pub/Sub**: 从 TaskSubscriber 接收消息并转发
- **心跳机制**: 30s 超时 + ping 保活
- **自动清理**: 断开时清理无效连接

### notifications.py — 通知系统

用户通知 + 管理端通知，支持多种通知类型。

- **用户端**: 查询通知列表、标记已读、未读计数
- **管理端**: 发送通知、批量推送
- **通知类型**: NotificationType 枚举
- **状态管理**: NotificationStatus（unread/read）

### admin_users.py — 用户审批

管理员审核用户注册。

- **待审批列表**: 查询 pending 状态用户
- **审批操作**: approve / reject
- **权限控制**: require_admin 依赖

### tags.py — 标签管理

用户级标签 CRUD，64 行。

- **GET /tags**: 列表（按名称排序）
- **POST /tags**: 创建（去重校验）
- **DELETE /tags**: 删除（按名称）

### folders.py — 文件夹管理

树形文件夹 CRUD，106 行。

- **GET /folders**: 列表（按创建时间倒序）
- **POST /folders**: 创建（支持 parent_id 嵌套）
- **PATCH /folders/{id}**: 更新名称
- **DELETE /folders/{id}**: 删除

---

## 关键依赖与配置

### 依赖项

- `fastapi`: Web 框架
- `sqlalchemy[asyncio]`: ORM（async）
- `asyncpg`: PostgreSQL 驱动
- `redis`: Redis 客户端（Session + Pub/Sub）
- `python-jose`: JWT 编码/解码
- `passlib[bcrypt]`: 密码哈希
- `pydantic`: 数据校验
- `websockets`: WebSocket 支持

### 配置文件

**文件**: `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
```

---

## 数据模型

### 核心模型

#### User
```python
class User(Base):
    __tablename__ = "users"
    id: UUID (PK)
    username: str (unique, indexed)
    email: str (unique, indexed)
    password_hash: str
    is_active: bool
    is_verified: bool
    status: UserStatus          # active / pending / rejected
    created_at: DateTime
    updated_at: DateTime
    last_login_at: DateTime (nullable)
```

#### Asset
```python
class Asset(Base):
    __tablename__ = "assets"
    id: UUID (PK)
    user_id: UUID (FK -> User)
    type: AssetType (IMAGE/VIDEO/AUDIO/TEXT)
    name: str
    url: str
    thumbnail_url: str (nullable)
    meta: JSON
    category: str (nullable)
    folder_id: UUID (nullable)
    tags: JSON
    is_starred: bool
    version: str (nullable)
    workflow_snapshot: JSON (nullable)
    created_at: DateTime
```

#### Workflow
```python
class Workflow(Base):
    __tablename__ = "workflows"
    id: UUID (PK)
    user_id: UUID (FK -> User)
    name: str
    description: str (nullable)
    data: JSON
    version: int
    cover_asset_id: UUID (nullable)
    created_at: DateTime
    updated_at: DateTime
```

#### 聊天相关（新增）
```python
class Conversation(Base):
    __tablename__ = "conversations"
    id: UUID (PK)
    type: ConversationType (DIRECT / GROUP)
    name: str (nullable)
    created_at: DateTime

class Message(Base):
    __tablename__ = "messages"
    id: UUID (PK)
    conversation_id: UUID (FK)
    sender_id: UUID (FK -> User)
    content: str
    message_type: str (text / image / video / audio)
    created_at: DateTime
```

#### 通知相关（新增）
```python
class Notification(Base):
    __tablename__ = "notifications"
    id: UUID (PK)
    user_id: UUID (FK -> User)
    title: str
    content: str (nullable)
    notification_type: NotificationType
    status: NotificationStatus (unread / read)
    sender_id: UUID (nullable)
    created_at: DateTime
```

#### 标签/文件夹（新增）
```python
class Tag(Base):
    __tablename__ = "tags"
    id: UUID (PK)
    user_id: UUID (FK -> User)
    name: str

class Folder(Base):
    __tablename__ = "folders"
    id: UUID (PK)
    user_id: UUID (FK -> User)
    name: str
    parent_id: UUID (nullable)  # 支持树形嵌套
    created_at: DateTime
```

---

## 测试与质量

### Pytest 配置

**文件**: `backend/tests/conftest.py`

```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client(db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client, test_user):
    response = await client.post("/api/auth/login", data={...})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### 测试文件

- `tests/test_auth.py` - 认证测试
- `tests/test_assets.py` - 资产测试
- `tests/test_workflows.py` - 工作流测试
- `tests/test_tvc_engine.py` - TVC 执行引擎测试 ★ 新增
- `tests/test_tvc_providers.py` - TVC Provider 工厂测试 ★ 新增
- `tests/test_user_approval.py` - 用户审批测试

### 运行测试

```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

---

## Session 管理（Redis）

**文件**: `backend/app/redis.py`

```python
class SessionManager:
    @staticmethod
    async def create_session(user_id: str, remember: bool) -> str:
        """创建 Redis Session"""

    @staticmethod
    async def get_session(session_id: str) -> dict:
        """获取 Session 数据"""

    @staticmethod
    async def refresh_session(session_id: str, remember: bool):
        """刷新 Session TTL"""
```

Redis 同时用于：
- **Session 管理**: 用户登录态
- **Pub/Sub 消息分发**: 聊天消息跨 Worker、任务状态推送
- **Skills 任务队列**: V2 Skills 后台任务

---

## 常见问题 (FAQ)

### Q: 如何添加新的 V1 API 路由？

A:
1. 在 `backend/app/api/` 创建新的路由文件（如 `new_feature.py`）
2. 定义 router 并添加装饰器
3. 在 `main.py` 中 import 并 include_router

### Q: 如何添加新的 V2 API 路由？

A:
1. 在 `backend/app/api/v2/` 创建路由文件
2. 在 `v2/__init__.py` 中 import 注册
3. V2 路由通过 v2 router 统一挂载

### Q: 如何处理认证？

A: 使用 `get_current_user` 依赖获取当前用户：

```python
from app.api.auth import get_current_user

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"user_id": current_user.id}
```

### Q: 如何要求管理员权限？

A: 使用 `require_admin` 依赖：

```python
from app.api.auth import require_admin

@router.get("/admin/only")
async def admin_route(current_user: User = Depends(require_admin)):
    return {"message": "admin only"}
```

### Q: 如何使用数据库？

A: 使用 `get_db` 依赖获取数据库会话：

```python
from app.database import get_db

@router.post("/items")
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
```

### Q: WebSocket 如何跨 Worker 工作？

A: 通过 Redis Pub/Sub。发送端发布消息到频道，接收端（ConnectionManager）订阅频道并转发给 WebSocket 客户端。多个 Worker 各自持有本地连接，通过 Redis 广播实现消息同步。

---

## 变更记录 (Changelog)

### 2026-05-17
- V2 API 新增 tvc_projects.py TVC 项目管理路由
- V2 API 新增 library.py V2 资产库路由
- V2 API 路由文件从 14 个扩展到 16 个
- 更新 V2 API 路由列表

### 2026-05-15
- 新增测试文件：test_tvc_engine.py、test_tvc_providers.py
- 新增 test_user_approval.py 用户审批测试
- V2 API 目录新增 3 个 TVC 模块（engine/polling/providers）

### 2026-05-14
- 新增 chat.py 即时聊天模块（REST + WebSocket）
- 新增 websocket.py 任务状态推送
- 新增 notifications.py 通知系统
- 新增 admin_users.py 用户审批
- 新增 tags.py 标签管理
- 新增 folders.py 文件夹管理
- V2 API 拆分到 v2/ 子目录（9 个路由文件）
- 更新数据模型（Conversation、Message、Notification、Tag、Folder）
- 更新目录结构和路由列表

### 2026-05-05
- 初始化模块文档
- 识别 10 个 API 路由模块
- 完成认证流程说明
- 完成数据库操作说明
- 添加测试配置说明
