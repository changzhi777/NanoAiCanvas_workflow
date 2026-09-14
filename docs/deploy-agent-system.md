# Nanoai Team8 Agent System — 部署清单

> 版本: V0.3.0 | 日期: 2026-05-20 | 作者: 外星动物（常智）/ IoTchange

## 1. 前置条件

- [ ] PostgreSQL 可访问，`users` 表已存在
- [ ] Redis 可访问（Pub/Sub + Queue）
- [ ] GLM API Key 已配置（`GLM_API_BASE_URL` + `GLM_API_KEY`）
- [ ] Python 3.10+

## 2. 新增文件清单

### 后端核心（必须）
```
backend/app/models/agent.py                    # 7 数据模型 + 7 枚举
backend/app/api/v2/agent.py                    # 17 API 路由
backend/alembic/versions/015_agent_system.py   # 7 张表迁移
backend/app/services/agent/                    # 24 个 Python 文件
backend/nanoai-agent.yaml                      # Agent 配置
```

### 前端（必须）
```
src/lib/api/agent-api.ts                       # API 客户端
src/stores/agentStore.ts                       # Zustand 状态管理
src/components/nanoai-workflow/ui/AgentChatPanel.tsx  # Agent 对话面板
src/components/ui/AboutDialog.tsx              # About 对话框
```

### 修改的文件
```
backend/app/main.py                            # Agent 启动/停止 + router 注册
backend/app/models/__init__.py                 # 模型注册
```

### 测试（推荐）
```
backend/tests/agent/conftest.py                # 测试 conftest
backend/tests/agent/test_agent_system.py       # 57 单元测试
```

## 3. 部署步骤

```bash
# 1. 拉取代码
git pull origin main

# 2. 执行数据库迁移
cd backend
source venv/bin/activate
alembic upgrade head

# 3. 验证迁移（7 张新表）
psql -c "\dt agent_*"  # 应显示 agent_sessions, agent_memories, agent_tasks, agent_execution_logs
psql -c "\dt system_skills"
psql -c "\dt user_skills"
psql -c "\dt skill_promotion_requests"

# 4. 重启后端服务
# uvicorn 或 docker 重启

# 5. 验证 Agent Gateway 启动
# 查看日志应包含:
# ✅ Agent Gateway started
# Sleep scheduler started, will run at 3:00 daily

# 6. 验证 API
curl http://localhost:8000/api/v2/agent/about
curl http://localhost:8000/api/v2/agent/agents
```

## 4. 配置说明（nanoai-agent.yaml）

如需自定义 Agent 模型、睡眠时间、记忆参数，编辑 `backend/nanoai-agent.yaml`。

默认配置：
- 模型: glm-4-flash（cloud）
- 睡眠时间: 03:00 UTC
- 记忆修剪阈值: stability < 0.3
- L2 半衰期: 30 天 | L3 半衰期: 90 天

## 5. 可选: MCP Bridge

MCP Bridge 为独立进程，通过 Redis Pub/Sub 与 Gateway 通信：

```bash
cd backend
python -m app.services.agent.mcp.bridge
```

5 个 Tools: agent_chat, start_pipeline, get_pipeline_status, list_agents, get_about

## 6. 回滚方案

```bash
# 回滚数据库
alembic downgrade 014_tvc_projects

# 回滚代码
git revert HEAD
```

## 7. 监控指标

- `agent_execution_logs` 表: 每次 Agent 执行的耗时/token/成功失败
- `agent_tasks` 表: 流水线任务状态
- `agent_memories` 表: 记忆条数和稳定性分布
- 睡眠报告: `backend/app/services/agent/memory/sleep_reports/{date}.json`
