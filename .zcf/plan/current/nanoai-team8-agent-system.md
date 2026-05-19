# Nanoai Team8 自进化 Agent 系统 — 执行计划（v2）

**方案**: 方案 1 增强版（嵌入 FastAPI 后端）
**起始日期**: 2026-05-20
**总工期**: 6 周（P0 2周 + P1 2周 + P2 2周）
**版本管理**: 独立 Git，语义化版本 V0.1.0 起

---

## 版本管理规范

### 版本规则
- 格式：`V{major}.{minor}.{patch}`
- **patch**（第3位）：每次提交/部署自动 +1（如 V0.1.0 → V0.1.1）
- **minor**（第2位）：手动升级，新增 Agent/Pipeline 阶段时 +1（如 V0.1.x → V0.2.0）
- **major**（第1位）：架构重大变更时手动升级（如 V0.x → V1.0.0）

### Git 管理
- 独立 Git 仓库管理 `backend/app/services/agent/` 目录
- 版本号存储在 `backend/app/services/agent/VERSION` 文件
- 每次部署自动读取 VERSION，patch +1 后写回

### 著作权标注

**代码文件头部统一注释**：
```python
# Nanoai Team8 Agent System
# Copyright © 2026 AiHXC.Team
# Version: {读取 VERSION 文件}
# Agent: {agent_name}
```

**API 路由注释**：
```python
# Nanoai Team8 Agent API — V0.1.0
# Copyright © 2026 AiHXC.Team
```

**前端调用处注释**：
```typescript
// Nanoai Team8 Agent Client — V0.1.0
// Copyright © 2026 AiHXC.Team
```

### "关于"页面显示

**后端新增接口**：`GET /api/v2/agent/about`

```python
# 返回:
{
    "name": "Nanoai Team8 Agent System",
    "version": "V0.1.0",
    "copyright": "Copyright © 2026 AiHXC.Team",
    "agents": ["producer", "screenwriter", "director", ...],
    "model_mode": "cloud",  # local / cloud / hybrid
    "sleep_status": "idle",  # idle / running / scheduled
    "last_sleep": "2026-05-20T03:00:00Z",
    "skills_count": 6,
    "users_count": 0
}
```

**前端修改**：
- 修改 `src/components/toolbar/Toolbar.tsx` — 在设置图标旁添加"关于"图标
- 新建 `src/components/ui/AboutDialog.tsx` — 弹窗显示系统信息 + Agent 信息
- 读取 `/api/v2/agent/about` 展示版本、著作权、Agent 状态

---

## P0 — 核心改编链（第 1-2 周）

目标：跑通 "小说→大纲→剧本→分镜" 核心链路

### Step 0: 版本管理基础建设

**新建文件**: `backend/app/services/agent/VERSION`
```
V0.1.0
```

**新建文件**: `backend/app/services/agent/__init__.py`
```python
# Nanoai Team8 Agent System
# Copyright © 2026 AiHXC.Team
from pathlib import Path

def get_version() -> str:
    version_file = Path(__file__).parent / "VERSION"
    return version_file.read_text().strip()

__version__ = get_version()
```

**新建文件**: `backend/app/services/agent/copyright.py`
```python
# Nanoai Team8 Agent System
# Copyright © 2026 AiHXC.Team
AGENT_NAME = "Nanoai Team8 Agent System"
COPYRIGHT = "Copyright © 2026 AiHXC.Team"
```

**预期结果**: `from app.services.agent import __version__` 返回 `"V0.1.0"`

### Step 1: 数据模型 + 迁移

**新建文件**: `backend/app/models/agent.py`
```
# Nanoai Team8 Agent System — Data Models
# Copyright © 2026 AiHXC.Team
# Version: auto-read from agent.VERSION

类/结构:
- AgentSession(id, user_id, status, pipeline_type, context_json, created_at, updated_at)
- AgentMemory(id, user_id, layer[0-3], category, content, stability, access_count, half_life_days, last_accessed, expires_at, created_at)
- AgentTask(id, user_id, session_id, pipeline_type, status[queued/running/completed/failed], params_json, result_json, progress, created_at, completed_at)
- AgentExecutionLog(id, user_id, task_id, agent_name, stage, input_tokens, output_tokens, duration_ms, success, error_message, model_used, created_at)
  ↑ 新增：记录每次 Agent 执行的详细指标，供睡眠模式分析
- SystemSkill(id, name, version, skill_md, config_json, status[draft/active/pinned/archived], stability, usage_count, success_rate, avg_duration_ms, source_user_id, created_at, updated_at)
  ↑ 新增 avg_duration_ms：平均执行耗时，用于效率优化
- UserSkill(id, user_id, system_skill_id, name, version, skill_md, config_json, status[personal/promoted/merged/diverged], fork_version, stability, usage_count, success_rate, avg_duration_ms, divergence, created_at, updated_at)
- SkillPromotionRequest(id, user_id, user_skill_id, system_skill_id, status[pending/testing/approved/rejected/merged], diff_summary, test_results_json, created_at, reviewed_at)
```

**修改文件**: `backend/app/models/__init__.py` — 注册新模型

**新建文件**: `backend/alembic/versions/015_agent_system.py`

**预期结果**: `alembic upgrade head` 成功，8 张新表创建

### Step 2: ModelRouter — 双模式模型路由

**新建文件**: `backend/app/services/agent/model_router.py`
```
# Nanoai Team8 Agent System — Model Router
# Copyright © 2026 AiHXC.Team

类/逻辑:
- class ModelRouter:
    - __init__(config_path="nanoai-agent.yaml")
    - async chat_completion(messages, model, stream=False, tools=None) -> AsyncIterator | dict
      · 根据 model 查配置 → local(omlx) 或 cloud(api_key)
      · httpx.AsyncClient 调 OpenAI 兼容 API
      · stream=True 返回 async generator
    - async health_check() -> {local: bool, cloud: bool}
    - _resolve_model(agent_name, tier) -> (base_url, api_key, model_id)
    - record_usage(model, input_tokens, output_tokens, duration_ms, success)
      · 写入 AgentExecutionLog（供睡眠分析）

配置文件: `backend/nanoai-agent.yaml`
```

### Step 3: MemoryStack — 4 层记忆管理

**新建文件**: `backend/app/services/agent/memory_stack.py`
```
# Nanoai Team8 Agent System — Memory Stack
# Copyright © 2026 AiHXC.Team

类/逻辑:
- class MemoryStack:
    - async wake_up() -> dict   # 加载 L0+L1
    - async sleep_prep(session_data)
    - async query(layer, category, keyword) -> list
    - async prune()
    - calc_stability(item) -> float
    - async record_execution_experience(exec_log: AgentExecutionLog)
      · 从执行日志中提取成功模式 → 写入 L1 精华记忆
      · 提取失败模式 → 写入避错规则
```

### Step 4: Agent 基类 + 3 个核心 Agent

**新建文件**: `backend/app/services/agent/agents/base.py`
```
# Nanoai Team8 Agent System — Base Agent
# Copyright © 2026 AiHXC.Team

- class BaseAgent(ABC):
    - async run(task, context) -> dict
    - async chat(messages, stream=True) -> AsyncIterator
    - async record_experience(result)
    - async _measure_execution(agent_name, stage, fn, **kwargs) -> result
      · 装饰器：测量执行耗时 + token 消耗 + 成功率
      · 自动写入 AgentExecutionLog
      · 失败时记录 error_message
```

**新建文件**: `backend/app/services/agent/agents/producer.py`
**新建文件**: `backend/app/services/agent/agents/screenwriter.py`
**新建文件**: `backend/app/services/agent/agents/director.py`

（逻辑同 v1 计划，每个文件头部加著作权注释）

### Step 5: Pipeline — 8 阶段改编流水线

**新建文件**: `backend/app/services/agent/pipeline.py`
```
# Nanoai Team8 Agent System — Adaptation Pipeline
# Copyright © 2026 AiHXC.Team

- class AdaptationPipeline:
    - stages = [文稿准备, 统计, 大纲, 规划, 剧本, 质控, 合并, 归档]
    - async execute(task) -> dict
    - async run_stage(stage_name, context) -> stage_result
    - async _record_stage_metrics(stage, duration_ms, tokens, success)
      · 每阶段执行后记录指标到 AgentExecutionLog
```

### Step 6: API 路由 + SSE/WS 集成

**新建文件**: `backend/app/api/v2/agent.py`
```
# Nanoai Team8 Agent System — API Routes
# Copyright © 2026 AiHXC.Team

路由:
- POST /api/v2/agent/chat
- POST /api/v2/agent/pipeline/start
- GET  /api/v2/agent/pipeline/{id}
- WS   /ws/agent/{user_id}
- GET  /api/v2/agent/agents
- GET  /api/v2/agent/system/status
- GET  /api/v2/agent/about         ← 新增：版本+著作权+状态
```

### Step 7: Agent Gateway 主循环

**新建文件**: `backend/app/services/agent/gateway.py`
```
# Nanoai Team8 Agent System — Gateway
# Copyright © 2026 AiHXC.Team

- class AgentGateway:
    - model_router / task_queue / agents / pipeline
    - async start()
    - async handle_chat / handle_pipeline / handle_skill
    - async _collect_execution_stats() -> dict
      · 汇总 AgentExecutionLog 统计信息
      · 返回给 about 接口
```

### Step 8: 配置文件 + Agent Prompt + "关于"前端

**新建文件**: `backend/nanoai-agent.yaml`
**新建文件**: `backend/app/services/agent/agents/prompts/producer.md`
**新建文件**: `backend/app/services/agent/agents/prompts/screenwriter.md`
**新建文件**: `backend/app/services/agent/agents/prompts/director.md`

**新建文件**: `src/lib/api/agent-api.ts`
```typescript
// Nanoai Team8 Agent Client — V0.1.0
// Copyright © 2026 AiHXC.Team

export const AGENT_VERSION = "V0.1.0";
export const AGENT_COPYRIGHT = "Copyright © 2026 AiHXC.Team";

export async function getAgentAbout() { ... }
export async function startPipeline(...) { ... }
export function connectAgentWS(userId: string) { ... }
```

**新建文件**: `src/components/ui/AboutDialog.tsx`
```
- 系统信息：NanoAiCanvas V2.12.350
- Agent 信息：Nanoai Team8 V0.1.0
- 著作权：Copyright © 2026 AiHXC.Team
- Agent 状态：运行中 / 睡眠中 / 离线
- 模型模式：local / cloud / hybrid
- 技能数量、用户数
```

**修改文件**: `src/components/toolbar/Toolbar.tsx` — 添加"关于"图标入口

**预期结果**: 工具栏点击"关于"弹出对话框，显示系统和 Agent 信息

---

## P1 — 视觉子团队 + 技能系统（第 3-4 周）

### Step 9: ArtDirectorAgent + CharacterDesignerAgent + SceneDesignerAgent

```
- 3 个新 Agent，每个带著作权注释
- 版本升级为 V0.2.0（新增 3 个 Agent = minor 升级）
```

### Step 10: Skills Registry — 技能注册 + 生命周期
### Step 11: User Branch — Git 式用户分支
### Step 12: WebSocket 增强 — 实时 Agent 事件

---

## P2 — 音视频 + 睡眠模式 + 自进化（第 5-6 周）

### Step 13: VoiceDirectorAgent + EditorAgent + ComposerAgent

```
- 版本升级为 V0.3.0（新增 3 个 Agent = minor 升级）
```

### Step 14: 睡眠模式 — 效率自优化核心

**新增文件**: `backend/app/services/agent/sleep/efficiency_optimizer.py`
```
# Nanoai Team8 Agent System — Efficiency Optimizer
# Copyright © 2026 AiHXC.Team

class EfficiencyOptimizer:
    """基于执行日志的效率自优化引擎"""
    
    async analyze_execution_logs(since_days=7) -> OptimizationReport:
        """
        睡眠模式核心：分析历史执行数据，识别优化机会
        
        数据来源: AgentExecutionLog 表
        分析维度:
        1. 瓶颈识别：avg_duration_ms 最长的 stage + agent
        2. 失败模式：error_message 聚类分析
        3. 成功模式：success=true 且 duration 低于平均的 config 对比
        4. Token 效率：output_tokens / input_tokens 比值异常
        5. 模型对比：同一 agent 不同 model 的 duration 对比
        """
    
    async optimize_prompt(agent_name, stage, successful_logs, failed_logs) -> str:
        """
        基于 successful vs failed 对比，优化 agent 的 prompt
        - 成功案例共性提取 → 强化 prompt 指令
        - 失败案例共性提取 → 添加避错规则
        """
    
    async optimize_config(agent_name, stage, logs) -> dict:
        """
        参数调优：
        - temperature: 成功率高的 temperature 分布
        - max_tokens: 实际 output_tokens 分布 → 调整 max_tokens
        - batch_size: 并行度优化
        """
    
    async suggest_pipeline_reorder(pipeline_logs) -> list[dict]:
        """
        Pipeline 重排建议：
        - 哪些 stage 可以并行（无依赖关系）
        - 哪些 stage 耗时异常（需要拆分或优化 prompt）
        """
    
    async generate_sleep_report() -> SleepReport:
        """
        睡眠报告：
        - 执行统计：总任务数、成功率、平均耗时
        - 瓶颈排名：最慢的 5 个 (agent, stage) 组合
        - 优化建议：具体可执行的 prompt/config 变更
        - 版本对比：与上次报告的效率变化
        """
```

**修改文件**: `backend/app/services/agent/agents/base.py`
```
- BaseAgent._measure_execution 自动记录执行指标
- 每次 Agent 执行自动写入 AgentExecutionLog
- 字段：agent_name, stage, input_tokens, output_tokens, 
        duration_ms, success, error_message, model_used
```

**睡眠模式流程更新**：

```
Phase 1: 回顾（遍历 L1-L3）
Phase 2: 修剪（Stability < 0.3 清除）
Phase 3: 技能审查（SkillCurator）
Phase 4: 效率优化（EfficiencyOptimizer）← 新增
  · 分析 AgentExecutionLog 近 7 天数据
  · 识别瓶颈 stage + 高失败率 agent
  · 对比成功/失败 config 差异
  · 生成优化后的 prompt / config
  · 写入 agent_skills 配置（需下次验证）
Phase 5: 验证（在沙箱中测试优化后的配置）
Phase 6: 报告（包含效率优化建议）
```

### Step 15: MCP Server + oMLX 集成
### Step 16: 代码自动更新（v2 增强）

---

## 效率自优化数据流

```
正常运行时:
  Agent 执行任务
    → _measure_execution() 自动记录
    → AgentExecutionLog(agent, stage, tokens, duration, success, error)
    → Redis 推送到 agent:execution:{user_id} channel

睡眠模式时 (每天 03:00):
  EfficiencyOptimizer.analyze_execution_logs(7)
    → 读取 AgentExecutionLog 近 7 天数据
    → 瓶颈识别：stage × agent × duration 聚合
    → 失败模式：error_message 聚类
    → 成功模式：config 差异分析
    → 生成 OptimizationReport
    
  对每个优化建议:
    → 如果是 prompt 优化 → 修改 prompts/{agent}.md
    → 如果是 config 优化 → 修改 nanoai-agent.yaml 中对应 agent config
    → 如果是 pipeline 重排 → 修改 pipeline stage 顺序
    
  验证:
    → 在沙箱中用历史数据重新跑一次
    → 对比优化前后 duration + success_rate
    → 通过则自动应用，失败则回滚 + 记录失败原因
    
  报告:
    → 写入 system_memory L1
    → 通过 WS 推送给在线用户
    → 记录到 sleep_reports/ 目录
```

---

## 依赖关系

```
Step 0 (版本基础) → Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7 → Step 8
P0 完成后 → Step 9 → 10 → 11 → 12
P1 完成后 → Step 13 → 14 → 15 → 16
```

## 文件清单（P0，含新增）

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `app/services/agent/VERSION` | 版本号文件 |
| 新建 | `app/services/agent/__init__.py` | 包初始化 + 版本读取 |
| 新建 | `app/services/agent/copyright.py` | 著作权常量 |
| 新建 | `app/models/agent.py` | 8 个数据模型（含 AgentExecutionLog） |
| 修改 | `app/models/__init__.py` | 注册新模型 |
| 新建 | `alembic/versions/015_agent_system.py` | 数据库迁移 |
| 新建 | `app/services/agent/gateway.py` | Agent 主循环 |
| 新建 | `app/services/agent/model_router.py` | 双模式路由 |
| 新建 | `app/services/agent/memory_stack.py` | 记忆栈 |
| 新建 | `app/services/agent/pipeline.py` | Pipeline |
| 新建 | `app/services/agent/agents/__init__.py` | Agent 包 |
| 新建 | `app/services/agent/agents/base.py` | Agent 基类 |
| 新建 | `app/services/agent/agents/producer.py` | Producer |
| 新建 | `app/services/agent/agents/screenwriter.py` | Screenwriter |
| 新建 | `app/services/agent/agents/director.py` | Director |
| 新建 | `app/services/agent/agents/prompts/producer.md` | 提示词 |
| 新建 | `app/services/agent/agents/prompts/screenwriter.md` | 提示词 |
| 新建 | `app/services/agent/agents/prompts/director.md` | 提示词 |
| 新建 | `app/api/v2/agent.py` | API 路由（含 /about） |
| 修改 | `app/main.py` | 挂载路由 + lifespan |
| 新建 | `nanoai-agent.yaml` | 配置文件 |
| 新建 | `src/lib/api/agent-api.ts` | 前端 Agent API 客户端 |
| 新建 | `src/components/ui/AboutDialog.tsx` | "关于"弹窗组件 |
| 修改 | `src/components/toolbar/Toolbar.tsx` | 添加"关于"入口 |

**总计**: 21 新建 + 4 修改 = 25 个文件
