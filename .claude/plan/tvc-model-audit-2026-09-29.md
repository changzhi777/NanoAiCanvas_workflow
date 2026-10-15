# TVC 模型参数全面审查报告（2026-09-30）

> **执行状态（2026-09-30 更新）**：✅ 全部完成——阶段 1/2.1-2.3/3.1-3.3/4.1/5.1-5.2 已实施部署（commits: f9dec4b / 204da48 / 36aa3fb / b30a5fa / ebc9c0a）；
> 刻意跳过：3.4（M3 无升级证据）、3.5（NanoBanana2 无失败驱动）、5.3（E2E spec，手动 E2E 多轮覆盖）；
> 单测基线 238 → 251。期间额外交付：GLM 主路重构 + DeepSeek 兜底（f8bda15/ce46d1c）+ 生图/视频模型升级 GPT-Image-2.5-flare / MiniMax H3 主路（ebc9c0a）。

> 范围：NanoAiCanvas 全部 TVC 相关模型/参数盘点 + 升级方案 + 风险评估
> 审查基准：当前 main 分支（v2.13.220+），生产环境 `https://91zm.com.cn/nanoai`（91zm.com.cn）
> 文档性质：**只读审查报告**，不涉及代码修改或 git 操作
> 编写者：BB小子 🤙

---

## 已明确的决策（基于代码现状 + 记忆文件交叉核实）

### 模型主路 / 兜底链路（生产已稳定）

| 链路 | 主路 | 兜底 | 计费通道 |
|------|------|------|---------|
| Step 1 剧本（无图） | GLM-5.1 / glm-4.5-air（按 optimize_mode） | MiniMax-M2.7 | 七牛云 OpenAI 主路 / 智谱 Anthropic 兜底 |
| Step 1 剧本（有 reference_image） | **MiniMax-M3 多模态** | — | MiniMax /anthropic/v1/messages |
| Step 2 提示词优化 | GLM-4.5-air（默认） | — | 七牛云主路 |
| Step 4 生图 | **GPT-Image-2**（速创代理） | Jimeng / MiniMax image-01 | 速创账户 |
| Step 5 视频 | **minimax-official（MiniMax-Hailuo-02）** | minimax H3（速创）→ Seedance（ARK，未配） | MiniMax Coding 套餐（6s/10s 自适应）|
| Step 5 BGM | **music-2.6** | — | MiniMax Music API |

### Provider Keys（生产 .env 位置：`/opt/nanoai/.env`）

| Provider | 当前状态 | 端点 |
|---------|---------|------|
| GLM Coding 套餐 | ✅ 已配 | `https://open.bigmodel.cn/api/anthropic/v1/messages` |
| 七牛云 GLM | ✅ 已配 | `https://openai.qiniu.com/v1`（默认 `z-ai/glm-5.3-flash`）|
| 速创 Wuyinkeji | ✅ 已配 | `https://api.wuyinkeji.com`（query param key）|
| MiniMax 官方 | ✅ 已配 | `https://api.minimax.cn/v1` |
| MiniMax H3（速创代理）| ✅ 走速创账户 | `/api/async/video_minimax_h3` |
| ARK Seedance | ❌ **未配置** | `https://ark.cn-beijing.volces.com/api/v3` |
| JIMENG 即梦 | ❌ 未配置 | `https://api.jimeng.jike.com/v1` |
| OpenAI（直接）| ❌ 未配 | — |

### 已知历史 Bug / 风险点（已修复 / 待修复）

1. **GLM Coding 套餐 v4 端点 1113 报错**：已切七牛云 OpenAI 主路 + Anthropic 兜底（commit `c03ebc4` 2026-09-15）
2. **video_model 硬默认短路配置**：刚修复 — 但 `tvc_engine.py:163` 仍残留 `"MiniMax-H3"` 硬编码兜底（与生产配置 `minimax-official` 不一致，**潜在隐患**）
3. **GLM-5.3-Flash thinking 模式**：默认开，max_tokens < 2000 时被强制拉到 2000；前端 `video-agent` 端点 max_tokens=512 但走 `glm-4.5-air`（非 5 系列），不受影响

---

## 整体规划概述

### 审查目标

1. **找过时模型**：所有仍在代码里但已被官方弃用 / 性能落后的模型名
2. **找配置不一致**：默认值在前后端 / 多处定义不统一导致"用户选 X 但实际跑 Y"
3. **找升级机会**：当前可切换的更高质量 / 更便宜 / 更稳定模型
4. **找死代码**：被弃用但仍被 import / 调用的历史函数、配置项

### 涉及技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.14 + FastAPI 0.109 + SQLAlchemy 2.0（async）+ Pydantic v2 |
| 前端 | React 19 + TypeScript 5.9 + Vite 5.2 + Zustand 24 Stores |
| AI 协议 | 七牛云 OpenAI 兼容（主路） + 智谱 Anthropic 兼容（兜底） + MiniMax 双协议 |
| 持久化 | PostgreSQL 26 模型 + Redis（队列 / Pub/Sub / 缓存）|

### 主要阶段（按依赖排序）

| 阶段 | 描述 | 风险等级 |
|------|------|---------|
| **阶段 1** | 死代码清理（CogVideoX-3 / app_visibility 幽灵项） | 低 |
| **阶段 2** | 硬编码默认值统一（前后端 / admin 三处对齐） | 中（破坏配置兼容性需迁移）|
| **阶段 3** | 模型升级（GLM-5.3-Flash 全面推广 / MiniMax 新版 / 视频时长新选项） | 中-高（需真实回归测试）|
| **阶段 4** | 前端属性面板增补选项（让用户能选新模型） | 低 |
| **阶段 5** | 文档同步 + 测试基线更新 | 低 |

---

## 详细盘点表

### 阶段 1：死代码与历史幽灵（P0 立即清理）

#### 任务 1.1：`poll_glm_video()` 死代码删除

- **目标**：删除 GLM CogVideoX-3 视频 Provider 的轮询函数（已无调用方）
- **当前值**：
  - `backend/app/api/v2/tvc_polling.py:9-41` — `poll_glm_video()` 函数完整保留，含 CogVideoX-3 错误消息文案
  - `backend/app/api/v2/CLAUDE.md:137` — 标注"当前无调用方"
- **建议值**：**整个函数删除**
- **理由**：
  - changelog 2026-05-18 已声明"移除 GLM CogVideoX-3 视频 Provider，Seedance 为唯一视频 Provider"
  - 该函数已经没有任何 import 方（grep 验证仅 tvc_polling.py 自有定义）
  - 删除 33 行无副作用代码
- **优先级**：P0
- **涉及文件**：`backend/app/api/v2/tvc_polling.py`
- **预估工作量**：5 分钟

#### 任务 1.2：`app_visibility.py` 幽灵 `glm_video` 配置项

- **目标**：移除 app_visibility 默认注册中已死掉的"智谱 GLM 视频（CogVideoX-3）"项
- **当前值**：
  - `backend/app/api/v2/app_visibility.py:113` — `{"item_id": "glm_video", "item_name": "智谱视频", "description": "智谱GLM视频生成（CogVideoX-3）", "category": "智谱GLM", "visibility": "enabled"}`
- **建议值**：**删除该行**（或保留 item_id 但 description 改为"已弃用，仅占位"）
- **理由**：CogVideoX-3 已不在 tvc_providers 工厂里；该 visibility 项会让 admin 后台展示一个永远无法启用的 ghost 配置
- **优先级**：P0
- **涉及文件**：`backend/app/api/v2/app_visibility.py`
- **预估工作量**：5 分钟

#### 任务 1.3：MiniMax `abab6.5s-chat` 旧模型名残留

- **目标**：删除 `MiniMax API 代理` 模块对 `abab6.5s-chat` 的引用
- **当前值**：
  - `backend/app/api/v2/minimax.py:4` — 注释 `# 支持模型：abab6.5s-chat (MiniMax-Text-01)`
  - `backend/app/api/v2/minimax.py:107` — `MiniMaxScreenplayRequest.model: str = "MiniMax-M2.7"`（已切 M2.7）
  - `backend/app/api/v2/minimax.py:249` — `model: req.model` 透传给 MiniMax
- **建议值**：**保留 M2.7 默认值不动**，注释改为"支持模型：MiniMax-M2.7（文本）/ MiniMax-M3（视觉）"
- **理由**：`abab6.5s-chat` 实际已无请求，注释维护不当会让后人误以为还在用
- **优先级**：P1
- **涉及文件**：`backend/app/api/v2/minimax.py`
- **预估工作量**：2 分钟

#### 任务 1.4：前端属性面板 `jimeng-image-01` 选项淘汰

- **目标**：移除 WorkflowPropertiesPanel 中仍在显示但已经无人使用的"即梦"生图选项
- **当前值**：
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:743-744` — `<option value="jimeng">即梦</option>`（tvc_script 节点生图模型下拉）
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:773, 833-834` — StoryboardGeneratorNode 视频 API 下拉里也有 `jimeng-video`
  - `backend/app/api/v2/tvc_providers.py:50-69` — `_gen_one_jimeng()` 工厂函数完整保留
- **建议值**：
  - 即梦图片（jimeng-image-01）：**保留下拉选项**但 description 加 "未配置 key 时不可用"
  - 即梦视频（jimeng-video）：**移除下拉**（历史遗留，后端已无 _gen_one_jimeng_video 函数）
- **理由**：前端选了 jimeng-video 但后端完全不支持，会导致任务必失败
- **优先级**：P0
- **涉及文件**：`src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx`
- **预估工作量**：10 分钟

---

### 阶段 2：硬编码默认值统一（P0 / 高优先）

#### 任务 2.1：`video_model` 默认值三处对齐

- **目标**：消除 video_model 硬编码默认值在不同位置不一致导致的"用户选 X 但实际跑 Y"
- **当前值（3 处不同）**：

| 位置 | 当前默认值 | 行号 |
|------|-----------|------|
| `tvc_engine.py:163` | `... or "MiniMax-H3"`（硬编码兜底）| **危险**|
| `tvc_config.py:54` | `step5_video.default_provider = "seedance"` | 与生产不一致 |
| `app/admin/tvc-config/page.tsx:51` | `step5_video.default_provider = "minimax-official"` | ✅ 与生产一致 |
| `tvcVideo01.ts:54, 81` | `videoModel: 'minimax-official'` | ✅ 与生产一致 |
| `tvc-cascade.ts:21` | `seedance: 'jimeng-video-01'` | 别名表，没问题 |
| `tvcStore.ts:104` | `videoModel: 'auto'` | 占位符，最终走 tvc-api 透传 |

- **建议值**：
  - `tvc_engine.py:163`：`... or "minimax-official"`（与生产对齐）
  - `tvc_engine.py:168`：`fallback = "MiniMax-H3" if primary != "minimax" else "seedance"`（让 fallback 真正是"与主路不同"）
  - `tvc_engine.py:171`：注释 `用户显式选的就是 seedance，第二次仍失败 → 用 minimax-official 兜底`
  - `tvc_config.py:54`：`step5_video.default_provider = "minimax-official"`
- **理由**：
  - 生产环境实际跑 `minimax-official`（参考 prod-91zm-deploy-2026-09-01 部署日志）
  - 当前 `tvc_engine.py:163` 的 `"MiniMax-H3"` 兜底意味着"如果用户没选 + cfg 没值 → 走速创 H3"，会绕开 Coding 套餐额度
  - session-2026-09-16-tvc-hardening 提到"video_model 硬默认短路配置的 bug"正是这一处
- **优先级**：P0（生产一致性 Bug）
- **涉及文件**：
  - `backend/app/api/v2/tvc_engine.py`（163, 168, 171 行）
  - `backend/app/api/v2/tvc_config.py`（54 行）
- **风险**：如果用户已保存的"全局配置"覆盖 default_provider，需要先 migrate 数据
- **预估工作量**：15 分钟（含测试）

#### 任务 2.2：GLM 模型映射 → 七牛云主路的隐式路由

- **目标**：明确"用户选 glm-5.1 → 实际跑 z-ai/glm-5.3-flash"的行为，避免静默切换
- **当前值**：
  - `backend/app/config.py:45` — `QINIU_DEFAULT_MODEL: str = "z-ai/glm-5.3-flash"`
  - `backend/app/api/v2/glm_proxy.py:202-210` — `_to_qiniu_model()`：所有 `glm-*`（无 `/`）都映射到 `QINIU_DEFAULT_MODEL`
  - `backend/app/api/v2/glm_proxy.py:288-294` — Anthropic 兜底分支仅当 `model.startswith("glm-5")` 才开 thinking
- **建议值**：
  - 在 admin tvc-config 页面加一行醒目注释："GLM-* 模型实际通过七牛云路由到 `z-ai/glm-5.3-flash`（QINIU_DEFAULT_MODEL）"
  - 或：让 `_to_qiniu_model()` 把每个 glm 名显式映射（如 `glm-5.1 → z-ai/glm-5.1`, `glm-4.5-air → z-ai/glm-4.5-air`），保留版本对应
- **理由**：用户预期选 glm-5.1 拿到 GLM-5.1 的能力，实际拿到 5.3-flash — 质量、thinking 行为、token 计费全部不同
- **优先级**：P1（一致性 + 用户预期）
- **涉及文件**：`backend/app/api/v2/glm_proxy.py`、`backend/app/config.py`
- **预估工作量**：30 分钟（含回归测试）

#### 任务 2.3：图片 Provider 默认值统一

- **目标**：明确 TVC Step 4 生图的主路
- **当前值（2 处不一致）**：
  - `tvc_config.py:41` — `step4_image.default_provider = "gpt-image-2"`
  - `app/admin/tvc-config/page.tsx:50` — `step4_image.default_provider = "minimax"`
- **建议值**：与后端对齐 `gpt-image-2`（admin 页面默认值同步）
- **理由**：
  - 后端默认 GPT-Image-2，但 admin 页面默认值"minimax"会让管理员误以为生产跑 MiniMax
  - GPT-Image-2 实际是 MiniMax 同源代理（tvc_providers.py 第 73 行 `WUYINKEJI_API_KEY`），不是真正的 OpenAI
- **优先级**：P1
- **涉及文件**：`src/app/admin/tvc-config/page.tsx`
- **预估工作量**：5 分钟

---

### 阶段 3：模型升级机会（P1 / P2）

#### 任务 3.1：GLM-5.3-Flash 在前端选项暴露

- **目标**：让用户在属性面板可选 glm-5.3-flash（与后端 QINIU 主路一致）
- **当前值**：
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:726-729` — `tvc_script` 节点剧本生成下拉：`glm-5.1 / glm-4.5-air / MiniMax-M2.7`（无 5.3-flash）
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:353-355` — `storyboard_shot_a` 节点优化模型：`glm-4.5-air / glm-4.7-flash`（注：glm-4.7-flash 是否真实存在待验证）
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:457-459` — `storyboard_v2` 模型下拉同上
- **建议值**：
  - 加 `<option value="glm-5.3-flash">GLM-5.3-Flash（快·thinking 默认开）</option>` 在 tvc_script 剧本下拉
  - 优化模型下拉添加 `glm-5.3-flash`
  - 验证 `glm-4.7-flash` 是否真实存在；若不存在删除该选项
- **理由**：GLM-5.3-Flash 是当前 QINIU 主路默认模型，thinking 默认开，质量 / 速度 / 价格均优于 4.5-air
- **优先级**：P1
- **涉及文件**：`src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx`
- **风险**：thinking 默认开意味着 max_tokens 必须 ≥ 2000，需同步调整前端默认值或文档
- **预估工作量**：20 分钟

#### 任务 3.2：MiniMax 视频通道时长选项扩展

- **目标**：官方 MiniMax 通道（minimax-official）当前只支持 6s/10s，需要让用户清楚知道时长自适应
- **当前值**：
  - `backend/app/api/v2/tvc_providers.py:337-338` — `eff_duration = 6 if duration <= 6 else 10`（强制 6/10 取档）
  - `backend/app/api/v2/tvc_providers.py:340` — 分辨率自适应 `768P / 1080P`
  - `src/lib/tvc-cascade.ts:11-17` — `MODEL_DURATION_LIMITS` 列出各模型时长选项
- **建议值**：
  - 前端属性面板加注释：选中 minimax-official 时，"单镜头时长超过 6s 自动取 10s，最长 10s"
  - 前端加分辨率选项：`720p / 768P / 1080P`
- **理由**：用户传 15s 时长会被静默截到 10s，需要显式告知
- **优先级**：P2（体验优化）
- **涉及文件**：
  - `src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx`
  - `src/lib/tvc-cascade.ts`
- **预估工作量**：30 分钟

#### 任务 3.3：Seedance 通道从兜底升为主路候选

- **目标**：考虑在 ARK_API_KEY 未配置前，给出明确兜底策略
- **当前值**：
  - `backend/app/api/v2/tvc_engine.py:168` — fallback 逻辑：`"seedance" if not primary.startswith("MiniMax") else "MiniMax-H3"`
  - `backend/app/api/v2/tvc_providers.py:386-429` — `_submit_video_seedance()` 函数完整保留
  - `backend/app/api/v2/seedance_constants.py` — Seedance 提示词常量在用
- **建议值**：
  - 当前 ARK 未配，Seedance 调用必失败（raise Exception）
  - 兜底链调整为：minimax-official → minimax-h3 → 标记"未配置 ARK"提示用户
- **理由**：当前 Seedance 是"假兜底"（必失败），需要真实切换逻辑
- **优先级**：P2
- **涉及文件**：`backend/app/api/v2/tvc_engine.py`
- **预估工作量**：1 小时

#### 任务 3.4：MiniMax 视觉模型 M3 → M2.7-Vision（如存在）

- **目标**：检查 MiniMax 是否有更新的视觉模型替代 M3
- **当前值**：
  - `backend/app/api/v2/tvc_engine.py:429` — `vision_model = "MiniMax-M3"`
  - `backend/app/api/v2/tvc_engine.py:359, 378` — `_describe_with_minimax_m3` hardcoded
- **建议值**：**保留 M3**（如 M2.7-Vision 不存在或不稳定）
- **理由**：M3 当前 cache 命中率（参考 admin tvc-config 页面 cache-stats）需要先确认；无升级证据前不切换
- **优先级**：P3（仅研究）
- **预估工作量**：0（仅记录现状）

#### 任务 3.5：图片 Provider 新增 NanoBanana2 / Pro 链路

- **目标**：在 TVC Step 4 引入 NanoBanana2 / Pro 替代 GPT-Image-2（备选）
- **当前值**：
  - `backend/app/api/v2/tvc_providers.py:73-132` — `_gen_one_gpt_image_2()` 是唯一主路
  - `backend/app/api/v2/image.py` — NanoBanana2/Pro 在 V2 图片生成 API 有，但 TVC engine 不用
- **建议值**：在 `get_image_provider()` 工厂加 `nano-banana2` / `nano-banana-pro` 分支
- **理由**：TVC 项目多模型备选可避免单点失败；NanoBanana 在某些风格（动漫、产品图）质量更好
- **优先级**：P2
- **涉及文件**：`backend/app/api/v2/tvc_providers.py`
- **预估工作量**：1-2 小时（含回归）

---

### 阶段 4：前端面板体验优化（P2）

#### 任务 4.1：tvc_script 节点"模型选择"折叠面板默认展开

- **当前值**：`WorkflowPropertiesPanel.tsx:716-721` — 默认 `modelsOpen=false`
- **建议值**：默认 `modelsOpen=true`（或在 hover 时高亮"模型选择"按钮）
- **理由**：模型选择是用户主要差异化点，折叠导致用户看不到
- **优先级**：P2
- **预估工作量**：10 分钟

#### 任务 4.2：StoryboardGeneratorNode 视频模型下拉扩展

- **当前值**：`WorkflowPropertiesPanel.tsx:783-786` — `providerModels` 只列了 `hailuo-2.3-fast-768P / hailuo-2.3-768P / jimeng-video`
- **建议值**：加 `MiniMax-Hailuo-02 / MiniMax-H3 / Seedance-2.0`
- **理由**：与 TVC Script 节点选项统一，避免用户换节点后选项消失
- **优先级**：P2
- **预估工作量**：20 分钟

---

### 阶段 5：文档与测试同步（P0 / 测试阶段）

#### 任务 5.1：CLAUDE.md 更新

- **涉及文件**：
  - `backend/app/api/v2/CLAUDE.md`：删除 poll_glm_video 描述（任务 1.1 后）
  - `src/stores/CLAUDE.md`：同步 24 Stores 数量（已是最新）
  - `src/lib/api/CLAUDE.md`：tvc-api 增补新选项（任务 3.1 后）
- **预估工作量**：30 分钟

#### 任务 5.2：单元测试基线更新

- **新增测试**：
  - `tests/unit/test_tvc_config_defaults.py` — 验证 DEFAULT_CONFIG 与前端默认值一致
  - `tests/unit/test_tvc_providers_factory.py` — 验证 video_model → provider 路由（含 minimax-official）
  - `tests/unit/test_video_model_fallback.py` — 验证任务 2.1 的兜底链
- **涉及文件**：`backend/tests/unit/`
- **预估工作量**：2-3 小时

#### 任务 5.3：E2E 关键路径回归

- **测试场景**：
  - 提交 TVC 任务（6 镜头 / 30 秒 / minimax-official）→ 确认 SSE 流显示 `MiniMax Official` 提供方
  - 提交 TVC 任务（4 镜头 / 20 秒 / minimax-h3）→ 确认走速创代理
  - 模拟 ARK 未配置场景 → 确认 fallback 行为
- **涉及文件**：`e2e/tvc-model-routing.spec.ts`（新增）
- **预估工作量**：2 小时

---

## 风险评估

### 风险矩阵（按优先级 × 兼容性）

| 风险 | 等级 | 影响面 | 缓解措施 |
|------|------|--------|---------|
| **任务 2.1 改 `tvc_engine.py:163` 硬编码 → 用户已保存配置未覆盖到 minimax-official** | 🔴 高 | 所有 TVC 任务的视频通道 | 加版本化 alembic 迁移：把已存在全局配置 `step5_video.default_provider != "minimax-official"` 的记录全部更新 |
| **任务 1.4 删除 `jimeng-video` 选项 → 旧工作流加载失败** | 🟡 中 | 历史保存的 workflow JSON 引用 jimeng-video | 在 `get_video_provider()` 加 alias 兜底：未知 provider 名 → `seedance` |
| **任务 3.1 加 glm-5.3-flash → thinking 模式 max_tokens 不足** | 🟡 中 | Step 1 剧本生成输出截断 | 前端同时把 step1 的 max_tokens 默认提到 4096；后端在 `_glm_chat` 自动升级到 2000 |
| **任务 2.3 改 admin 默认 → 管理员困惑** | 🟢 低 | 仅 admin 页面视觉 | 加变更说明 toast + commit message 显式标注 |
| **任务 3.3 Seedance 兜底失败 → 任务失败** | 🟡 中 | 当主路 + 速创都失败时 | 已在 tvc_engine.py:811 有"所有 video 失败 → raise Exception"保护，行为不变 |

### 兼容性影响

| 对象 | 影响 |
|------|------|
| **现有任务（in-flight）** | 0 影响 — 任务级请求参数不变 |
| **已保存工作流 JSON** | 低 — 仅删除 jimeng-video 选项需迁移 |
| **已保存全局配置（数据库）** | 中 — 需 alembic migrate step5_video.default_provider |
| **已保存用户配置（数据库）** | 0 — 用户配置项不变 |
| **前端 localStorage 状态** | 0 — workflow 持久化字段不变 |
| **生产积分计算** | 中 — 任何默认时长变化会影响积分扣减（需 points_service 同步） |

---

## 实施步骤（按依赖排序）

### 阶段 1：死代码清理（独立，无依赖）

```
1.1 [P0] poll_glm_video() 删除         ←── 5 分钟
1.2 [P0] app_visibility.py 幽灵项删除    ←── 5 分钟
1.3 [P1] minimax.py 注释更新             ←── 2 分钟
1.4 [P0] WorkflowPropertiesPanel jimeng-video 选项移除 ←── 10 分钟
```

依赖关系：无相互依赖，可任意顺序提交

### 阶段 2：默认值统一（依赖阶段 1 的认知统一）

```
2.1 [P0] video_model 三处对齐            ←── 15 分钟（含测试）
2.2 [P1] QINIU 模型映射显式化            ←── 30 分钟
2.3 [P1] admin tvc-config 默认值同步     ←── 5 分钟
```

**关键依赖**：2.1 必须先做（影响生产任务路径），2.2 / 2.3 可后做

### 阶段 3：模型升级（依赖阶段 2 完成）

```
3.1 [P1] 前端加 glm-5.3-flash 选项         ←── 20 分钟
3.2 [P2] MiniMax 通道时长选项说明          ←── 30 分钟
3.3 [P2] Seedance 兜底真实化              ←── 1 小时
3.4 [P3] M3 → M2.7-Vision 研究            ←── 0（仅记录）
3.5 [P2] NanoBanana 链路接入              ←── 1-2 小时
```

### 阶段 4：前端体验（依赖阶段 3.1 完成）

```
4.1 [P2] tvc_script 模型面板默认展开       ←── 10 分钟
4.2 [P2] StoryboardGeneratorNode 视频模型下拉扩展 ←── 20 分钟
```

### 阶段 5：测试与文档（所有阶段完成后）

```
5.1 [P0] CLAUDE.md 同步                    ←── 30 分钟
5.2 [P0] 单元测试基线更新                  ←── 2-3 小时
5.3 [P0] E2E 关键路径回归                  ←── 2 小时
5.4 [P0] 生产部署（按 deploy-discipline-2026-09-15 流程） ←── 30 分钟
```

---

## 验收方式

### 自动测试

| 测试类型 | 命令 | 通过标准 |
|---------|------|---------|
| 后端单元 | `cd backend && PYTHONPATH=. pytest tests/unit/ -v` | 全 pass |
| 后端 TVC 引擎 | `cd backend && PYTHONPATH=. pytest tests/unit/test_tvc_config_defaults.py tests/unit/test_tvc_providers_factory.py -v` | 新增测试全 pass |
| 前端单元 | `pnpm test src/lib/api/ src/stores/` | 全 pass |
| 前端属性面板 | `pnpm test src/components/nanoai-workflow/` | jimeng-video 选项移除后测试更新 |
| E2E 关键路径 | `pnpm test:e2e e2e/tvc-model-routing.spec.ts` | 6/6 场景通过 |

### 手动验证（生产部署后）

| 验证项 | 操作 | 预期 |
|--------|------|------|
| TVC 一键生成（minimax-official） | 提交 6 镜头 / 30s 任务 | SSE 流显示 `MiniMax Official`，视频时长 = 10s × 6 或 6s × 6（按需自适应）|
| TVC 一键生成（minimax） | 提交 6 镜头 / 30s 任务，video_model 选 minimax | 走速创代理（API 端点含 `video_minimax_h3`）|
| 全局配置 admin 页面 | 进入 `/admin/tvc-config` | 默认值显示 `minimax-official`（与代码一致）|
| 提示词优化 | 提交优化任务 | 走 `_glm_chat` → QINIU OpenAI 主路 |
| BGM 生成 | 提交任务含 BGM | MiniMax music-2.6，30 秒音频 |

### 兼容性回归

| 场景 | 验证 |
|------|------|
| 已保存工作流加载 | JSON 中 `videoModel: 'seedance'` → 仍能跑（如 ARK 未配则失败，正常）|
| 已保存全局配置 | DB 中 `step5_video.default_provider = "seedance"` → 优先用户配置，行为不变 |
| 历史任务回查 | workflow_executor.load_task 历史 ID → 状态正确加载 |
| 积分计算 | 任何时长变化后 `points_service.calc_tvc_cost` 一致 |

---

## 关键文件路径清单

### 后端（修改）

| 路径 | 涉及阶段 |
|------|---------|
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/tvc_polling.py` | 阶段 1.1 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/app_visibility.py` | 阶段 1.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/minimax.py` | 阶段 1.3 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/tvc_engine.py` | 阶段 2.1 / 3.3 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/tvc_config.py` | 阶段 2.1 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/tvc_providers.py` | 阶段 3.5 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/glm_proxy.py` | 阶段 2.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/config.py` | 阶段 2.2 |

### 前端（修改）

| 路径 | 涉及阶段 |
|------|---------|
| `/Users/mac/cz_code/NanoAiCanvas_workflow/src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx` | 阶段 1.4 / 3.1 / 4.1 / 4.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/src/app/admin/tvc-config/page.tsx` | 阶段 2.3 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/src/lib/tvc-cascade.ts` | 阶段 3.2 |

### 文档（更新）

| 路径 | 涉及阶段 |
|------|---------|
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/CLAUDE.md` | 阶段 5.1 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/src/lib/api/CLAUDE.md` | 阶段 5.1 |

### 测试（新增）

| 路径 | 涉及阶段 |
|------|---------|
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/tests/unit/test_tvc_config_defaults.py` | 阶段 5.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/tests/unit/test_tvc_providers_factory.py` | 阶段 5.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/tests/unit/test_video_model_fallback.py` | 阶段 5.2 |
| `/Users/mac/cz_code/NanoAiCanvas_workflow/e2e/tvc-model-routing.spec.ts` | 阶段 5.3 |

---

## 总结：5 个最关键发现

1. **🔴 [P0] video_model 硬编码兜底不一致** — `tvc_engine.py:163` 写死 `"MiniMax-H3"` 但生产实际用 `minimax-official`，存在让用户配置被静默绕开的隐患（与已修复的 video_model 硬默认短路 bug 同根）
2. **🔴 [P0] poll_glm_video 死函数 + app_visibility 幽灵项** — 已弃用的 CogVideoX-3 代码仍占位，admin 后台会显示永远不可用的配置
3. **🟡 [P1] 前后端默认值三处不一致** — step5_video.default_provider 在 backend / admin / tvcVideo01 三处分别写 `seedance` / `minimax-official` / `minimax-official`
4. **🟡 [P1] GLM 模型映射对用户不透明** — 选 `glm-5.1` 实际跑 `z-ai/glm-5.3-flash`，质量 + 行为差异显著，需显式映射或文档说明
5. **🟢 [P2] 前端属性面板缺新模型选项** — glm-5.3-flash / Hailuo-02 / Seedance-2.0 已就绪但未在前端暴露给用户选择

---

## 附录 A：完整模型清单（当前在用 vs 历史残留）

### A.1 当前在用（推荐保留）

| 模型 | 用途 | Provider |
|------|------|----------|
| glm-5.1 | Step 1 剧本（tvc_deep 模式）| 七牛云 → z-ai/glm-5.3-flash |
| glm-4.5-air | Step 1 fast / Step 2 优化 / 视频 Agent | 七牛云 → z-ai/glm-5.3-flash |
| glm-5v-turbo | Step 1 参考图分析 | 智谱官方 |
| glm-5.3-flash | QINIU 主路默认 | 七牛云 |
| MiniMax-M3 | 视觉描述 + 有图剧本 | MiniMax Anthropic 兼容 |
| MiniMax-M2.7 | 无图剧本 fallback | MiniMax OpenAI 兼容 |
| gpt-image-2 | Step 4 生图默认 | 速创 scapi.net |
| MiniMax image-01 | Step 4 生图可选 | MiniMax |
| jimeng-image-01 | Step 4 生图 fallback | 即梦（key 未配）|
| MiniMax-Hailuo-02 | Step 5 视频默认 | MiniMax Coding 套餐 |
| MiniMax-H3 | Step 5 视频 fallback | 速创代理 |
| doubao-seedance-2-0-260128 | Step 5 视频 fallback 2 | 字节 ARK（key 未配）|
| music-2.6 | Step 5 BGM | MiniMax Music |

### A.2 历史残留（建议清理）

| 模型 | 出现位置 | 状态 |
|------|---------|------|
| CogVideoX-3 | `poll_glm_video()` + `app_visibility` 默认项 | 已弃用 2026-05-18 |
| abab6.5s-chat | `minimax.py` 注释 | 已弃用，仅文档提及 |
| MiniMax-Text-01 | `minimax.py` 注释 | 已弃用，仅文档提及 |
| hailuo-2.3-fast-768P | `WorkflowPropertiesPanel.tsx` 下拉 | 已弃用主路，仅 StoryboardGeneratorNode 可选 |
| hailuo-2.3-768P | 同上 | 已弃用主路 |
| jimeng-video | `WorkflowPropertiesPanel.tsx` 下拉 | 后端无实现 |

---

## 附录 B：相关 CLAUDE.md / 记忆文件交叉引用

- `/Users/mac/cz_code/NanoAiCanvas_workflow/CLAUDE.md` — 项目总览（2026-09-01 最新）
- `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/v2/CLAUDE.md` — V2 API 详情
- `/Users/mac/cz_code/NanoAiCanvas_workflow/backend/app/api/CLAUDE.md` — V1 + V2 概览
- `/Users/mac/cz_code/NanoAiCanvas_workflow/src/components/nanoai-workflow/CLAUDE.md` — 前端工作流
- `/Users/mac/cz_code/NanoAiCanvas_workflow/src/stores/CLAUDE.md` — Zustand Stores
- `/Users/mac/cz_code/NanoAiCanvas_workflow/src/lib/api/CLAUDE.md` — API 客户端
- 记忆：`prod-ai-provider-keys.md` — 生产 AI Key 速查
- 记忆：`session-2026-09-16-tvc-hardening.md` — 一镜到底6连 bug 修复（含 video_model 硬默认短路）
- 记忆：`tvc-oneshot-full-2026-09-15.md` — TVC 一镜到底全功能
- 记忆：`prod-91zm-deploy-2026-09-01.md` — 91zm 生产部署全记录

---

## 用户反馈区域

```
用户补充内容：

请在此区域添加对本审计报告的反馈、优先级调整、补充场景等。
例如：
- 是否要拆分 PR（每个阶段一个）
- 是否需要先把任务 2.1 hotfix 到生产（不等全量）
- 是否同意把 Seedance 兜底策略改为"显式提示用户配 key"
- 是否要扩展到 Skills 模板（不只是 TVC）
- 是否需要在审查报告后立即派 sub-agent 执行 P0 修复

---

---

---
```

---

**报告状态**：v1 草案，待用户评审
**预计总工作量**：P0 约 1.5 小时 / P1 约 2 小时 / P2 约 4 小时 / 全量含测试约 10-12 小时
**风险等级**：🔴 中（涉及生产 video 通道一致性，必须分阶段灰度）
**建议路径**：阶段 1 + 2.1（hotfix）→ 灰度生产 → 阶段 2.2/2.3 + 3 → 阶段 4 + 5