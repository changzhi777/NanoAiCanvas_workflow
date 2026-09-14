# Workflow 页面 API 渠道商与模型清单

> 版本: v2.13.0 | 生成日期: 2026-05-07

---

## 一、渠道商总览

| 渠道商 | API 基础地址 | 环境变量 Key | 调用方式 |
|--------|-------------|-------------|----------|
| **智谱 GLM** | `https://open.bigmodel.cn/api/paas/v4` | `VITE_GLM_API_KEY` | 前端直连 |
| **MiniMax** | `https://api.minimaxi.com/v1` | `VITE_MINIMAX_API_KEY` | 前端直连 |
| **即梦（字节）** | `https://api.jimeng.jike.com/v1` | `VITE_JIMENG_API_KEY` | 前端直连 |
| **通义千问（阿里）** | `https://dashscope.aliyuncs.com/api/v1` | `VITE_QWEN_API_KEY` | 前端直连 |
| **Kimi（Moonshot）** | `https://api.moonshot.cn/v1` | `VITE_KIMI_API_KEY` | 前端直连 |
| **wuyinkeji（图片生成）** | 后端代理 `http://localhost:8000` | `WUYINKEJI_API_KEY`（后端） | 前端 → 后端 → wuyinkeji |
| **NanoAI Backend** | `VITE_API_BASE_URL` | 后端数据库 | 前端 → 后端 |

---

## 二、按功能模块分类

### 1. 图片生成

| 节点 / 模块 | 模型 | 渠道商 | API 文件 | 说明 |
|-------------|------|--------|----------|------|
| Skills 任务节点 | GPT-Image | wuyinkeji | `backend/app/services/skills/gpt_image_2/generate.py` | 后端异步生成 + 轮询 |
| NanoBanana 2 | GPT-Image | wuyinkeji | `src/lib/api/nanobanana2.ts` | 前端 → 后端 → wuyinkeji |
| NanoBanana Pro | nano-banana-pro | wuyinkeji | `src/lib/api/nanobanana-pro.ts` | 前端 → 后端 → wuyinkeji |
| GPT-Image 2 | GPT-Image | wuyinkeji | `src/lib/api/gpt-image-api.ts` | 前端 → 后端 → wuyinkeji，支持溶图 |
| MiniMax 图片 | `image-01` | MiniMax | `src/lib/api/minimax-api.ts` | 前端直连 |
| 即梦图片 | `jimeng-image-01` | 即梦 | `src/lib/api/jimeng-api.ts` | 前端直连 |
| 分镜生成节点 | GPT-Image | wuyinkeji | `src/stores/nanoaiWorkflowStore.ts` | 复用 NanoBanana API |

### 2. 文本生成

| 节点 / 模块 | 模型 | 渠道商 | API 文件 | 说明 |
|-------------|------|--------|----------|------|
| MiniMax 文本 | `abab6.5s-chat` / `MiniMax-Text-01` | MiniMax | `src/lib/api/minimax-api.ts` | 工作流节点 |
| 智谱 GLM 文本 | `glm-4` | 智谱 | `src/lib/api/glm-api.ts` | 工作流节点 |
| 通义千问文本 | `qwen-turbo` | 阿里 | `src/lib/api/qwen-api.ts` | 工作流节点 |
| Kimi 文本 | `moonshot-v1-8k` | Moonshot | `src/lib/api/kimi-api.ts` | 工作流节点 |
| Kimi 长文本 | `moonshot-v1-128k` | Moonshot | `src/lib/api/kimi-api.ts` | 长上下文 |
| 通义千问编程 | `qwen-coder-plus` | 阿里 | `src/lib/api/qwen-api.ts` | 工作流节点 |
| 脚本生成节点 | `glm-5` / `glm-4` | 智谱 | `ScriptGeneratorNode.tsx` | 工作流节点 |

### 3. 视频生成

| 节点 / 模块 | 模型 | 渠道商 | API 文件 | 说明 |
|-------------|------|--------|----------|------|
| MiniMax 视频 | `hailuo-2.3-fast-768P` / `hailuo-2.3-768P` | MiniMax | `src/lib/api/minimax-api.ts` | 工作流节点 |
| 即梦视频 | `jimeng-video-01` | 即梦 | `src/lib/api/jimeng-api.ts` | 工作流节点 |
| 智谱 GLM 视频 | `cogview-3` | 智谱 | `src/lib/api/glm-api.ts` | 工作流节点 |

### 4. 语音 / 音频

| 节点 / 模块 | 模型 | 渠道商 | API 文件 | 说明 |
|-------------|------|--------|----------|------|
| MiniMax 语音 | `speech-02-hd` | MiniMax | `src/lib/api/minimax-api.ts` | 工作流节点 |
| 智谱 GLM TTS | `glm-tts` | 智谱 | `src/lib/api/glm-api.ts` | 工作流节点 |
| 智谱语音克隆 | `glm-tts-clone` | 智谱 | `src/lib/api/glm-tts-clone.ts` | 声音克隆 |
| MiniMax 音乐 | `music-2.6` / `music-cover` | MiniMax | `src/lib/api/minimax-api.ts` | 工作流节点 |
| 实时语音对话 | `glm-realtime-flash` / `glm-realtime-air` | 智谱 | `src/lib/api/realtime-voice.ts` | WebSocket 实时对话 |

### 5. 多模态

| 节点 / 模块 | 模型 | 渠道商 | API 文件 | 说明 |
|-------------|------|--------|----------|------|
| 智谱 GLM 多模态 | `glm-4v` | 智谱 | `src/lib/api/glm-api.ts` | 工作流节点 |
| MiniMax 编程 | `coding-plan-search` | MiniMax | `src/lib/api/minimax-api.ts` | 工作流节点 |

### 6. 提示词优化 / 智能辅助

| 功能模块 | 模型 | 渠道商 | API 文件 | 说明 |
|----------|------|--------|----------|------|
| Skills 提示词优化 | `glm-4.5-air` | 智谱 | `SkillsTaskNode.tsx` | GLM-4.5-Air 优化提示词 |
| 提示词向导 | `glm-5` / `glm-5v-turbo` | 智谱 | `src/lib/api/prompt-wizard.ts` | 多轮对话 + 参考图 |
| 提示词增强 | `MiniMax-M2.7` | MiniMax | `src/lib/api/text-enhance.ts` | Anthropic 兼容格式 |
| 知识卡片增强 | `glm-4-flash` | 智谱 | `src/lib/api/knowledge-card-enhance.ts` | 卡片内容生成 |
| 图片识图生词 | `glm-4v-flash` | 智谱 | `src/lib/api/image-to-prompt.ts` | 上传图片 → 生成提示词 |
| 电商产品分析 | `glm-5v-turbo` | 智谱 | `src/lib/api/ecommerce-product-analyze.ts` | 产品图分析 |
| 香蕉兄弟（图生图） | `glm-4v-flash` + `glm-realtime-flash` | 智谱 | `src/lib/api/banana-brother.ts` | 图生图转换 |
| 分镜脚本生成 | `glm-5` | 智谱 | `src/lib/api/storyboard.ts` | 故事板脚本 |

### 7. 后端 API（NanoAI Backend）

| 路由 | 功能 | 后端文件 |
|------|------|----------|
| `/api/auth/*` | 注册 / 登录 / JWT / 刷新 | `backend/app/api/auth.py` |
| `/api/assets/*` | 资产管理 CRUD | `backend/app/api/assets.py` |
| `/api/workflows/*` | 工作流保存 / 加载 | `backend/app/api/workflows.py` |
| `/api/points/*` | 积分查询 / 扣减 | `backend/app/api/points.py` |
| `/api/points_admin/*` | 积分管理后台 | `backend/app/api/points_admin.py` |
| `/api/categories/*` | 自定义分类 | `backend/app/api/categories.py` |
| `/api/teams/*` | 团队管理 | `backend/app/api/teams.py` |
| `/api/sync/*` | 离线数据同步 | `backend/app/api/sync.py` |
| `/api/assets_export/*` | 批量导出 | `backend/app/api/assets_export.py` |
| `/api/prompt_restrictions/*` | 提示词限制 | `backend/app/api/prompt_restrictions.py` |

---

## 三、模型版本速查

### 智谱 GLM（open.bigmodel.cn）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| `glm-5` | 文本 | 脚本生成、提示词向导、分镜脚本 |
| `glm-4.5-air` | 文本 | Skills 提示词优化 |
| `glm-5v-turbo` | 多模态 | 提示词向导（带图）、电商分析 |
| `glm-4v` | 多模态 | GLM 多模态节点 |
| `glm-4v-flash` | 多模态 | 图片识图、香蕉兄弟 |
| `glm-4` | 文本 | GLM 文本节点 |
| `glm-4-flash` | 文本 | 知识卡片增强 |
| `cogview-3` | 图片（生成） | GLM 视频生成 |
| `glm-tts` | 语音 | GLM TTS 节点 |
| `glm-tts-clone` | 语音 | 声音克隆 |
| `glm-realtime-flash` | 实时 | 实时语音对话 |

### MiniMax（api.minimaxi.com）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| `MiniMax-M2.7` | 文本 | 提示词增强（Anthropic 兼容格式） |
| `abab6.5s-chat` | 文本 | MiniMax 文本节点 |
| `MiniMax-Text-01` | 文本 | MiniMax 文本节点（默认） |
| `speech-02-hd` | 语音 | MiniMax 语音合成 |
| `hailuo-2.3-fast-768P` | 视频 | MiniMax 视频生成 |
| `hailuo-2.3-768P` | 视频 | MiniMax 视频生成（高质量） |
| `music-2.6` | 音乐 | MiniMax 音乐生成 |
| `music-cover` | 音乐 | MiniMax 音乐封面 |
| `image-01` | 图片 | MiniMax 图片生成 |
| `coding-plan-search` | 编程 | MiniMax 编程搜索 |

### 即梦 / 字节（api.jimeng.jike.com）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| `jimeng-image-01` | 图片 | 即梦图片生成 |
| `jimeng-video-01` | 视频 | 即梦视频生成 |

### 通义千问 / 阿里（dashscope.aliyuncs.com）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| `qwen-turbo` | 文本 | 通义千问文本节点 |
| `qwen-coder-plus` | 编程 | 通义千问编程节点 |

### Kimi / Moonshot（api.moonshot.cn）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| `moonshot-v1-8k` | 文本 | Kimi 文本节点 |
| `moonshot-v1-128k` | 文本 | Kimi 长文本节点 |

### wuyinkeji（后端代理）

| 模型 ID | 类型 | 用途 |
|---------|------|------|
| GPT-Image | 图片 | Skills / NanoBanana / GPT-Image-2 图片生成 |

---

## 四、调用链路图

```
前端（Workflow 节点）
├── 文本/语音/视频 → 直连各厂商 API（GLM / MiniMax / 即梦 / 千问 / Kimi）
├── 图片生成 → NanoAI Backend → wuyinkeji.com
├── 提示词优化 → 直连智谱 GLM（glm-4.5-air）
├── 提示词增强 → 直连 MiniMax（MiniMax-M2.7）
├── 后端管理（资产/积分/工作流）→ NanoAI Backend（FastAPI + PostgreSQL + Redis）
└── 实时消息 → WebSocket（Redis Pub/Sub）
```
