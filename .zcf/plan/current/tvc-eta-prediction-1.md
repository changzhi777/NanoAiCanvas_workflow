# 任务：预测时间（ETA）+ 计费口径统一（迭代 1）

> 规划类型：讨论迭代 | 父文档：tvc-eta-prediction.md | 创建：2026-09-15 | 状态：待评审

## 本次迭代新增需求

用户补充：「同时更新计费计算功能」——调研发现**三处计费口径不一致**（真 bug），一并纳入本任务。

## 计费不一致问题（P0 必须修）

| 位置 | image 计费公式 | 问题 |
|------|---------------|------|
| `/api/points/tvc-estimate`（后端预估）| `image_price × shot_count × 2` | ❌ 旧模型（每 shot 起始+结束帧），实际已重构为固定 2 张 |
| `tvc_engine.deduct_points`（后端实扣）| `image_price × 2` | ✅ 与生图环节一致 |
| `calcTvcParams.costBreakdown`（前端展示）| 硬编码 `5 × shotCount×2` | ❌ 过时公式 + 脱离 DB 价格（BillingRule）|

**实锤后果**（shot_count=3）：
- estimate 算 6 张图的钱，实际只生成/扣 2 张 → 预检余额虚高 4 张图价
- 用户看到的前端成本与后端实际扣费对不上

## 统一方案

### 单一真相源：后端计费公式

把扣费/预估/前端展示统一到同一公式（以 `deduct_points` 为准）：

```
total = text_price × 3            # 脚本 + 优化 + 拆分（三次 LLM 调用）
      + image_price × 2           # 主参考图 + 场景设计图（固定 2 张）
      + video_price × shot_count  # 每分镜一段视频（一镜到底时 = 1）
      + bgm_price                 # BGM × 1
```

### 改动点

1. **后端** `points.py /tvc-estimate`：`image_total = image_price * 2`（去掉 `× shot_count`）
2. **后端** 抽公共函数 `calc_tvc_cost(db, shot_count, include_bgm) -> dict`（estimate 与 deduct 共用，DRY）
3. **前端** `calcTvcParams`：costBreakdown 改为调用后端 estimate（或标注"估算"，与 `/tvc-estimate` 结果对齐）
4. **前端** 提交前的积分预检：已有 `tvcApi.estimatePoints` 调用（useTvcExecution），确认展示值来自后端

### 一镜到底计费

`shot_count=1` 自然兼容（video ×1 + image ×2 + text×3）——无需特殊分支，但要**验证**：
一镜到底 15s 单段 vs 3×5s 的积分对比（视频单价 × 段数）。

## 优先级重排（合并 ETA + 计费）

| # | 任务 | 优先级 | 依赖 |
|---|------|--------|------|
| 1 | **后端统一计费公式**（calc_tvc_cost 公共函数 + estimate 修正）| P0 | - |
| 2 | 后端单测：estimate = deduct 一致性（shot_count 1/3/6 参数化）| P0 | 1 |
| 3 | 前端计费对齐（calcTvcParams 接后端 / 标注估算来源）| P1 | 1 |
| 4 | 后端 ETA：node 时间戳 + `_compute_eta` + state 字段 | P1 | - |
| 5 | 前端 ETA 展示（已用 + 预计剩余 + EMA 平滑）| P1 | 4 |
| 6 | e2e：完整任务验证（ETA 准确度 + 计费一致性）| P1 | 1-5 |

## 验收标准（合并）

**计费**：
- ✅ `pytest`：`estimate(shot_count)` == `deduct_points` 公式（参数化 1/3/6）
- ✅ `/tvc-estimate` shot_count=3 时 image_total = 2×单价（不再是 6×）
- ✅ 前端展示成本与后端扣费一致（允许四舍五入）

**ETA**：
- ✅ SSE 推送含 `eta_seconds` / `elapsed_seconds`
- ✅ 前端显示"已用 + 预计剩余"，EMA 平滑
- ✅ 10% 进度后 ETA 误差 < 50%

## 风险

1. 计费修正会**降低预估积分**（image 部分）→ 之前被虚高预检拒的用户可正常提交（正面影响，需在 commit 说明）
2. BillingRule 表价格查询性能——estimate 已有 DB 读取路径，复用即可

## 关联

- 父规划：[tvc-eta-prediction.md](tvc-eta-prediction.md)
- 计费：`backend/app/api/points.py:625`（estimate）· `backend/app/api/v2/tvc_engine.py:63`（deduct）· `points_service.py:27 resolve_price`
- 前端：`src/lib/tvc-cascade.ts:90-96`（costBreakdown）
- 相关：[[tvc-coverage-e2e-2026-09-15]]（zhy 积分 9999，实测扣费数据可参照）
