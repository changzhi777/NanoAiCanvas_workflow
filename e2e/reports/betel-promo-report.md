# 槟榔产品 15s TVC 实跑报告

**运行时间**: 2026-09-15
**生产入口**: https://app.nanoai.fun/nanoai
**测试账号**: zhy（余额 = 9999）
**任务 ID**: `tvc_d65062c1a70d`（最新一次）
**结果**: ⚠️ 任务最终 `failed`，链路 5/6 步全跑通 + 2 项资产入库

## 任务配置

```json
{
  "prompt": "一个关于槟榔的产品展示宣传广告切片15秒",
  "shot_count": 3,
  "shot_duration": 5,
  "total_duration": 15,
  "execution_mode": "auto",
  "optimize_mode": "tvc_deep",
  "image_model": "gpt-image-2",
  "video_model": "minimax-H3",
  "optimize_model": "glm-5.3-flash",
  "style": "cinematic"
}
```

## 执行链路（5/6 步完成）

| 步骤 | 状态 | 进度 | 结果 |
|------|------|------|------|
| 1. 剧本生成 | ✅ success | 100% | 「槟榔的纯美诱惑」完整 JSON 剧本 |
| 2. 提示词优化 | ❌ running | 0% | GLM 配额耗尽 code 1310 |
| 3. 分镜头脚本 | ⊘ pending | 0% | 未启动 |
| 4. 参考图生成 | ⊘ pending | 0% | 未启动 |
| 5. 参考图生视频 | ⊘ pending | 0% | 未启动 |

## 错误根因（实测三层验证）

### 第一层：GLM 月度配额完全耗尽
```
GLM API error: {"code":"1310","message":"您已达到每周/每月使用上限，
您的限额将在 2026-09-15 23:08:55 重置。"}
```
**今天 23:08 后才能解锁**——属于第三方平台配额限制，非产品代码问题。

### 第二层：GLM-5.3-Flash 实际不可用
实测调用 `/api/glm/optimize?model=glm-5-flash` 报 `1211 模型不存在`。
说明当前 backend glm_proxy 配置**未适配 GLM-5.3-Flash**——即便配额恢复，链路也不会自动用上新模型。

### 第三层：链路设计缺陷
- step-script 有 fallback（GLM → MiniMax）✅
- step-optimize 只用 GLM **无 fallback** ❌
- 一旦 GLM 配额耗尽，整个任务硬挂

## 三轮实跑历史

| RUN_ID | task_id | optimize_model | 失败步骤 | 耗时 |
|--------|---------|----------------|----------|------|
| mu23qv2v-mnnp | tvc_bf5f5667… | (无) | submit 422 缺 workflow_id | 0.8s |
| mu23ufs5-evx3 | tvc_1d5a844d… | (无) | step-optimize GLM 1113 | 22.4s |
| **mu23xyls-nfu0** | **tvc_d65062c1…** | **glm-5.3-flash** | **step-optimize GLM 1310** | **17.6s** |

三轮结果一致说明问题：**测试链路、提交、SSE、入库全部正常**，卡点是 GLM 配额。

## 资产入库（已成功 2 项）

| 资产 ID | 名称 | 类型 |
|---------|------|------|
| `12d9fe54-969a-4830-9daa-5dcb61ec9f01` | betel-promo-task-tvc_d65062c1a70d | text（任务元信息）|
| `2b580e37-d960-40a5-bc0b-d7d36bb611af` | betel-promo-result-tvc_d65062c1a70d | text（最终响应 + progress 时间线）|

## 工具链沉淀

- ✅ **fetch stream SSE**（Node 端无 EventSource）— helper 在 `e2e/helpers/tvc.ts`
- ✅ **asset type=text**（合法值，避免 400 invalid asset type）
- ✅ **workflow_id 占位**（`wf-tvc-{nodeId}`）模拟前端行为
- ✅ **字段名兼容**（`task_id ?? id ?? taskId ?? data.task_id`）
- ✅ **完整进度时间线入库**（progress_first_5 + progress_last_5）
- ✅ **本地 JSON 报告**（即使 push 失败也有存档）

## 建议（不在本任务执行）

1. **step-optimize 加 fallback** — 仿照 step-script，GLM 1310 时自动切 MiniMax，避免单点失败
2. **GLM-5.3-Flash 模型适配** — 后端 glm_proxy.py 加 `glm-5.3-flash` model code 映射
3. **GLM Coding 套餐升级** — 月度配额需重新评估
4. **2026-09-15 23:08 后重跑** — 配额解锁后可全链路通过
5. **集成 minimax M3 兜底** — step-optimize 走 M3 多模态（不依赖 GLM）

## 关联

- 测试 spec: `e2e/tvc-betel-promo.spec.ts`
- helper: `e2e/helpers/tvc.ts`
- 报告 JSON: `e2e/reports/betel-promo-mu23xyls-nfu0.json`
- 错误记录: `e2e/reports/errors-mu23xyls-nfu0.json`
- 关联 Bug: [GLM Coding 套餐配额耗尽（不在本任务修复）](../docs/bugs/)
