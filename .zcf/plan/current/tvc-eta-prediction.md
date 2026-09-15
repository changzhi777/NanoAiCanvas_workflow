# 任务：预测生成时间 + 动态剩余时间（ETA）

> 规划类型：需求规划 | 创建：2026-09-15 | 状态：待评审

## 目标定义

TVC 任务耗时长（3-8 分钟），当前用户只能看到"进度百分比"，不知道还要等多久。本任务：
1. **预测生成时间**：提交前/任务开始时给出预计总耗时
2. **动态剩余时间（ETA）**：任务运行中实时修正"预计剩余 X 分 Y 秒"

## 现状盘点

| 层 | 现状 | 位置 |
|----|------|------|
| 前端估算 | 静态公式粗估 `estimatedTimeMin/Max`（提交前展示）| `tvc-cascade.ts:76-90`（脚本15s+优化10s+分镜5s+图8s/批+视频50s/个）|
| 后端状态 | task state 有 `created_at/updated_at/completed_at`，**node 级无时间戳** | `workflow_executor.py:53,147` |
| SSE 推送 | `TvcExecutionState`（task_id/status/overall_progress/nodes）**无 ETA 字段** | `TvcExecutionPanel.tsx:38-43` |
| `elapsed_ms` | 类型已定义但**后端未填** | `TvcExecutionPanel.tsx:36` |

## 技术方案

### 核心：分步权重 + 线性外推 ETA

```
任务总权重（按耗时占比经验值）：
  step-script     15%   （LLM 生成，15-40s）
  step-optimize   12%   （LLM 优化，10-30s）
  step-breakdown   3%   （纯逻辑，<1s）
  step-images     30%   （2 张并行，GPT-Image 20-60s）
  step-video      33%   （3 段 H3 并行，90-180s）← 最大头
  step-bgm         7%   （可选）
```

**ETA 公式**（每次 node/subtask 状态变更时重算）：
```
完成权重 W_done = Σ(已完成步骤权重)
已耗时间 T_elapsed = now - started_at
ETA = T_elapsed × (1 - W_done) / W_done        # 线性外推
```
- `W_done < 5%` 时（刚开始）用静态预估兜底（`estimatedTimeMin`）
- **EMA 平滑**：`ETA_shown = 0.7 × ETA_prev + 0.3 × ETA_new`（避免数字跳动）

### 后端改动

1. `workflow_executor.py`：
   - `create_task`：加 `started_at: time.time()`
   - `update_node`/`update_subtask`：加 node 级 `started_at`（首次 running 时）
   - 新增 `_compute_eta(state) -> dict`：返回 `{eta_seconds, elapsed_seconds, eta_confidence}`
   - `_save`/`_publish` 前自动附加 eta 字段（state 顶层）
2. SSE `event_generator` 与 `GET /{task_id}`：透传新增字段（自动，因序列化整个 state）

### 前端改动

1. `TvcExecutionPanel.tsx`：
   - 顶部信息栏加："已用 01:23 · 预计剩余 ~02:10"
   - ETA 格式化（>60s 显示分秒，<60s 显示秒）
   - 动态刷新（SSE 推送驱动，无需额外轮询）
2. `TvcScriptNode` 提交前：显示预估总时长（增强 `calcTvcParams` 输出，复用现有展示位）

### 校准增强（P2，可选）

从历史完成任务统计各步真实时长（Redis task 的 node `started_at` → `finished_at` 差），
滚动更新权重表 → 新任务用实测权重。初期先用经验值。

## 实施步骤

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| 1 | 后端：node 级时间戳 + `_compute_eta` | workflow_executor.py + 单测 | - |
| 2 | 后端：state 附加 eta 字段（save/publish 路径）| 同上 | 1 |
| 3 | 前端：TvcExecutionPanel ETA 展示 + EMA 平滑 | TvcExecutionPanel.tsx | 2 |
| 4 | 前端：提交前预估增强（tvc-cascade 输出接入面板）| TvcScriptNode/面板 | - |
| 5 | 验证：跑完整任务对比 ETA 准确度 | e2e + 实测记录 | 1-4 |

## 验收标准

- ✅ SSE 每次推送 state 含 `eta_seconds` / `elapsed_seconds`（数值合理）
- ✅ 前端实时显示"已用 + 预计剩余"，数字平滑递减（EMA 生效）
- ✅ 任务开始 10% 后 ETA 误差 < 50%（对比实际总时长）
- ✅ `pytest tests/unit/test_workflow_executor.py` 覆盖 `_compute_eta`（mock 时间轴）
- ✅ 现有 SSE 消费不破坏（字段新增，向后兼容）

## 风险

1. **H3 视频耗时方差大**（60-180s）→ ETA 抖动；EMA + "约"文案弱化预期
2. **并行步骤权重**（images/videos 并行）：权重按"阶段完成比例"而非线性时间，用 subtask 平均完成度细化
3. **重试场景**（视频敏感重试）：单步耗时会突增 → ETA 上调属正常，UI 不闪烁即可

## 关联

- 现有估算：`src/lib/tvc-cascade.ts`
- SSE 消费：`src/components/nanoai-workflow/ui/TvcExecutionPanel.tsx`
- 后端状态机：`backend/app/services/workflow_executor.py`
- 相关：[[tvc-coverage-e2e-2026-09-15]]（任务实测耗时数据：3×5s ≈ 7-8min，15s 单段 ≈ 53s）
