# API 客户端层

> [根目录](../../../CLAUDE.md) > [src](../../) > [lib](../) > **api**

**最后更新**: 2026-05-15
**文件数**: 40+ 模块

前端统一 API 客户端层，封装所有后端和第三方 AI 服务调用。

---

## 核心

| 文件 | 行数 | 职责 |
|------|------|------|
| `client.ts` | 616 | HTTP 基础客户端，统一 token/APIKey 处理、错误分级、自动重试、全局错误回调 |
| `model-routing.ts` | 65 | 模型路由服务，动态拉取 `category→model` 映射，5min TTL 缓存，降级本地配置 |

### client.ts 关键导出

- `client.get/post/put/delete/upload` — 统一请求方法
- `setApiKey/getApiKey/removeApiKey` — API Key 管理（localStorage）
- `setGlobalErrorHandler` — 全局错误处理（401 跳转登录等）
- `ApiErrorDetail` — 错误详情（status/message/severity/retryable）

---

## 适配器（adapters/）

| 文件 | 职责 |
|------|------|
| `ImageAdapter.ts` | 图片生成适配器基类，定义统一接口 |
| `NanoBanana2Adapter.ts` | NanoBanana2 图片生成适配器 |
| `NanoBananaProAdapter.ts` | NanoBananaPro 图片生成适配器 |
| `SkillQueueAdapter.ts` | Skills 后台队列适配器，异步任务提交+轮询 |
| `index.ts` | 适配器工厂，统一导出 |

---

## AI 服务 API

| 文件 | 提供商 | 职责 |
|------|--------|------|
| `nanobanana2.ts` | NanoBanana | 文生图 V2 |
| `nanobanana-pro.ts` | NanoBanana | 文生图 Pro |
| `banana-brother.ts` | NanoBanana | Banana Brother |
| `gpt-image-api.ts` | OpenAI | GPT-Image-2 图片生成 |
| `minimax-api.ts` | MiniMax | 文本/语音/视频/音乐/图片/编码 |
| `jimeng-api.ts` | 字节即梦 | 图片/视频生成 |
| `glm-api.ts` | 智谱 GLM | 文本生成 |
| `glm-tts.ts` | 智谱 GLM | TTS 语音合成 |
| `glm-tts-clone.ts` | 智谱 GLM | TTS 声音克隆 |
| `qwen-api.ts` | 通义千问 | 文本/编码 |
| `kimi-api.ts` | Moonshot | Kimi 文本 |
| `suchuang-api.ts` | 速创 | 图片生成 |

---

## 业务 API

| 文件 | 行数 | 职责 |
|------|------|------|
| `tvc-api.ts` | 117 | TVC 视频 V1：脚本生成、产品分析、SSE 流式 |
| `storyboard.ts` | 497 | 故事板：分镜脚本、图片生成、角色/场景设计 |
| `chat-api.ts` | 153 | 即时聊天，SSE 流式对话 |
| `assets.ts` | 168 | 资产管理 CRUD、批量操作 |
| `points-api.ts` | 224 | 积分系统：查询余额、计价、扣减 |
| `tasks.ts` | 80 | 任务管理：创建/查询/取消 |
| `users-api.ts` | - | 用户注册/登录/资料 |
| `teams-api.ts` | - | 团队管理 |
| `notifications-api.ts` | - | 通知推送 |
| `admin-api.ts` | - | 管理后台 API |
| `admin.ts` | - | 管理后台辅助 |

---

## 特色 API

| 文件 | 职责 |
|------|------|
| `ai-skill.ts` | AI Skill 调用，技能执行 |
| `app-visibility-api.ts` | 应用可见性控制 |
| `apps-api.ts` | 应用配置管理 |
| `image-assets.ts` | 图片资产专用操作 |
| `image-to-prompt.ts` | 图片→提示词反推 |
| `prompt-restrictions.ts` | 提示词限制规则 |
| `prompt-wizard.ts` | 提示词向导/优化 |
| `text-enhance.ts` | 文本增强 |
| `knowledge-card-enhance.ts` | 知识卡片增强 |
| `ecommerce-product-analyze.ts` | 电商产品分析 |
| `realtime-voice.ts` | 实时语音 WebSocket |
| `websocket-client.ts` | 通用 WebSocket 客户端 |
| `kevin-api.ts` | Kevin 监控服务 |

---

## 调用链路

```
UI 组件 / Store
  → api/*.ts（业务封装）
    → client.ts（统一 HTTP 请求）
      → 后端 /api/*（FastAPI）
        → AI 服务（MiniMax / GLM / 即梦 / ...）
```

**SSE 流式接口**: `chat-api.ts`、`tvc-api.ts`、`storyboard.ts`、`glm-api.ts` 使用 EventSource / fetch stream 实现流式响应。

**模型路由**: 所有 AI 服务通过 `model-routing.ts` 动态获取 `category→(provider, model_code)` 映射，支持后端热切换模型。
