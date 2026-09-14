# 全面测试计划 — Batch 1：核心逻辑覆盖

## 目标
P0 模块测试覆盖率达到 60%+，所有测试可在本地离线运行（无外部 DB/API 依赖）。

## 前置修复
- [ ] F0: 后端 conftest.py 外部 DB → SQLite 内存（离线可跑）

## Step 1：前端测试基础设施
- [ ] S1.1: 升级 `src/test/setup.ts` — mock fetch/Response/EventSource/IntersectionObserver/ResizeObserver
- [ ] S1.2: 新建 `src/test/test-utils.tsx` — renderWithProviders（Zustand + i18n wrapper）
- [ ] S1.3: 新建 `src/test/mock-fetch.ts` — 统一 fetch mock 工厂（支持延迟、错误模拟）

## Step 2：Zustand Stores 测试（24 个 Store → 8 个优先）
按复杂度和业务重要性排序：

### P0 纯逻辑 Store（无外部 API 调用）
- [ ] S2.1: `toastStore.test.ts` — addToast/removeToast（最简单，建立模式）
- [ ] S2.2: `appVisibilityStore.test.ts` — 三态切换、批量更新
- [ ] S2.3: `pluginStore.test.ts` — 注册/启用/禁用
- [ ] S2.4: `notificationStore.test.ts` — 通知 CRUD、未读计数

### P1 含 API 调用 Store（需 mock fetch）
- [ ] S2.5: `nanoaiWorkflowStore.test.ts` — 节点 CRUD、拓扑排序、模板加载
- [ ] S2.6: `tvcStore.test.ts` — phase 状态机、级联参数
- [ ] S2.7: `chatStore.test.ts` — 会话管理、消息收发
- [ ] S2.8: `nanoImageTaskQueueStore.test.ts` — 单任务/批量任务状态机

## Step 3：后端 Services 单元测试（12 个 Service → 5 个优先）
- [ ] S3.1: `test_points_service.py` — 积分计价引擎、余额校验
- [ ] S3.2: `test_api_key_service.py` — 热加载、缓存 60s、刷新
- [ ] S3.3: `test_workflow_executor.py` — 任务状态机、Redis 进度
- [ ] S3.4: `test_model_scanner.py` — Provider 类型检测
- [ ] S3.5: `test_video_thumbnail.py` — FFmpeg 关键帧提取

## Step 4：API 客户端 Mock 测试（43 文件 → 5 个关键）
- [ ] S4.1: `tvc-api.test.ts`（已有，检查/补充）
- [ ] S4.2: `client.test.ts` — 基础 HTTP 客户端、拦截器、错误处理
- [ ] S4.3: `points-api.test.ts` — 积分查询/扣减
- [ ] S4.4: `glm-api.test.ts` — GLM 代理调用
- [ ] S4.5: `agent-api.test.ts` — Agent 系统 API

## Step 5：验证 & 覆盖率报告
- [ ] S5.1: 前端 `pnpm test:coverage` — 确认 P0 Store 覆盖 60%+
- [ ] S5.2: 后端 `pytest tests/ -v --cov` — 确认 Service 覆盖 60%+
- [ ] S5.3: 输出覆盖率报告

## 预计用例数
| 模块 | 用例数 | 文件数 |
|------|--------|--------|
| 前端 Stores | ~60 | 8 |
| 后端 Services | ~35 | 5 |
| API 客户端 | ~25 | 5 |
| **合计** | **~120** | **18** |

## 原则
- 所有测试离线可跑（mock 外部依赖）
- 后端用 SQLite 内存替代 PostgreSQL（单元级）
- 不测 UI 渲染（Batch 2 的事）
- 不测 E2E（Batch 3 的事）
