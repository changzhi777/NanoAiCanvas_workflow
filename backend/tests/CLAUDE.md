[根目录](../../../CLAUDE.md) > [backend](../../) > **tests**

---

# Backend Tests — 后端测试体系

> Pytest 8.0.0 + pytest-asyncio + 三层测试结构（unit / agent / integration）

**最后更新**: 2026-08-11
**配置文件**: `backend/pytest.ini`
**文件数**: 12 Python 测试文件 + 3 conftest.py

---

## 模块职责

`backend/tests/` 是后端测试根目录，负责：
- **单元测试**（`unit/`）：纯 mock 测试，无 DB 依赖，快速验证业务逻辑
- **Agent 测试**（`agent/`）：Agent 系统模型与注册表测试
- **集成测试**（根目录）：依赖真实 PostgreSQL 测试库（`nanoai_test`），验证端到端流程
- **conftest 分层**：每层独立 conftest，避免上层依赖污染下层

---

## 目录结构

```
backend/
├── pytest.ini                       # 全局配置：asyncio_mode=auto, testpaths=tests
└── tests/
    ├── __init__.py
    ├── conftest.py                  # 集成测试 fixtures（需 asyncpg + 测试库）
    ├── test_auth.py                 # 认证流程（注册/登录/JWT）
    ├── test_assets.py               # 资产 CRUD
    ├── test_workflows.py            # 工作流保存/加载
    ├── test_user_approval.py        # 用户审批
    ├── test_tvc_engine.py           # TVC 执行引擎
    ├── test_tvc_providers.py        # TVC Provider 工厂
    ├── unit/                        # 单元测试（无 DB）
    │   ├── __init__.py
    │   ├── conftest.py              # mock asyncpg + app.redis（启动前注入）
    │   ├── test_points_service.py   # 积分计价/扣费
    │   ├── test_api_key_service.py  # Key 热加载/缓存
    │   ├── test_model_scanner.py    # 模型可用性扫描
    │   ├── test_workflow_executor.py # TVC 执行器
    │   ├── test_video_thumbnail.py  # FFmpeg 关键帧提取
    │   └── test_pubsub.py           # Redis Pub/Sub
    └── agent/                       # Agent 系统测试
        ├── conftest.py              # _TestBase 替身 + mock redis/config
        └── test_agent_system.py     # 9 Agent / 记忆模型 / 管线 / 路由
```

---

## 关键配置

### pytest.ini

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
# Unit tests use --confcutdir to avoid loading parent conftest (requires asyncpg)
# Integration tests: python -m pytest tests/ (needs asyncpg + test DB)
```

### 三层 conftest 分层策略

| 层 | conftest 位置 | 策略 |
|---|---|---|
| **unit** | `tests/unit/conftest.py` | 启动前 `sys.modules` 注入 mock asyncpg + mock app.redis，**不连真实 DB** |
| **agent** | `tests/agent/conftest.py` | 提供空 `_TestBase(DeclarativeBase)` 替身 + mock app.database + mock app.redis + mock app.config |
| **integration** | `tests/conftest.py` | 真实 `TEST_DATABASE_URL`（`postgresql+asyncpg://...@64.118.135.134/nanoai_test`），每测试函数建/删表 |

> 关键技巧：单元测试通过 `--confcutdir` 避免加载上层集成 conftest（否则会触发 asyncpg 导入）。

---

## 测试运行

### 单元测试（无需 DB，最快）

```bash
cd backend
python -m pytest tests/unit/ -v --confcutdir=tests/unit
# 或
PYTHONPATH=. pytest tests/unit/ -v --confcutdir=tests/unit
```

### Agent 测试（无需 DB）

```bash
cd backend
python -m pytest tests/agent/ -v
```

### 集成测试（需要测试库）

```bash
# 前置：测试库已创建（nanoai_test），网络可达 64.118.135.134:5432
cd backend
PYTHONPATH=. pytest tests/ -v
# 或指定文件
PYTHONPATH=. pytest tests/test_auth.py tests/test_tvc_engine.py -v
```

### 全量测试

```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

---

## 测试覆盖矩阵

| 模块 | 单元测试 | Agent 测试 | 集成测试 |
|------|---------|-----------|---------|
| 认证（auth） | - | - | `test_auth.py` |
| 资产（assets） | - | - | `test_assets.py` |
| 工作流（workflows） | - | - | `test_workflows.py` |
| 用户审批 | - | - | `test_user_approval.py` |
| TVC 引擎 | - | - | `test_tvc_engine.py` |
| TVC Provider 工厂 | - | - | `test_tvc_providers.py` |
| 积分服务 | `test_points_service.py` | - | - |
| API Key 服务 | `test_api_key_service.py` | - | - |
| 模型扫描器 | `test_model_scanner.py` | - | - |
| 工作流执行器 | `test_workflow_executor.py` | - | - |
| 视频缩略图 | `test_video_thumbnail.py` | - | - |
| Redis Pub/Sub | `test_pubsub.py` | - | - |
| Agent 9 角色 / 记忆 / 管线 | - | `test_agent_system.py` | - |

---

## 关键 fixtures

### 集成测试 fixtures（`tests/conftest.py`）

| Fixture | 作用域 | 描述 |
|---------|--------|------|
| `event_loop` | session | 自定义事件循环 |
| `db_session` | function | 建表 → yield session → 删表 |
| `client` | function | httpx.AsyncClient + ASGITransport + DB 覆盖 |
| `test_user` | function | 创建测试用户 |
| `auth_headers` | function | 登录获取 JWT，返回 Authorization 头 |

### 单元测试 mock（`tests/unit/conftest.py`）

启动前 `sys.modules` 注入：
- `asyncpg` → `MagicMock`
- `app.redis` → mock 模块，`redis_client.get/setex/publish/pipeline` 全部 AsyncMock

### Agent 测试 mock（`tests/agent/conftest.py`）

启动前 `sys.modules` 注入：
- `app.database` → 提供 `_TestBase(DeclarativeBase)` + mock `async_session_maker` + mock `get_db`
- `app.redis` → mock `redis_client`
- `app.config` → mock `get_settings()` 返回 `GLM_API_BASE_URL` / `GLM_API_KEY`

---

## 常见问题 (FAQ)

### Q: 单元测试报 asyncpg 错误？
A: 用 `--confcutdir=tests/unit` 避免加载上层 conftest；确认 `tests/unit/conftest.py` 在文件头部完成 `sys.modules` 注入。

### Q: 集成测试连接失败？
A: 检查 `TEST_DATABASE_URL`（在 `tests/conftest.py` 硬编码 `64.118.135.134:5432/nanoai_test`）。需要：1) 网络可达；2) 测试库已创建；3) 用户对测试库有 DDL 权限（每测试函数会建/删表）。

### Q: 如何新增单元测试？
A: 1) 在 `tests/unit/` 创建 `test_*.py`；2) import 业务模块前，确保 `conftest.py` mock 已注入；3) 使用 `pytest.mark.asyncio` 标注异步测试（`asyncio_mode=auto` 下可省略）。

### Q: Agent 测试如何 mock LLM 调用？
A: 在 `test_agent_system.py` 内使用 `unittest.mock.patch` 替换 `ModelRouter.chat_completion`，避免真实 GLM 调用。

---

## 相关文件清单

```
backend/
├── pytest.ini                          # 全局配置
└── tests/
    ├── __init__.py / conftest.py       # 集成层
    ├── test_auth.py                    # 认证
    ├── test_assets.py                  # 资产
    ├── test_workflows.py               # 工作流
    ├── test_user_approval.py           # 用户审批
    ├── test_tvc_engine.py              # TVC 引擎
    ├── test_tvc_providers.py           # TVC Provider
    ├── unit/                           # 6 单元测试 + conftest
    │   ├── conftest.py
    │   ├── test_points_service.py
    │   ├── test_api_key_service.py
    │   ├── test_model_scanner.py
    │   ├── test_workflow_executor.py
    │   ├── test_video_thumbnail.py
    │   └── test_pubsub.py
    └── agent/                          # Agent 测试 + conftest
        ├── conftest.py
        └── test_agent_system.py
```

---

## 变更记录 (Changelog)

### 2026-08-11
- 初始化模块文档
- 覆盖三层结构（unit / agent / integration）
- 记录 12 测试文件 + 3 conftest 分层策略
- 记录 `--confcutdir` 技巧与 mock 注入模式

### 2026-06-08（项目级）
- 批量新增单元测试：points / api_key / model_scanner / workflow_executor / video_thumbnail / pubsub
- Agent 测试落地：9 角色 + 记忆模型 + 管线 + 注册表完整性
