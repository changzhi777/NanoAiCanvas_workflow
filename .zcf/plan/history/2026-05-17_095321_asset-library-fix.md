# 资产库不显示内容修复计划

## 问题诊断

### 断裂点 1：API 路径不一致
- `client.ts`（资产库加载用）: `${VITE_API_BASE_URL}/assets`
- `image-assets.ts`（保存用）: 硬编码 `/api/assets`
- 后端 V1 路由全部注册在 `prefix="/api"` 下
- `.env` 中 `VITE_API_BASE_URL=http://64.118.135.134:8002` → 请求打到 `/assets` 而非 `/api/assets`

### 断裂点 2：大部分生成节点不保存到资产库
- 仅 `ImagePreviewNode` 有自动保存逻辑
- `nano_banana_2`、`gpt_image_2`、即梦、TVC、Skills 等生成节点无保存逻辑
- 18 个组件驱动节点通过 `updateNode(id, { status: SUCCESS, result })` 设置结果

### 修复策略
1. 修复 `.env` 和 `.env.local` 的 API base path
2. 在 `updateNode` 中拦截 SUCCESS 状态转换，统一触发自动保存
3. `image_preview` 节点保留其自身精细保存逻辑，不做重复保存

## 执行步骤

### Step 1: 修复 API base path
- `.env`: `VITE_API_BASE_URL=http://64.118.135.134:8002/api`
- `.env.local`: `VITE_API_BASE_URL=/api`

### Step 2: 创建自动保存工具函数
- 新建 `src/lib/api/asset-auto-save.ts`
- 定义节点类型 → 资产类型映射表
- 导出 `autoSaveNodeResult(nodeType, result)` 函数
- 使用 `client.ts` 的 `assets.create` 保存

### Step 3: 在 nanoaiWorkflowStore 的 updateNode 中挂载自动保存
- 检测 status→SUCCESS 转换
- 调用 `autoSaveNodeResult`（fire-and-forget）
- 排除 `image_preview`（已有精细保存逻辑）
- 结果标记 `savedToAsset` 避免重复保存

### Step 4: 验证 ImagePreviewNode 不受影响
- `image_preview` 在排除列表中
- 其自身保存逻辑保持不变
