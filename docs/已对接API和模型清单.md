# 已对接 API 和模型清单

> 统计时间：2026-05-07
> 项目：NanoAiCanvas Workflow

---

## 一、图片生成 API

| 序号 | 渠道商 | API 文件 | 模型代码 | API Endpoint | 功能 | 模型路由分类 |
|------|--------|----------|----------|-------------|------|-------------|
| 1 | MiniMax（魔法小象） | `src/lib/api/minimax-api.ts` | `image-01` | `https://api.minimaxi.com/v1/image/generation` | 文生图 | `minimax_image` |
| 2 | 即梦（字节AI） | `src/lib/api/jimeng-api.ts` | `jimeng-image-01` | `https://api.jimeng.jike.com/v1/image/generation` | 文生图 | `jimeng_image` |
| 3 | 无名科技 | `src/lib/api/gpt-image-api.ts` | GPT-Image-2 | `/v2/image/gpt2`（后端转发） | 文生图、图融合 | - |
| 4 | 无名科技 | `src/lib/api/nanobanana2.ts` | NanoBanana2 | `/v2/image/nanobanana2`（后端转发） | 文生图、多图融合 | - |
| 5 | 无名科技 | `src/lib/api/nanobanana-pro.ts` | NanoBanana Pro | `/v2/image/nanobanana2`（后端转发） | 文生图、多图融合 | - |
| 6 | 智谱AI | `src/lib/api/image-to-prompt.ts` | `glm-5v-turbo` | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | 图片识图生词（反向提示词） | `image_to_prompt` |

### 图片适配器系统

| 适配器 | 文件 | 说明 |
|--------|------|------|
| NanoBanana2 | `src/lib/api/adapters/NanoBanana2Adapter.ts` | 标准 HTTP 轮询 |
| NanoBanana Pro | `src/lib/api/adapters/NanoBananaProAdapter.ts` | 标准 HTTP 轮询 |
| GPT-Image-2 | `src/lib/api/adapters/SkillQueueAdapter.ts` | WebSocket + Redis 队列 |

---

## 二、视频生成 API

| 序号 | 渠道商 | API 文件 | 模型代码 | API Endpoint | 功能 | 模型路由分类 |
|------|--------|----------|----------|-------------|------|-------------|
| 1 | MiniMax | `src/lib/api/minimax-api.ts` | `hailuo-2.3-fast-768P`（默认）<br>`hailuo-2.3-768P` | `https://api.minimaxi.com/v1/video/generation`<br>`/video/generation_result`（查询） | 文生视频（异步） | `minimax_video` |
| 2 | 即梦（字节AI） | `src/lib/api/jimeng-api.ts` | `jimeng-video-01` | `https://api.jimeng.jike.com/v1/video/generation`<br>`/video/generation_result`（查询） | 文生视频（异步） | `jimeng_video` |
| 3 | 智谱AI | `src/lib/api/glm-api.ts` | `cogview-3` | `https://open.bigmodel.cn/api/paas/v4/video/generation`<br>`/video/generation_result`（查询） | 文生视频（异步） | `glm_video` |

> 三个视频 API 均采用异步模式：提交任务 → 获取任务 ID → 轮询结果

---

## 三、音频 / 语音 / TTS API

| 序号 | 渠道商 | API 文件 | 模型代码 | API Endpoint | 功能 | 模型路由分类 |
|------|--------|----------|----------|-------------|------|-------------|
| 1 | 智谱AI | `src/lib/api/glm-tts.ts` | `glm-tts` | `https://open.bigmodel.cn/api/paas/v4/audio/speech` | 语音合成（流式/批量） | `glm_tts` |
| 2 | 智谱AI | `src/lib/api/glm-tts-clone.ts` | `glm-tts-clone` | `https://open.bigmodel.cn/api/paas/v4/voice/clone`<br>`/v4/files`（上传） | 音色克隆 | `glm_tts_clone`<br>`voice_clone` |
| 3 | 智谱AI | `src/lib/api/realtime-voice.ts` | `glm-realtime-flash`<br>`glm-realtime-air` | `wss://open.bigmodel.cn/api/paas/v4/realtime` | 实时语音对话（WebSocket） | `glm_realtime`<br>`realtime_voice` |
| 4 | MiniMax | `src/lib/api/minimax-api.ts` | `speech-02-hd`（高清）<br>`speech-02`（标准） | `https://api.minimaxi.com/v1/speech/synthesis` | 语音合成 | `minimax_speech` |

---

## 四、音乐生成 API

| 序号 | 渠道商 | API 文件 | 模型代码 | API Endpoint | 功能 | 模型路由分类 |
|------|--------|----------|----------|-------------|------|-------------|
| 1 | MiniMax | `src/lib/api/minimax-api.ts` | `music-2.6`<br>`music-cover` | `https://api.minimaxi.com/v1/music/generate` | 音乐生成 | `minimax_music` |

---

## 五、文本 / 多模态 API（补充）

| 序号 | 渠道商 | API 文件 | 模型代码 | API Endpoint | 功能 | 模型路由分类 |
|------|--------|----------|----------|-------------|------|-------------|
| 1 | 智谱AI | `src/lib/api/glm-api.ts` | `glm-4` | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | 文本生成、视频、TTS、多模态 | `glm_text` |
| 2 | 智谱AI | `src/lib/api/glm-api.ts` | `glm-4v` | 同上 | 多模态（图文理解） | `glm_multimodal` |
| 3 | MiniMax | `src/lib/api/minimax-api.ts` | `MiniMax-Text-01`<br>`abab6.5s-chat` | `https://api.minimaxi.com/v1/chat/completions` | 文本生成 | `minimax_text` |
| 4 | MiniMax | `src/lib/api/minimax-api.ts` | `coding-plan-search` | - | 编程搜索 | `minimax_coding` |
| 5 | 即梦（字节AI） | `src/lib/api/jimeng-api.ts` | `jimeng-image-01` / `jimeng-video-01` | - | 图片/视频 | - |
| 6 | 通义千问（阿里） | `src/lib/api/qwen-api.ts` | `qwen-turbo` | `https://dashscope.aliyuncs.com/api/v1` | 文本生成 | `qwen_text` |
| 7 | 通义千问（阿里） | `src/lib/api/qwen-api.ts` | `qwen-coder-plus` | 同上 | 编程 | `qwen_coding` |
| 8 | Kimi（Moonshot） | `src/lib/api/kimi-api.ts` | `moonshot-v1-8k` | `https://api.moonshot.cn/v1/chat/completions` | 文本生成 | `kimi_text` |
| 9 | Kimi（Moonshot） | `src/lib/api/kimi-api.ts` | `moonshot-v1-128k` | 同上 | 长文本 | `kimi_longcontext` |

---

## 六、按渠道商汇总

### 智谱AI（GLM）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| `glm-4` | 文本 | `https://open.bigmodel.cn/api/paas/v4` |
| `glm-4v` | 多模态 | 同上 |
| `glm-5v-turbo` | 图片理解 | 同上 |
| `cogview-3` | 视频生成 | 同上 |
| `glm-tts` | 语音合成 | 同上 |
| `glm-tts-clone` | 音色克隆 | 同上 |
| `glm-realtime-flash` | 实时语音 | `wss://open.bigmodel.cn/api/paas/v4` |
| `glm-realtime-air` | 实时语音 | 同上 |

### MiniMax（魔法小象）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| `MiniMax-Text-01` / `abab6.5s-chat` | 文本 | `https://api.minimaxi.com/v1` |
| `image-01` | 图片生成 | 同上 |
| `hailuo-2.3-fast-768P` / `hailuo-2.3-768P` | 视频生成 | 同上 |
| `speech-02-hd` / `speech-02` | 语音合成 | 同上 |
| `music-2.6` / `music-cover` | 音乐生成 | 同上 |
| `coding-plan-search` | 编程搜索 | 同上 |

### 即梦（字节AI）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| `jimeng-image-01` | 图片生成 | `https://api.jimeng.jike.com/v1` |
| `jimeng-video-01` | 视频生成 | 同上 |

### 无名科技（wuyinkeji）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| NanoBanana2 | 文生图/图融合 | 后端 `/v2/image/nanobanana2` 转发 |
| NanoBanana Pro | 文生图/图融合 | 同上 |
| GPT-Image-2 | 文生图/图融合 | 后端 `/v2/image/gpt2` 转发 |

### 通义千问（阿里）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| `qwen-turbo` | 文本 | `https://dashscope.aliyuncs.com/api/v1` |
| `qwen-coder-plus` | 编程 | 同上 |

### Kimi（Moonshot）

| 模型代码 | 功能类型 | API 基础地址 |
|----------|----------|-------------|
| `moonshot-v1-8k` | 文本 | `https://api.moonshot.cn/v1` |
| `moonshot-v1-128k` | 长文本 | 同上 |

---

## 七、模型路由机制

所有支持动态路由的 API 均通过 `src/lib/api/model-routing.ts` 统一管理：

- **加载方式**：从后端 `/v2/admin/model-routes/map` 拉取 `category → model` 映射
- **缓存策略**：5 分钟 TTL，失败降级到本地 config 硬编码值
- **核心方法**：`getModelCode(category, fallback)` — 优先动态配置，降级本地默认值

### 已注册路由分类（27 个）

| 分类 | 说明 | 默认模型 |
|------|------|---------|
| `glm_text` | GLM 文本 | `glm-4` |
| `glm_video` | GLM 视频 | `cogview-3` |
| `glm_multimodal` | GLM 多模态 | `glm-4v` |
| `glm_tts` | GLM TTS | `glm-tts` |
| `glm_tts_clone` | GLM 语音克隆 | `glm-tts-clone` |
| `glm_realtime` | GLM 实时语音 | `glm-realtime-flash` |
| `minimax_text` | MiniMax 文本 | `MiniMax-Text-01` |
| `minimax_speech` | MiniMax 语音 | `speech-02-hd` |
| `minimax_video` | MiniMax 视频 | `hailuo-2.3-fast-768P` |
| `minimax_music` | MiniMax 音乐 | `music-2.6` |
| `minimax_image` | MiniMax 图片 | `image-01` |
| `minimax_coding` | MiniMax 编程 | `coding-plan-search` |
| `jimeng_image` | 即梦图片 | `jimeng-image-01` |
| `jimeng_video` | 即梦视频 | `jimeng-video-01` |
| `qwen_text` | 通义千问文本 | `qwen-turbo` |
| `qwen_coding` | 通义千问编程 | `qwen-coder-plus` |
| `kimi_text` | Kimi 文本 | `moonshot-v1-8k` |
| `kimi_longcontext` | Kimi 长文本 | `moonshot-v1-128k` |
| `skills_optimize` | 提示词优化 | - |
| `skills_task` | 图片生成 | - |
| `script_generator` | 脚本生成 | - |
| `prompt_wizard` | 提示词向导 | - |
| `text_enhance` | 提示词增强 | - |
| `image_to_prompt` | 图片识图生词 | `glm-5v-turbo` |
| `storyboard` | 分镜脚本 | - |
| `realtime_voice` | 实时语音对话 | - |
| `voice_clone` | 声音克隆 | - |

---

*文档生成者：BB小子 🤙*
