[根目录](../../../../CLAUDE.md) > [backend](../../) > [app](../) > [api](./) > **v2**

---

# V2 API 模块 - 业务逻辑 API

> V2 版本 API，包含 AI 代理、图片生成、工作流任务、管理后台等业务逻辑路由

**最后更新**: 2026-05-14
**维护者**: NanoAiCanvas Backend Team

---

## 模块职责

V2 API 模块负责：
- AI 服务代理（GLM、MiniMax）— API Key 安全存储在后端
- 图片生成任务（多 Provider、多模型路由）
- 工作流任务执行引擎（TVC 任务）
- Skills 任务队列（Redis 队列 + Worker）
- 管理后台（渠道商/模型/密钥/用量统计）
- 应用可见性控制（三态管理）
- API Key 映射（前端 Key -> 后端 Key 热加载）
- 生成日志记录与查询

---

## 路由注册

**文件**: `backend/app/api/v2/__init__.py`

```python
"""V2 API 路由组"""
from fastapi import APIRouter

router = APIRouter()

from . import image, skills, minimax
```

V2 路由通过父级 `api/` 模块统一挂载到 FastAPI 应用。

---

## 目录结构

```
backend/app/api/v2/
├── __init__.py           # 路由注册入口
├── CLAUDE.md             # 本文档
├── workflow_tasks.py     # TVC 工作流任务（998 行）
├── glm_proxy.py          # GLM API 代理（958 行）
├── admin.py              # 管理后台 CRUD（735 行）
├── app_visibility.py     # 应用可见性控制（456 行）
├── skills.py             # Skills 任务队列（312 行）
├── image.py              # 图片生成（312 行）
├── minimax.py            # MiniMax 代理（285 行）
├── key_mapper.py         # API Key 映射（188 行）
└── generation_log.py     # 生成日志（124 行）
```

---

## 路由列表

| 路由前缀 | 文件 | 功能 | 认证 |
|----------|------|------|------|
| `/api/v2/tvc-tasks/*` | `workflow_tasks.py` | TVC 工作流任务提交/查询/取消/SSE进度 | 可选 |
| `/api/v2/glm/*` | `glm_proxy.py` | GLM API 代理（SSE 流式） | 可选 |
| `/api/v2/admin/*` | `admin.py` | 渠道商/模型/密钥/用量/健康检查 | 管理员 |
| `/api/v2/admin/app-visibility/*` | `app_visibility.py` | 应用可见性三态管理 | 管理员 |
| `/api/v2/admin/key-mapper/*` | `key_mapper.py` | 前端Key↔后端Key映射管理 | 管理员 |
| `/v2/skills/*` | `skills.py` | Skills 聊天/模板/生成/队列 | 可选 |
| `/v2/image/*` | `image.py` | 图片生成任务（多Provider） | 可选 |
| `/api/v2/minimax/*` | `minimax.py` | MiniMax 文本/剧本代理 | 可选 |
| `/api/v2/generation-logs/*` | `generation_log.py` | 生成日志记录与查询 | 可选 |

---

## 核心模块详解

### workflow_tasks.py — TVC 工作流任务（998 行）

TVC 视频制作工作流执行引擎。

- `POST /api/v2/tvc-tasks/submit` — 提交任务
- `GET /api/v2/tvc-tasks/{id}` — 查询状态
- `POST /api/v2/tvc-tasks/{id}/cancel` — 取消任务
- `GET /api/v2/tvc-tasks/{id}/progress` — SSE 实时进度流

支持参数：shot_count、shot_duration、mode、style、image_model、video_model 等。
内部调用 `workflow_executor` 服务执行多步骤任务。

### glm_proxy.py — GLM API 代理（958 行）

智谱 GLM API 安全代理，前端不直接暴露 API Key。

- 支持模型：glm-4.5-air、glm-4-flash、glm-4、glm-4.7-flash
- 内置 JSON 修复：多层修复 GLM 输出异常（trailing comma、JS comments、control chars）
- SSE 流式响应：前端可实时接收生成内容
- 提示词优化：内置优化逻辑

### admin.py — 管理后台 CRUD（735 行）

渠道商/模型/密钥/用量统计全生命周期管理。

- **Provider CRUD**: 渠道商管理（name、code、api_base_url）
- **Model CRUD**: 模型管理（关联 Provider）
- **APIKey CRUD**: 密钥管理（关联 Provider，支持启用/禁用）
- **ModelRoute**: 模型路由配置
- **用量统计**: ModelUsageLog 查询与聚合
- **健康检查**: 服务状态检测
- 全部接口需 `require_admin` 权限

### app_visibility.py — 应用可见性控制（456 行）

模板/节点/模块的三态可见性管理。

- scope 类型：template、node、nano2_module
- visibility 三态：enabled（启用）、disabled（禁用）、hidden（隐藏）
- 审计日志：VisibilityAuditLog 记录变更
- 全部接口需 `require_admin` 权限

### skills.py — Skills 任务队列（312 行）

基于 Redis 队列的 AI 技能任务系统。

- `POST /chat` — 分析用户意图并推荐模板
- `GET /templates` — 列出可用模板
- `POST /generate` — 入队异步图片生成任务
- `GET /tasks/{task_id}` — 查询任务状态
- `GET /queue/status` — 队列状态
- `POST /tasks/{task_id}/cancel` — 取消任务

使用 `TaskQueueManager` + `WorkerManager` 实现后台任务执行。

### image.py — 图片生成（312 行）

多 Provider、多模型图片生成任务。

- 支持模型：nano-banana2、nano-banana-pro、gpt-image-2 等
- 任务异步执行，通过 TaskPublisher 发布状态更新
- 返回 task_id，前端通过 WebSocket 跟踪进度

### minimax.py — MiniMax 代理（285 行）

MiniMax API 安全代理，与 glm_proxy 结构类似。

- 支持模型：abab6.5s-chat、MiniMax-Text-01
- 内置 JSON 修复
- SSE 流式响应

### key_mapper.py — API Key 映射（188 行）

前端 API Key 与后端 Key 的映射管理。

- FrontendKey 管理：前端使用的公开 Key
- BackendKeyMapping：映射到后端实际 Key
- 支持热加载：无需重启即可更新映射
- 全部接口需 `require_admin` 权限

### generation_log.py — 生成日志（124 行）

AI 生成任务的日志记录与查询。

- 记录字段：node_id、workflow_id、prompt、status、error_message
- 性能追踪：total_time_ms、step_durations
- 状态枚举：GenerationStatus
- 支持统计聚合

---

## 依赖服务

V2 API 依赖以下后端服务：

| 服务 | 路径 | 用途 |
|------|------|------|
| TaskQueueManager | `app/services/task_queue.py` | Redis 任务队列 |
| WorkerManager | `app/services/skills_worker.py` | Skills 后台 Worker |
| workflow_executor | `app/services/workflow_executor.py` | TVC 任务执行 |
| TaskPublisher | `app/services/pubsub.py` | Redis Pub/Sub 消息发布 |
| ProviderFactory | `app/providers/` | 图片生成 Provider 工厂 |
| PromptBuilder | `app/services/skills/gpt_image_2.py` | 提示词构建 |

---

## 变更记录 (Changelog)

### 2026-05-14
- 初始化 V2 API 文档
- 识别 9 个路由文件，总 4374 行
- 完成 8 个模块详解
- 记录依赖服务关系
