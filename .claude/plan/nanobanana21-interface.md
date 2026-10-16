# 规划：NanoBanana2.1 接口接入

> 生成：2026-10-16 · 类型：需求规划 · 状态：✅ 已执行（任务 1-5、7 完成；任务 6 运维数据待配置）

## 一、目标定义

在 NanoAI 文生图链路新增 **NanoBanana2.1** 模型（速创新端点 `/api/async/NanoBanana2.1`），复用现有 V2 生图架构（前端 Adapter → 后端 V2 路由 → Provider → 速创），并打通该模型独有的 **aspectRatio 比例参数**（含超宽幅 1:4/1:8/4:1/8:1）。

**新 API 关键差异**（对照现有速创接入）：

| 项 | 现有 NanoBanana2 | 新 NanoBanana2.1 |
|----|------------------|------------------|
| 端点 | `/api/async/image_nanoBanana2` | `/api/async/NanoBanana2.1` |
| Body | form-encoded | **JSON** |
| 尺寸参数名 | `size` | `imageSize`（1K/2K/4K） |
| 比例参数 | ❌ 不支持 | ✅ `aspectRatio`（auto/1:1/16:9/9:16/4:3/3:4/3:2/2:3/5:4/4:5/21:9/1:4/1:8/4:1/8:1） |
| 参考图 | `urls` 逗号分隔 | 同 |
| 提交返回 | `data.id` | 同（轮询 `/api/async/detail` 兼容，无需新轮询逻辑） |

## 二、现状侦察结论（接入点已核实）

```
前端 GenerationPanel (imageModel state:161行, Select:823行)
  → getAdapter() (adapters/index.ts 注册表)
    → NanoBanana2Adapter (API_BASE='/v2/image/nanobanana2', 提交+轮询模板)
      → 后端 /v2/image/nanobanana2/generate (image.py:54 先例=gpt-image-2.5:75)
        → submit_image_task 通用逻辑 (params 已透传 aspect_ratio: image.py:45 ✅)
          → WuyinkejiProvider.generate_image (endpoint_map:39行)
            → 速创 API
轮询: /v2/image/*/task/{id} → get_task_status 通用 (BackendKeyMapping 按 model_type 查, 无需改)
计价: BillingRule 表按 model_type (resolve_price 查不到→0 免单)
模型检测: model_scanner.py WUYINKEJI_KNOWN_MODELS (15-17行)
```

**已核实的断点**：`aspect_ratio` 虽已透传到 provider params，但 `wuyinkeji.py` 未消费（老端点不支持）；2.1 是首个比例端点，需在 provider 层补上。

## 三、功能分解与实施步骤

### 任务 1：后端 Provider（backend/app/providers/wuyinkeji.py）
- `endpoint_map` 增 `"nano-banana2.1": "/api/async/NanoBanana2.1"`
- `generate_image` 新增 JSON 分支（与 gpt-image 分支并列）：
  ```python
  if model_type == "nano-banana2.1":
      body = {"prompt": prompt, "imageSize": size, "aspectRatio": params.get("aspect_ratio", "auto")}
      if urls: body["urls"] = ",".join(...)
      POST + Authorization header
  ```
- 注意：参数名映射 `size→imageSize`、`aspect_ratio→aspectRatio`（驼峰，仅此端点）

### 任务 2：后端路由（backend/app/api/v2/image.py）
- 照抄 gpt-image-2.5 先例，新增两个路由：
  - `POST /v2/image/nanobanana2-1/generate` → `request.model_type = "nano-banana2.1"`
  - `GET /v2/image/nanobanana2-1/task/{task_id}` → 通用 get_task_status

### 任务 3：模型检测（backend/app/services/model_scanner.py）
- `WUYINKEJI_KNOWN_MODELS` 增 `("nano-banana2.1", "/api/async/NanoBanana2.1")`

### 任务 4：前端类型与适配器
- `src/types/image.ts`：`ImageModelId` 增 `'nano-banana2.1'`
- 新建 `src/lib/api/adapters/NanoBanana21Adapter.ts`（复制 NanoBanana2Adapter 结构，`API_BASE='/v2/image/nanobanana2-1'`，modelId/displayName='Nano Banana 2.1'）
- `adapters/index.ts`：注册 + `getAllModelInfo()` 加条目

### 任务 5：前端 UI（src/components/GenerationPanel.tsx）
- `imageModel` state 类型（161 行）加 `'nano-banana2.1'`
- Select 选项（823 行附近）加「Nano Banana 2.1」
- **检查项**：比例下拉的选项集合若为硬编码枚举，补 1:4/1:8/4:1/8:1 四个超宽幅（仅 2.1 端点消费，其他模型 body 不带 aspectRatio，零风险）

### 任务 6：运维数据（非代码，实施时与用户确认）
- **BillingRule 计价**：`billing_rules` 表需 INSERT `model_type='nano-banana2.1'` 的单价（不配则计价 0 免单）；**价格待用户定**
- **Key 映射**：管理后台为前端 key 配 `nano-banana2.1` 的 BackendKeyMapping（或 SQL），否则提交时报 "No provider mapping"

### 任务 7：验证与交付
- 后端：`PYTHONPATH=. pytest backend/tests/unit/ -v`（现有单测不回归）+ 新 provider 端点构造单测（可选）
- 前端：`pnpm type-check` + `pnpm build`
- 端到端：本地起 backend 或直接发 118 后用真实 key 提交一单验证（提交→轮询→出图）

## 四、不做的事（YAGNI）

- 不动 Skills 队列链路（gpt-image 走的 SkillQueueAdapter，2.1 走直连 Adapter，与 Banana2 同构）
- 不改老模型（nano-banana2/pro/gpt-image）的任何行为
- 不加 Workflow 节点（nano_banana_2 节点族不动；后续需要再议）

## 五、验收标准

1. nano2 页面模型选择出现「Nano Banana 2.1」，选中后提交生成任务成功
2. 选择非 auto 比例（如 16:9 / 8:1）生成的图与所选比例一致
3. 参考图（融图模式）传入 urls 正常生效
4. 取消任务（AbortController）正常中断轮询
5. 现有 nano-banana2 / pro / gpt-image-2 三个模型行为零变化
6. 计价按配置的 BillingRule 扣减（配置后）

## 六、风险与依赖

- **速创侧余额**：实测消耗一次生成额度
- **超宽幅比例（8:1 等）**：文档声称支持，若实测报错则在前端限制 2.1 的比例集合（降级为文档保守集）
- **依赖**：无新依赖包；纯参数/路由/注册级改动
