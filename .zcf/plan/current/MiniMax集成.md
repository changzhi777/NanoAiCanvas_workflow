# MiniMax Token Plan 集成计划

**任务**：增加 MiniMax Token Plan 模型套餐，新建渠道商，Workflow 节点调用
**时间**：2026-04-28
**状态**：执行中

---

## 计划概要

1. 创建 MiniMax API 服务模块（`src/lib/api/minimax-api.ts`）
2. 创建 MiniMax 渠道商配置（`src/config/minimax.ts`）
3. 扩展 Workflow 节点类型（`src/stores/nanoaiWorkflowStore.ts`）
4. 创建 Workflow 节点组件（`src/components/nanoai-workflow/nodes/MiniMax*.tsx`）
5. 注册节点到 React Flow（`src/components/nanoai-workflow/nodes/index.ts`）
6. 更新 .env.example

---

## API 端点参考

根据 MiniMax CLI 文档，各模型通过不同端点调用：

| 能力 | 模型 | 端点 |
|------|------|------|
| 文本 | m2.7 | `https://api.minimaxi.com/v1/text/chatcompletion_v2` |
| 语音 | Speech 2.8 | `https://api.minimaxi.com/v1/speech/synthesis` |
| 视频 | Hailuo 2.3 | 异步生成 + 查询 |
| 音乐 | Music 2.6 | `https://api.minimaxi.com/v1/music/generate` |
| 图片 | Image 01 | `https://api.minimaxi.com/v1/image generation` |
| 搜索 | coding-plan-search | 内置网络检索 |

**API Key**：存储在 `.env`，变量名 `VITE_MINIMAX_API_KEY`

---

## 执行记录

- 2026-04-28：计划创建，开始执行
