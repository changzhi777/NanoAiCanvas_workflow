[根目录](../../CLAUDE.md) > [backend](../) > [app](./) > **api**

---

# Backend API 模块 - FastAPI 路由定义

> 后端 API 路由模块，包含认证、资产管理、工作流、积分等核心 API

**最后更新**: 2026-05-05
**维护者**: NanoAiCanvas Backend Team

---

## 模块职责

Backend API 模块负责：
- 提供 RESTful API 接口
- 处理认证/授权（JWT）
- 管理资产、工作流、团队、积分等数据
- 离线数据同步
- Session 管理（Redis）

---

## 入口与启动

### FastAPI 应用入口

**文件**: `backend/app/main.py`

```python
from fastapi import FastAPI
from app.api import auth, assets, workflows, sync, points, points_admin, prompt_restrictions, categories, teams, assets_export

app = FastAPI(
    title="NanoAI Canvas API",
    description="Backend API for NanoAI Canvas - Workflow & Asset Management",
    version="0.1.0",
)

# 包含路由
app.include_router(auth.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
# ...
```

### 启动方式

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 对外接口

### API 路由列表

| 路由 | 文件 | 功能 | 认证 |
|------|------|------|------|
| `POST /api/auth/register` | `auth.py` | 用户注册 | 否 |
| `POST /api/auth/login` | `auth.py` | 用户登录 | 否 |
| `POST /api/auth/refresh` | `auth.py` | 刷新 Token | 否 |
| `GET /api/auth/me` | `auth.py` | 获取当前用户 | 是 |
| `PUT /api/auth/me` | `auth.py` | 更新用户信息 | 是 |
| `GET /api/assets` | `assets.py` | 列表资产 | 是 |
| `POST /api/assets` | `assets.py` | 创建资产 | 是 |
| `GET /api/assets/{id}` | `assets.py` | 获取资产 | 是 |
| `PATCH /api/assets/{id}` | `assets.py` | 更新资产 | 是 |
| `DELETE /api/assets/{id}` | `assets.py` | 删除资产 | 是 |
| `GET /api/workflows` | `workflows.py` | 列表工作流 | 是 |
| `POST /api/workflows` | `workflows.py` | 创建工作流 | 是 |
| `GET /api/workflows/{id}` | `workflows.py` | 获取工作流 | 是 |
| `PATCH /api/workflows/{id}` | `workflows.py` | 更新工作流 | 是 |
| `DELETE /api/workflows/{id}` | `workflows.py` | 删除工作流 | 是 |
| `GET /api/points` | `points.py` | 获取积分 | 是 |
| `POST /api/points/deduct` | `points.py` | 扣减积分 | 是 |
| `GET /api/categories` | `categories.py` | 列表分类 | 是 |
| `POST /api/categories` | `categories.py` | 创建分类 | 是 |
| `GET /api/teams` | `teams.py` | 列表团队 | 是 |
| `POST /api/teams` | `teams.py` | 创建团队 | 是 |
| `POST /api/sync/push` | `sync.py` | 推送同步 | 是 |
| `POST /api/sync/pull` | `sync.py` | 拉取同步 | 是 |

---

## 关键依赖与配置

### 依赖项

- `fastapi`: Web 框架
- `sqlalchemy[asyncio]`: ORM（async）
- `asyncpg`: PostgreSQL 驱动
- `redis`: Redis 客户端
- `python-jose`: JWT 编码/解码
- `passlib[bcrypt]`: 密码哈希

### 配置文件

**文件**: `backend/app/config.py`

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

---

## 常见问题 (FAQ)

### Q: 如何添加新的 API 路由？

A:
1. 在 `backend/app/api/` 创建新的路由文件（如 `new_feature.py`）
2. 定义 router 并添加装饰器
3. 在 `main.py` 中 import 并 include_router

### Q: 如何处理认证？

A: 使用 `get_current_user` 依赖获取当前用户：

```python
from app.api.auth import get_current_user

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"user_id": current_user.id}
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

---

## 相关文件清单

```
backend/app/api/
├── __init__.py
├── auth.py              # 认证路由
├── assets.py            # 资产管理
├── workflows.py         # 工作流管理
├── points.py            # 积分系统
├── points_admin.py     # 积分管理后台
├── categories.py        # 分类管理
├── teams.py             # 团队管理
├── sync.py              # 离线同步
├── assets_export.py     # 批量导出
└── prompt_restrictions.py  # 提示词限制
```

---

## 变更记录 (Changelog)

### 2026-05-05
- 初始化模块文档
- 识别 10 个 API 路由模块
- 完成认证流程说明
- 完成数据库操作说明
- 添加测试配置说明