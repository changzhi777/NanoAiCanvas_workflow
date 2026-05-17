[根目录](../../../../CLAUDE.md) > [backend](../../) > [app](../) > [api](./) > **v2**

---

# V2 API 模块 - 业务逻辑 API

> V2 版本 API，包含 AI 代理、图片生成、工作流任务、管理后台等业务逻辑路由

**最后更新**: 2026-05-17
**维护者**: NanoAiCanvas Backend Team

---

## 模块职责

V2 API 模块负责：
- AI 服务代理（GLM、MiniMax）— API Key 安全存储在后端
- 图片生成任务（多 Provider、多模型路由）
- 工作流任务执行引擎（TVC 任务）
- TVC 执行引擎（积分扣退 + 批量并行编排）
- TVC Provider 工厂（3 个图片 Provider + 3 个视频 Provider）
- TVC 视频结果轮询（GLM/Seedance/MiniMax Hailuo）
- TVC 工作流配置管理（全局配置 + 用户配置 + 配置解析）
- TVC 项目管理（CRUD + 镜头管理 + 任务结果关联）
- V2 资产库（浏览/搜索/批量操作）
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
├── tvc_engine.py         # TVC 执行引擎：5步编排+积分扣退+批量并行
├── tvc_providers.py      # TVC Provider 工厂：3图片+3视频Provider
├── tvc_polling.py        # TVC 视频轮询：GLM/Seedance/MiniMax
├── tvc_config.py         # TVC 工作流配置：全局/用户配置管理
├── tvc_projects.py       # TVC 项目管理：CRUD + 镜头管理 ★ 新增
├── library.py            # V2 资产库：浏览/搜索/批量操作 ★ 新增
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
| `/api/v2/tvc-engine/*` | `tvc_engine.py` | TVC 执行引擎：5步编排+积分管理 | 可选 | ★ 新增
| `/api/v2/tvc-providers/*` | `tvc_providers.py` | TVC Provider 工厂 | 可选 | ★ 新增
| `/api/v2/tvc-polling/*` | `tvc_polling.py` | TVC 视频结果轮询 | 可选 |
| `/api/v2/tvc-config/*` | `tvc_config.py` | TVC 工作流配置管理 | 可选 | ★ 新增
| `/api/v2/glm/*` | `glm_proxy.py` | GLM API 代理（SSE 流式） | 可选 |
| `/api/v2/admin/*` | `admin.py` | 渠道商/模型/密钥/用量/健康检查 | 管理员 |
| `/api/v2/admin/app-visibility/*` | `app_visibility.py` | 应用可见性三态管理 | 管理员 |
| `/api/v2/admin/key-mapper/*` | `key_mapper.py` | 前端Key↔后端Key映射管理 | 管理员 |
| `/v2/skills/*` | `skills.py` | Skills 聊天/模板/生成/队列 | 可选 |
| `/v2/image/*` | `image.py` | 图片生成任务（多Provider） | 可选 |
| `/api/v2/minimax/*` | `minimax.py` | MiniMax 文本/剧本代理 | 可选 |
| `/api/v2/generation-logs/*` | `generation_log.py` | 生成日志记录与查询 | 可选 |
| `/api/v2/tvc-projects/*` | `tvc_projects.py` | TVC 项目 CRUD + 镜头管理 | 可选 | ★ 新增
| `/api/v2/library/*` | `library.py` | V2 资产库浏览/搜索/批量操作 | 可选 | ★ 新增

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

### tvc_engine.py — TVC 执行引擎 ★ 新增

5 步线性编排 + 积分扣退 + 真正批量并行。

- **积分管理**: `deduct_points()` 预扣积分，`refund_points()` 退还积分
- **5 步编排**: 脚本生成 → 产品分析 → 分镜图片 → 视频合成 → BGM
- **批量并行**: 图片/视频生成使用 `asyncio.gather` 并行执行
- **模型配置**: 脚本使用 MiniMax M2.7，视频默认 MiniMax Hailuo
- **依赖**: 调用 `tvc_providers` 获取 Provider，`tvc_polling` 轮询结果

### tvc_providers.py — TVC Provider 工厂 ★ 新增

统一管理 3 个图片 Provider + 3 个视频 Provider。

- **图片 Provider**: 即梦(Jimeng)、GPT-Image-2(速创)、GLM
- **视频 Provider**: Seedance、MiniMax Hailuo、GLM CogVideoX-3
- **工厂模式**: `get_image_provider(model)` / `get_video_provider(model)` 返回生成函数
- **降级**: API Key 为空时返回 placeholder，不中断流程

### tvc_polling.py — TVC 视频结果轮询

3 个视频 Provider 的异步结果轮询逻辑。

- `poll_glm_video()` — GLM CogVideoX-3 轮询（async-result 端点）
- `poll_seedance()` — Seedance 轮询
- `poll_minimax_hailuo()` — MiniMax Hailuo 轮询
- **通用参数**: max_wait=300s, interval=15s
- **状态映射**: SUCCESS→返回URL, FAIL/FAILED→抛异常, 超时→抛异常

### tvc_config.py — TVC 工作流配置管理 ★ 新增

TVC 工作流配置的 CRUD 和配置解析。

- `GET /api/v2/tvc-config/global` — 获取全局配置（管理员）
- `PUT /api/v2/tvc-config/global` — 更新全局配置（管理员）
- `GET /api/v2/tvc-config/user` — 获取用户配置
- `PUT /api/v2/tvc-config/user` — 用户保存配置
- `POST /api/v2/tvc-config/resolve` — 解析最终配置（用户 > 全局 > 硬编码默认）
- **数据模型**: `TvcWorkflowConfig`，scope 区分 global/user
- **配置优先级**: 用户覆盖 > 全局配置 > 硬编码默认值

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

### tvc_projects.py — TVC 项目管理 ★ 新增

TVC 项目级组织，关联文案→剧本→镜头→成片。

- `POST /api/v2/tvc-projects` — 创建项目
- `GET /api/v2/tvc-projects` — 项目列表（分页）
- `GET /api/v2/tvc-projects/{id}` — 项目详情（含镜头）
- `PUT /api/v2/tvc-projects/{id}` — 更新项目
- `DELETE /api/v2/tvc-projects/{id}` — 删除项目
- `PUT /api/v2/tvc-projects/{id}/shots` — 批量更新镜头
- `POST /api/v2/tvc-projects/{id}/shots` — 添加单个镜头
- `DELETE /api/v2/tvc-projects/{id}/shots/{shot_id}` — 删除镜头
- **数据模型**: TvcProject + TvcProjectShot，状态枚举 TvcProjectStatus/TvcShotStatus

### library.py — V2 资产库 ★ 新增

V2 版资产浏览/搜索/批量操作 API。

- 资产浏览与搜索
- 批量操作接口
- 与 V1 assets.py 互补，提供更丰富的查询能力

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

### 2026-05-17
- 新增 tvc_projects.py：TVC 项目管理 CRUD + 镜头管理
- 新增 library.py：V2 资产库浏览/搜索/批量操作
- 目录结构从 14 个文件扩展到 16 个文件
- 新增 tvc_config.py：TVC 工作流配置管理（全局/用户配置+解析）
- MiniMax 视频模型切换为 Hailuo-2.3-Fast（高速版 768P）
- MiniMax API 路径重复 `/api` 前缀 404 修复
- 目录结构从 12 个文件扩展到 14 个文件

### 2026-05-15
- 新增 tvc_engine.py：TVC 执行引擎，5步编排+积分扣退+批量并行
- 新增 tvc_providers.py：TVC Provider 工厂，3图片+3视频 Provider
- 新增 tvc_polling.py：TVC 视频结果轮询，GLM/Seedance/MiniMax Hailuo
- TVC 脚本生成切换为 MiniMax M2.7 模型
- TVC 视频默认模型改为 MiniMax Hailuo
- 目录结构从 9 个文件扩展到 12 个文件

### 2026-05-14
- 初始化 V2 API 文档
- 识别 9 个路由文件，总 4374 行
- 完成 8 个模块详解
- 记录依赖服务关系
