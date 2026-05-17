# API Key 池模型检测功能

> 任务：增加后台 API KEY 池检测对应可使用模型的功能，点击扫描出所有可用模型并形成标记

## 方案：统一扫描端点 + Provider 分发

在 `api_keys` 表增加 `detected_models` JSONB 字段，后端按 provider 分发不同扫描逻辑。

---

## 执行步骤

### Step 1: DB Migration — 新增 detected_models 字段
- 文件：`backend/alembic/versions/014_api_key_detected_models.py`
- 原子操作：`api_keys` 表新增 `detected_models` JSONB 列，默认 `[]`

### Step 2: 后端扫描服务 — Provider 分发逻辑
- 文件：`backend/app/services/model_scanner.py`（新建）
- 逻辑：
  - `scan_models_for_key(key: APIKey, provider: Provider) -> list[str]`
  - 按 provider.code 分发：
    - **OpenAI 兼容**（通用）：`GET {api_base_url}/models` → 解析 `data[].id`
    - **wuyinkeji**：速创 API 无标准 models 端点 → 用已知模型列表做 probe 测试
    - **其他**：回退到 `{api_base_url}/models` 通用逻辑
  - 返回 `["model-name-1", "model-name-2", ...]`

### Step 3: 后端 API 端点
- 文件：`backend/app/api/v2/admin.py`（修改）
- 新增端点：
  - `POST /api/v2/admin/api-keys/{key_id}/scan-models` — 单 Key 扫描
  - `POST /api/v2/admin/api-keys/scan-all-models` — 批量扫描所有 active Key
- 更新 `_apikey_to_out()` 输出 `detected_models` 字段
- 更新 `APIKeyOut` Pydantic schema

### Step 4: 前端 API 客户端
- 文件：`src/lib/api/admin-api.ts`（修改）
- 新增 `scanKeyModels(keyId)` 和 `scanAllKeyModels()` 函数
- 更新 `APIKey` interface 增加 `detected_models?: string[]`

### Step 5: 前端 Admin UI
- 文件：`src/app/admin/api-key-pool/page.tsx`（修改）
- 新增：
  - Key 列表行增加"模型标签"列（Badge 列表）
  - 单行增加"扫描模型"按钮（Radar 图标）
  - 顶部增加"扫描全部"按钮
  - 扫描中 loading 状态

---

## Provider 扫描策略

| Provider | 扫描方式 | 预期返回 |
|----------|----------|----------|
| GLM/智谱 | `GET {base}/models` | glm-4-flash, glm-4.5-air 等 |
| MiniMax | `GET {base}/models` | MiniMax-Text-01 等 |
| Wuyinkeji/速创 | probe 已知模型列表 | gpt-image-2, nano-banana2 等 |
| Caohua/ARK | `GET {base}/models` | doubao-seedance 等 |
| 通用回退 | `GET {base}/models` | 按响应解析 |
