# MiniMax 音色设计 + 文字转语音 深挖调研（配音大师模块前置研究）

> 日期：2026-10-27 · 方法：MiniMax 官方 OpenAPI 契约实读（platform.minimax.cn/docs OpenAPI JSON 五份）+ NanoAiCanvas 源码盘点 + minimax.cn C 端产品形态拆解
> 状态：研究阶段产出，设计方案待用户确认后另行输出

## 一、MiniMax 语音 API 全景（官方契约实证）

语音模型六档共用一套协议：`speech-2.8-hd / 2.8-turbo / 2.6-hd / 2.6-turbo / 02-hd / 02-turbo`（另有 legacy 01 系列仅克隆侧）。四类能力：**同步合成 / 异步长文本合成 / 快速复刻 / 音色设计**。

### 1.1 五组端点契约（OpenAPI 实证）

| 端点 | 方法 | 用途 | 关键请求字段 | 关键响应 |
|---|---|---|---|---|
| `/v1/voice_design` | POST | **音色设计**：文字描述→新音色 | `prompt*`（音色描述）、`preview_text*`（≤500 字符试听文本）、`voice_id`（可选自定义）、`aigc_watermark` | `voice_id` + `trial_audio`（**hex 编码音频**） |
| `/v1/t2a_v2` | POST | **同步合成** | `model*`、`text*`（<10,000 字符）、`voice_setting{voice_id*, speed, vol, pitch, emotion, latex_read}`、`audio_setting{sample_rate, bitrate, format, channel}`、`pronunciation_dict.tone`、`timbre_weights`（≤4 音色混音）、`voice_modify{pitch/intensity/timbre [-100,100], sound_effects}`、`subtitle_enable/subtitle_type`、`language_boost`、`stream`、`output_format: url/hex` | `data.audio`（hex 或 url 24h）、`subtitle_file`（句级时间戳 json）、`extra_info.usage_characters` |
| `/v1/t2a_async_v2` | POST | **异步长文本** | `text*`（≤5 万）或 `text_file_id*`（≤100 万，txt/zip）二选一 + 同上 voice_setting 等 | `task_id` + `file_id` |
| `/v1/query/t2a_async_query_v2` | GET | 查异步任务 | `task_id` | `status: processing/success/failed/expired` + `file_id` → 文件检索下载（**9 小时有效**） |
| `/v1/get_voice` | POST | 音色查询 | `voice_type*: system / voice_cloning / voice_generation / all` | 三类音色数组（voice_id/描述/创建时间） |
| `/v1/delete_voice` | POST | 删音色 | `voice_type*`（仅 cloning/generation）+ `voice_id*` | — |
| `/v1/voice_clone` | POST | **快速复刻**（顺带调研） | `file_id*`（复刻音频）、`voice_id*`（自定义 ≥8 位）、`clone_prompt{prompt_audio, prompt_text}`（增强相似度）、`text+model`（试听）、`text_validation+accuracy`（ASR 校验）、降噪/音量归一化 | `demo_audio`（URL）+ `input_sensitive`（风控） |

### 1.2 参数细则（voice_setting 核心）

| 参数 | 范围 | 默认 | 备注 |
|---|---|---|---|
| `speed` | [0.5, 2.0] | 1.0 | 语速 |
| `vol` | (0, 10] | 1.0 | 音量 |
| `pitch` | [-12, 12] | 0 | 语调 |
| `emotion` | happy/sad/angry/fearful/disgusted/surprised/calm/fluent/whisper | — | 9 种情绪 |
| `voice_modify.pitch/intensity/timbre` | [-100, 100] | — | 低沉↔明亮 / 刚劲↔轻柔 / 浑厚↔清脆（比 pitch 更细的音色修饰） |
| `voice_modify.sound_effects` | spacious_echo / auditorium_echo / lofi_telephone / robotic | — | 空旷回音/礼堂广播/电话失真/机器人 |
| `audio_setting.format` | mp3/pcm/flac/wav/pcmu_raw/pcmu_wav/opus | mp3 | sample_rate 8000–44100 默认 32000 |
| `timbre_weights` | 权重 [1,100]，≤4 音色 | — | 混音时 voice_id 置空 |

### 1.3 文本内控制语法（text 字段，官方原文）

- **停顿**：`<#x#>`，x 为秒数 [0.01, 99.99] 两位小数；不可连续多个
- **行内发音替换**：英文小括号包拼音带声调数字/IPA/粤语拼音——`(he2)平`、`(lɪv)`、`(sung3)`
- **语气词标签**（仅 speech-2.8 系列）：`(laughs)(chuckle)(coughs)(clear-throat)(groans)(breath)(pant)(inhale)(exhale)(gasps)(sniffs)(sighs)(snorts)(burps)(lip-smacking)(humming)(hissing)(emm)(sneezes)`；async 另支持 `(whistles)(crying)(applause)`

### 1.4 计费（官方定价概览实读）

| 计费项 | 单价 | 规则 |
|---|---|---|
| 同步/异步合成 speech-2.8-hd（及 2.6-hd/02-hd） | **3.50 元/万字符** | 按 `usage_characters` 计 |
| 同步/异步合成 speech-2.8-turbo（及 turbo 系） | **2.00 元/万字符** | 同上 |
| **音色设计 Voice Design** | **9.90 元/音色** | **生成时不立即收费，首次用于合成时才收**；接口内试听（preview_text）按 2.00 元/万字符 |
| 快速复刻 Voice Clone | 9.90 元/音色 | 同样首次使用才收；试听按所选模型单价 |

### 1.5 关键限制与生命周期（工程上必须处理）

1. **临时音色 7 天删除**：复刻/设计的音色若 168 小时内未在任何合成接口使用，**系统删除**。→ 必须本地存 voice_id + 跟踪使用时间，可定期 `get_voice(voice_generation)` 对账。
2. 音色费 9.9 元首次合成时收 → 「设计」便宜（试听几毛），「用」才产生音色费。产品上应提示。
3. t2a_v2 非流式可 `output_format=url`（24h 有效）省 hex 转码；**流式只有 hex**。
4. 免费/低档 RPM=60（T2A v2 与 async v2）；非法字符 >10% 直接报错（`extra_info.invisible_character_ratio` 返回占比）。
5. `emotion` 与语气词标签是**两条独立的情绪通道**：emotion 是整体基调，语气词是文本内嵌。

## 二、NanoAiCanvas 现状盘点

| 组件 | 现状 | 结论 |
|---|---|---|
| `backend/app/config.py` | `MINIMAX_API_KEY` + `MINIMAX_API_BASE_URL = https://api.minimax.cn/v1` | **后端 key 基础设施就绪**（国内域与 C 端一致） |
| `backend/app/api/v2/minimax.py` | 仅剧本代理（chatcompletion_v2） | 无任何语音端点，**配音大师后端从零起** |
| `src/lib/api/minimax-api.ts` | `generateSpeech` 打自造端点 `/speech/synthesis` + `MINIMAX_CONFIG.API_KEY` 浏览器直连 | **坏代码**（端点不存在、key 暴露），不可复用；MiniMaxSpeechNode 仅 4 个硬编码音色同源 |
| `src/lib/api/glm-tts.ts` | GLM-TTS 独立一套（key 传入式直连 bigmodel） | 竞品参照：voice/speed/volume 三参，无情绪/无音色设计 |
| TVC 引擎 | `tvc_engine.py` 已有 `voice_gender/voice_preset`、`h3_voice` 字段 | **协同点**：配音大师产出的 voice_id 未来可注入 TVC 配音链 |
| 积分系统 | points_service 自动计价引擎 | 若商用可挂积分计价（用户未提，待确认） |
| 应用形态 | /nanoai 子路径 + appsConfigStore 多应用 + admin 25+ 页面 | 挂载点待定（独立子应用 or 画布节点） |

## 三、C 端产品形态拆解（minimax.cn 实页）

**音色设计页**：提示词（5 个预设：年迈智者/激情解说/悬疑故事家/摇篮曲女声/严厉女教师）→ 试听文本（可自动生成）→ 音色槽位显示 → 生成 → 结果区试听。
**文字转语音页**：模型选择 + 情绪 + `<#>` 停顿 + `( )` 语气词快捷插入 + 长文模式 + 5000 字符 + 语言检测 + 声贝消耗展示 + 生成音频 + 调试台 + **生成历史** + 音色卡片（名称+一句话描述+语言）+ 音色效果调节（语速/声调/音量）。

**用户明确的产品语义**：两页**独立**；音色设计产出的音色样本**作为 TTS 页的音色参考**（互通）。

## 四、配音大师模块的工程映射（研究结论，非设计）

- **音色互通的本质**：voice_design 返回的 voice_id 直接可用于 t2a_v2 / t2a_async_v2 的 `voice_setting.voice_id`——API 天然互通，只需本地把「设计的音色」存库并在 TTS 页列出。
- **C 端 5000 字符 vs API 同步 1 万**：API 上限更宽；>5 万走 async（100 万）。
- **试听音频是 hex**：前端需 hex→Uint8Array→Blob→audio 播放；或统一走后端落库转 URL（顺带解决生成历史）。
- **字幕**（sentence 级时间戳 json）API 免费附带，短视频配音对轴可用。

## 五、待用户确认的决策点（进入构思前）

1. **挂载形态**：/nanoai 下独立子页（类 nano2 新应用）？画布新节点？两者都要？
2. **计费**：直接走平台 key 按量付费（现在 settings 里那把 key），还是接 NanoAI 积分体系对用户扣费？
3. **快速复刻**（声音克隆）是否一并纳入配音大师（API 已就绪，多一个 tab 的量）？
4. **音色库范围**：TTS 页音色只列「音色设计产出」还是也拉系统 300+ 音色（get_voice system）？
5. **生成历史**：是否本地落库（音频文件 + 参数）？存哪（assets 表 or 新表）？

## 参考索引

- OpenAPI 契约（已下载 /tmp/minimax-openapi/*.json）：voice-design / t2a / t2a-async / voice-management / voice-cloning
- 定价：platform.minimaxi.com/docs/pricing/overview
- 接口概览：platform.minimax.cn/docs/api-reference/api-overview
- NanoAI：`backend/app/config.py:68`、`backend/app/api/v2/minimax.py`、`src/lib/api/minimax-api.ts`、`src/components/nanoai-workflow/nodes/MiniMaxSpeechNode.tsx`
