# 任务：TVC 新工作流 100% E2E 覆盖（zhy/zhy@2026）

## 目标
- 用 `zhy / zhy@2026` 登录，对 TVC 新工作流（`tvc-video-01` 模板 + 4 节点）做 100% 端到端覆盖
- **只记录错误码和提示，不修代码**（用户明确要求"别修边改只验证"）
- 测试结果**全部保存到资产库**（验收可追溯）

## 范围
- ✅ 覆盖：模板加载、节点拖拽、参数配置、剧本生成、提示词优化、拆解、生图、生视频、BGM、合成、进度推送（SSE）、积分扣减/退款、任务取消、TVC 项目 CRUD、配置解析
- ✅ 用户：`zhy`（已授权 TVC 权限，approved）
- ✅ 入口：`https://app.nanoai.fun/nanoai/` 或 `https://91zm.com.cn/nanoai/`（生产）
- ❌ 不动：业务代码（测试发现 bug 也只记录）

## 关键接触点（调研结果摘要）
| 层级 | 关键文件 | 关键端点 |
|------|----------|----------|
| 模板 | `src/.../templates/tvcVideo01.ts` | `id=tvc-video-01` (4 节点) |
| 节点 | `TvcScriptNode / StoryboardGenerator / StoryboardVideo / BackgroundMusic` + `useTvcExecution.ts` | UI 触发 |
| API v2 | `tvc_engine / tvc_projects / tvc_config / glm_proxy / minimax / tvc_providers / tvc_polling` | `/api/v2/tvc-tasks/*`, `/api/v2/tvc-projects/*`, `/api/v2/tvc-config/*`, `/api/glm/*` |
| SSE | `tvc_engine.py:197 event_generator` | `GET /api/v2/tvc-tasks/{id}/progress` |
| Provider | MiniMax M3/H3 / GPT-Image-2 / Jimeng / Seedance / GLM | 见 `seedance_constants.py` + `app/config.py:36-52` |
| 积分 | `points_service.py:42` + `tvc_engine.py:63-87` + `/api/points/tvc-estimate` | 扣减/退款链路 |
| 验收 | 测试用例通过率、错误码覆盖率、产物资产 ID 列表 | 输出 `e2e/reports/tvc-coverage-{date}.md` + assets |

## 计划

| # | 任务 | 输出 | 依赖 |
|---|------|------|------|
| 1 | 制定覆盖矩阵（节点 × 步骤 × API × 边界） | `.zcf/plan/current/tvc-coverage-matrix.md` | 调研结果 |
| 2 | 扩 `e2e/tvc-workflow.spec.ts`：模板加载 + 4 节点拖拽 + 参数配置 | 1 个 spec，约 8-10 用例 | 1 |
| 3 | 扩 `e2e/tvc-engine.spec.ts`（新）：`/submit` + `/progress` SSE + `/cancel` + `/compose` | 1 个 spec，约 6 用例 | 1 |
| 4 | 扩 `e2e/tvc-projects.spec.ts`（新）：`/tvc-projects` CRUD + `/shots` + `/link-task` | 1 个 spec，约 8 用例 | 1 |
| 5 | 扩 `e2e/tvc-config.spec.ts`（新）：`/tvc-config/global`（admin）+ `/user` + `/resolve` + `/cache-stats` + `/cache-cleanup` | 1 个 spec，约 6 用例 | 1 |
| 6 | 边界用例：积分不足（zhy 余额 0）、无效参数、SSE 断开、Provider 失败重试 | 各 spec 内补充 | 2-5 |
| 7 | 错误捕获：`globalErrorHandler` + console listener + API response 拦截，所有 fail 的（status, code, message, screenshot）写到 `e2e/reports/errors-{runId}.json` | 自动机制 | - |
| 8 | 资产保存：所有生成产物（图片/视频/项目/工作流）通过 `POST /api/assets` 关联，存到 zhy 名下 | 1 个 helper `saveAssetToLibrary()` | - |
| 9 | 跑全量：`pnpm test:e2e e2e/tvc-*.spec.ts --project=chromium,firefox,webkit` | HTML report + JSON | 2-8 |
| 10 | 出覆盖率报告：`e2e/reports/tvc-coverage-{date}.md`（节点/API 用例映射表 + 失败统计 + 资产 ID 清单） | 1 份报告 | 9 |

## 验收

- ✅ TVC 工作流节点 100% 触达（4 节点 + useTvcExecution）
- ✅ TVC 后端 API 100% 触达（tvc-tasks / tvc-projects / tvc-config / glm-proxy 部分端点 / minimax）
- ✅ Provider 链路至少覆盖 1 个成功路径（minimax M3 + GPT-Image-2 + Seedance）
- ✅ 错误码记录 ≥ 80% 已知错误码（401/403/404/422/429/500/502/504）
- ✅ 测试产物全部入库（每跑一次生成一份 assets 列表）
- ✅ 失败用例不修代码，只记录 + 截图 + 入资产库
- ✅ 报告输出到 `e2e/reports/` 含覆盖率矩阵

## 不做

- ❌ 不修任何业务代码
- ❌ 不改已有 spec（只新增）
- ❌ 不删 zhy 账户数据（zhy 是你指定的唯一测试账号）
- ❌ 不绕过 admin（zhy 是 user 角色，全局配置操作跳过 admin-only）

## 风险与边界

1. **Provider 速率限制**：MiniMax M3 / GLM Coding plan 都有限流。覆盖矩阵中每 Provider 只跑 1 次成功路径，避免触发封号。
2. **测试时长**：单 spec 跑 60-90s，全量 4 spec × 3 browser ≈ 15-20 min。后台执行，result 不阻塞。
3. **资产库膨胀**：每次跑会生成若干 image/video 资产 + 1 个 tvc_project。需写 `cleanup-e2e-tvc.sh` 一键清（参考 `scripts/db/cleanup-test-users.sql` 风格）。
4. **生产环境敏感**：所有操作都在生产 `app.nanoai.fun` 上跑，**严禁执行 cancel 之外的破坏性操作**（delete 只清自己建的）。
