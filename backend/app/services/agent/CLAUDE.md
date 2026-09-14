[根目录](../../../../CLAUDE.md) > [backend](../../../) > [app](../../) > [services](../) > **agent**

---

# Nanoai Team8 Agent System — 自进化短剧创作 Agent Team

> 9 角色化 Agent Team + 4 层记忆栈 + 6 阶段睡眠自优化 + Git 式技能系统 + 双模型路由 + 8 阶段改编管线

**版本**: V0.3.0（独立版本号）
**最后更新**: 2026-08-11
**版权**: AiHXC.Team
**文件数**: 24 Python 源文件 + prompts/ + configs/

---

## 模块职责

Agent 系统是后端的"短剧创作 AI 团队"，负责：
- **9 角色协作**：Producer / Screenwriter / Director / ArtDirector / CharacterDesigner / SceneDesigner / VoiceDirector / Editor / Composer
- **4 层记忆栈**：L0 Identity → L1 Essential → L2 On-Demand → L3 Deep Search，Stability 半衰期评分 + 自动修剪
- **6 阶段睡眠模式**：review_memories → prune → skill_review → efficiency_optimization → validation → report（每日凌晨 3 点触发）
- **Git 式技能系统**：fork/diff/pull/push/merge + 晋升审核（user_skill → system_skill）
- **8 阶段改编管线**：prepare → statistics → outline → plan → script → quality_control → merge → archive
- **双模型路由**：Cloud（GLM API）+ Local（oMLX localhost:11434），支持 stream/non-stream
- **MCP 桥接**：stdio ↔ Redis Pub/Sub，对接 Claude Code / Cursor 等 MCP 客户端

---

## 目录结构

```
backend/app/services/agent/
├── __init__.py                # 版本读取（VERSION 文件）
├── VERSION                    # 独立版本号 V0.3.0
├── copyright.py               # AGENT_NAME / COPYRIGHT 常量
├── gateway.py                 # AgentGateway 网关主循环：BRPOP 消费 + Pipeline/Chat 路由 + 睡眠调度
├── pipeline.py                # AdaptationPipeline 8 阶段改编管线
├── model_router.py            # ModelRouter 双模型路由（Cloud GLM + Local oMLX）
├── memory_stack.py            # MemoryStack 4 层记忆栈 + 半衰期评分
├── skills_registry.py         # SkillsRegistry Git 式技能生命周期
├── agents/
│   ├── __init__.py            # AGENT_REGISTRY（9 角色）
│   ├── base.py                # BaseAgent 抽象基类
│   ├── producer.py            # ProducerAgent — 全局编排
│   ├── screenwriter.py        # ScreenwriterAgent — 剧本/对白
│   ├── director.py            # DirectorAgent — 分镜/镜头
│   ├── art_director.py        # ArtDirectorAgent — 视觉审核
│   ├── character_designer.py  # CharacterDesignerAgent — 角色设定图
│   ├── scene_designer.py      # SceneDesignerAgent — 场景背景图
│   ├── voice_director.py      # VoiceDirectorAgent — TTS 配音
│   ├── editor.py              # EditorAgent — 视频合成/转场
│   └── composer.py            # ComposerAgent — BGM 配乐
├── sleep/
│   ├── scheduler.py           # SleepScheduler 6 阶段睡眠调度
│   ├── efficiency_optimizer.py # EfficiencyOptimizer 5 维效率分析
│   └── auto_updater.py        # AutoUpdater 安全自动更新（仅 prompt 注释 + YAML 建议）
└── mcp/
    └── bridge.py              # MCP stdio ↔ Redis Pub/Sub 桥接（5 Tools）
```

---

## 对外接口

### HTTP / WebSocket 路由（通过 `backend/app/api/v2/agent.py`）

| 路由 | 方法 | 描述 |
|------|------|------|
| `/api/v2/agent/about` | GET | Agent 系统信息（版本、9 角色描述） |
| `/api/v2/agent/chat` | POST | Agent 单轮/多轮对话 |
| `/api/v2/agent/chat/stream` | POST | Agent SSE 流式对话 |
| `/api/v2/agent/ws` | WS | WebSocket 双向通信 |
| `/api/v2/agent/pipeline/start` | POST | 启动 8 阶段改编管线 |
| `/api/v2/agent/pipeline/{id}/status` | GET | 管线状态查询 |
| `/api/v2/agent/skills` | GET/POST | SystemSkill / UserSkill 查询与创建 |
| `/api/v2/agent/skills/{id}/fork` | POST | 用户 fork 系统技能 |
| `/api/v2/agent/skills/{id}/pull` | POST | 拉取技能更新 |
| `/api/v2/agent/skills/{id}/push` | POST | 推送技能修改 |
| `/api/v2/agent/skills/merge` | POST | 合并分支 |
| `/api/v2/agent/skills/promotion` | POST | 提交晋升申请 |
| `/api/v2/agent/memories` | GET/POST | Agent 记忆查询/写入 |
| `/api/v2/agent/sessions` | GET/POST | Agent 会话管理 |
| `/api/v2/agent/tasks` | GET | Agent 任务查询 |
| `/api/v2/agent/sleep/report` | GET | 最近一次睡眠报告 |
| `/api/v2/agent/health` | GET | 健康检查 |

> 完整 17 路由定义见 `backend/app/api/v2/agent.py`

### MCP Tools（5 个）

| Tool | 描述 |
|------|------|
| `agent_chat` | 调用指定 Agent 对话 |
| `pipeline_run` | 启动改编管线 |
| `skills_list` | 列出技能 |
| `skills_fork` | Fork 系统技能 |
| `memories_query` | 查询 Agent 记忆 |

---

## 关键依赖

| 依赖 | 用途 |
|------|------|
| `app.redis.redis_client` | 任务队列（BRPOP）+ Pub/Sub + 状态持久化 |
| `app.database.async_session_maker` | PostgreSQL 记忆/技能/会话持久化 |
| `app.models.agent` | 7 张数据表对应模型 |
| GLM API（Cloud） | 主模型源：Qwen3-30B / GLM-5 / GLM-4-9B 等 |
| oMLX localhost:11434（Local） | 本地降级模型源 |
| External TTS / 图片 / 视频服务 | Agent 输出多模态产物 |

### 队列与频道

| Redis Key | 用途 |
|-----------|------|
| `agent:task_queue` | 任务主队列（BRPOP 消费） |
| `agent:ws:{user_id}` | WebSocket 推送频道 |
| `agent_pipeline:{task_id}` | 管线状态（48h TTL） |
| `agent_pipeline_ch:{task_id}` | 管线进度 Pub/Sub 频道 |

---

## 数据模型（7 张表）

定义于 `backend/app/models/agent.py`，迁移文件 `alembic/versions/015_agent_system.py`：

| 模型 | 用途 |
|------|------|
| **AgentSession** | Agent 会话（用户 ↔ 多 Agent 对话上下文） |
| **AgentMemory** | 4 层记忆（L0-L3），含 stability / half_life_days / last_accessed 字段驱动半衰期评分 |
| **AgentTask** | Agent 任务（含 TaskStatus 枚举） |
| **AgentExecutionLog** | Agent 执行日志（每次 LLM 调用记录） |
| **SystemSkill** | 系统内置技能（只读） |
| **UserSkill** | 用户 fork 的技能（UserSkillStatus 枚举） |
| **SkillPromotionRequest** | 技能晋升申请（PromotionStatus 枚举） |

### 枚举

- `PipelineType` — 管线类型
- `SessionStatus` — 会话状态
- `TaskStatus` — 任务状态
- `SkillStatus` — 系统技能状态
- `UserSkillStatus` — 用户技能状态
- `PromotionStatus` — 晋升申请状态
- `MemoryLayer` — 记忆层级（L0/L1/L2/L3）

---

## 睡眠模式（6 阶段）

`SleepScheduler` 每日凌晨 3 点触发：

| 阶段 | 模块 | 动作 |
|------|------|------|
| 1. review_memories | MemoryStack | 扫描所有 Agent 记忆，计算 stability |
| 2. prune | MemoryStack | 修剪低 stability 记忆（按半衰期） |
| 3. skill_review | SkillsRegistry | 审查未处理的晋升申请 |
| 4. efficiency_optimization | EfficiencyOptimizer | 5 维分析：瓶颈 / 失败模式 / 成功率 / Token 异常 / 模型对比 |
| 5. validation | AutoUpdater | 验证优化建议安全性 |
| 6. report | SleepScheduler | 生成睡眠报告，写入数据库 |

**EfficiencyOptimizer 输出**：瓶颈分析报告 + 失败模式检测 + 自动优化建议（仅修改 prompt 注释 + YAML 配置，不修改代码逻辑）。

---

## 测试与质量

### 单元测试

**文件**: `backend/tests/agent/test_agent_system.py`

纯 mock 测试，无数据库依赖（conftest 提供 `_TestBase` 替身）。

| 测试类 | 描述 |
|--------|------|
| `TestAgentMemoryModel` | stability 半衰期计算、过期判断 |
| `TestAgentRegistry` | 9 Agent 注册完整性、name/description 校验 |
| `TestPipeline` | 8 阶段管线状态机 |
| `TestModelRouter` | 双模型路由策略 |
| `TestBaseAgent` | `_extract_content` 边界条件 |

### 运行测试

```bash
cd backend
python -m pytest tests/agent/ -v          # Agent 单元测试
# 或：
PYTHONPATH=. pytest tests/agent/ -v
```

> 注：`backend/pytest.ini` 配置 `asyncio_mode = auto`、`testpaths = tests`。

---

## 常见问题 (FAQ)

### Q: 如何启动 Agent 网关？
A: Agent 网关通过 `AgentGateway.start()` 启动，建议在后端启动钩子中调用（异步）。会同时启动 BRPOP 消费循环和 SleepScheduler。

### Q: 如何添加新的 Agent 角色？
A: 1) 在 `agents/` 创建新文件继承 `BaseAgent`；2) 实现 `run(task, context)` 方法；3) 在 `agents/__init__.py` 注册到 `AGENT_REGISTRY`。

### Q: Cloud 和 Local 模型如何切换？
A: `ModelRouter` 按可用性优先 Cloud，失败降级 Local。可通过配置文件强制指定。

### Q: 技能晋升流程？
A: 用户 fork 系统技能 → 修改 → push → 提交 `SkillPromotionRequest` → 睡眠阶段 `skill_review` 审查 → 通过则合并为 SystemSkill。

---

## 相关文件清单

```
backend/app/services/agent/                      # ~3573 行（含 prompts + 配置）
├── __init__.py + VERSION + copyright.py          # 版本与版权
├── gateway.py                                    # 网关主循环
├── pipeline.py                                   # 8 阶段改编管线
├── model_router.py                               # 双模型路由
├── memory_stack.py                               # 4 层记忆栈
├── skills_registry.py                            # Git 式技能系统
├── agents/                                       # 9 角色 Agent
│   ├── base.py                                   # 抽象基类
│   ├── producer.py / screenwriter.py / director.py
│   ├── art_director.py / character_designer.py / scene_designer.py
│   └── voice_director.py / editor.py / composer.py
├── sleep/                                        # 睡眠自优化
│   ├── scheduler.py / efficiency_optimizer.py / auto_updater.py
└── mcp/bridge.py                                 # MCP stdio 桥接
```

---

## 变更记录 (Changelog)

### 2026-08-11
- 初始化模块文档（覆盖 24 个源文件）
- 添加 17 路由表、5 MCP Tools、6 阶段睡眠、7 张数据表说明
- 添加测试运行命令（`pytest tests/agent/ -v`）

### 2026-05-20（项目级）
- V0.3.0 发布：9 Agent + 4 层记忆 + 睡眠自优化 + 双模型路由 + MCP 桥接
