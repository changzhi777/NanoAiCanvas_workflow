# BGM 用 MiniMax H3 替代 MiniMax Music — 改造方案

> **作者**: BB小子 🤙
> **目标文件**: `.claude/plan/bgm-h3-migration.md`
> **状态**: 待用户确认后进入实施

---

## 1. 现状定位

### 1.1 MiniMax Music API 已不可用

| 实证信息 | 来源 |
|---|---|
| MiniMax Music API (`api.minimax.cn/v1/music_generation`) 对新用户关闭 | 2026-09-30 实测，status 2153 |
| TVC `step5_bgm` 必走该 API，新部署首次任务必失败 | `tvc_engine.py:881` |
| `app_visibility.py:104` 已将 `minimax_music` 标记为 `disabled` | 历史决策（已禁用节点注册） |

**业务含义**：付费老用户余额仍可继续用，新部署/新账号 100% 失败。

### 1.2 BGM 相关代码位置（精确）

#### 后端

| 文件 | 行号 | 内容 |
|---|---|---|
| `backend/app/api/v2/tvc_engine.py` | **856-913** | `_generate_bgm()` 主函数 — 调 `/music_generation` |
| `backend/app/api/v2/tvc_engine.py` | 788-791 | `_generate_videos()` 内 `asyncio.create_task(_generate_bgm(...))` |
| `backend/app/api/v2/tvc_engine.py` | 951 | 视频循环里 `if st["id"] == "bgm": continue` |
| `backend/app/api/v2/tvc_engine.py` | **965-977** | `_save_assets()` 内收集 BGM → 资产库 `type=audio` |
| `backend/app/api/v2/tvc_config.py` | **60-63** | `DEFAULT_CONFIG.step5_bgm = {model: "music-2.6", is_instrumental: True}` |
| `backend/app/api/v2/tvc_config.py` | 76, 78, 110, 152, 184 | `step5_bgm` schema/validator/转换字段 |
| `backend/app/models/tvc_config.py` | 26 | `step5_bgm = Column(JSONB, nullable=True)` |
| `backend/app/api/v2/app_visibility.py` | 104 | `"minimax_music" → visibility: disabled`（已禁用节点） |
| `backend/app/services/points_service.py` | 58 | `node_type_to_model_type("minimax_music") = "audio"` |
| `backend/tests/unit/test_points_service.py` | 35 | 上述映射的断言测试 |

#### 前端

| 文件 | 行号 | 内容 |
|---|---|---|
| `src/lib/api/tvc-api.ts` | 237 | `bgm_model: params.bgmModel` 提交字段 |
| `src/app/admin/tvc-config/page.tsx` | 43, 52, 61 | `StepConfig` 类型 + 默认值 + tab 标题 "Step 5: BGM" |
| `src/app/admin/tvc-config/page.tsx` | **266-277** | step5_bgm 编辑面板（`prompt_template` + `is_instrumental` 复选框） |
| `src/components/nanoai-workflow/nodes/BackgroundMusicNode.tsx` | 全文 | BGM 工作流节点（已无对应后端能力） |
| `src/components/nanoai-workflow/nodes/MiniMaxMusicNode.tsx` | 全文 | MiniMax Music 节点（已 disabled） |
| `src/components/nanoai-workflow/ui/StoryboardVideoPanel.tsx` | 38-89, 201-216 | BGM 音量/淡入淡出 + `bgm_url` 提交到 FFmpeg |
| `src/components/nanoai-workflow/ui/TvcProjectDetail.tsx` | 192-199 | `<audio src={project.bgm_url} controls>` 播放器 |
| `src/components/nanoai-workflow/ui/VideoChatPanel.tsx` | 33-47, 138-142 | `bgmUrl` 接收，BGM 提示徽章 |

### 1.3 MiniMax H3 视频生成（替代品）

| 项目 | 现状 |
|---|---|
| 入口函数 | `tvc_providers.py:365-405` `_submit_video_minimax(settings, resolution, model)` |
| 提交端点 | `wuyinkeji` 代理：`POST /api/async/video_minimax_h3` |
| 入参 body | `{prompt, first_frame, last_frame?, resolution, duration, ratio}` |
| 视频时长 | `4 ≤ duration ≤ 15`（已 clamp） |
| 当前用途 | 主视频镜头生成（与官方 H3 同通道、计费走速创账户） |
| 排队风险 | 历史实证：656s 超时（`tvc_providers.py:98` 已抬至 600s） |
| 音频 | H3 视频天然带音频轨（prompt 决定氛围），不需要额外 `audio` 入参 |

---

## 2. 改造目标

### 2.1 核心目标

1. **彻底移除 MiniMax Music API 依赖** — 删 `_generate_bgm` 中 `/music_generation` 调用
2. **复用 MiniMax H3 视频通道** — 把 BGM 视为"一段带音频的氛围视频镜头"
3. **保留"独立 BGM 资产"语义** — 在资产库仍标记为 `asset_role="bgm"`（与主视频分离存储）
4. **保留 UI 入口** — 用户可填 BGM 风格 prompt（短描述音乐氛围/节奏/情绪）
5. **后端零新增 API** — 复用现有 step5_video 通道，避免接口扩展

### 2.2 非目标（不做）

- ❌ 不重写 TVC 5 步流水线结构（保留 step1-5 + step6）
- ❌ 不引入新的视频 Provider（仍走速创 H3）
- ❌ 不替换主视频（step5_video 保持不变）
- ❌ 不做 BGM 视频的后处理拼接（FFmpeg 合成暂缓）
- ❌ 不动 `app_visibility.py` 中已 disabled 的 `minimax_music`（已对，无需再改）

---

## 3. 实施步骤

### 阶段 A — 后端核心替换（最小风险路径）

#### A1. 替换 `_generate_bgm` 为 `_generate_h3_bgm`

**文件**: `backend/app/api/v2/tvc_engine.py:856-913`

```python
# 新签名
async def _generate_h3_bgm(task_id, node_idx, subtask, req, settings, config=None):
    """用速创 H3 视频通道生成 BGM 氛围镜头（带音频）"""
    bgm_cfg = (config or {}).get("step5_bgm", {})
    bgm_prompt = bgm_cfg.get("prompt") or req.bgm_prompt or \
        f"TVC广告氛围镜头，{req.mode}风格，{req.total_duration}秒，无对话"
    bgm_duration = min(max(bgm_cfg.get("duration", 5), 4), 15)  # 4-15s

    # 复用 _submit_video_minimax（与主视频同通道，不走 music API）
    submit_fn, _ = get_video_provider("minimax-h3", settings, resolution="768P")

    await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
        "status": "running", "progress": 30,
        "message": "MiniMax H3 生成 BGM 氛围镜头中",
    })

    try:
        # 占位首帧：复用 character_ref 末帧图（场景图），若无则空
        first_frame = await _get_bgm_first_frame(task_id)  # 取 step4 scene-ref
        result = await submit_fn(
            shot_num=0,  # BGM 用 0 占位
            first_url=first_frame,
            last_url="",
            duration=bgm_duration,
            prompt=bgm_prompt,
        )
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "success", "progress": 100,
            "result": {"video_url": result["video_url"], "audio_url": result["video_url"],  # 双标记兼容前端
                       "provider_task_id": result.get("provider_task_id"),
                       "provider": "MiniMax H3"},
        })
    except Exception as e:
        # ... 错误处理同原 _generate_bgm
```

**关键点**:
- 复用 `_submit_video_minimax`（已存在，无需新写 H3 调用）
- `bgm_duration` 默认 5s（待用户确认，见 §5 决策点 #1）
- 输出字段保留 `audio_url`（兼容前端 `<audio>` 播放器）+ 加 `video_url`（双语义）
- 第一帧图复用 step4 的 `scene-ref` 图（保持视觉一致性，无则空串走 H3 prompt-only 模式）

#### A2. 更新 `_generate_videos` 调用名

**文件**: `backend/app/api/v2/tvc_engine.py:791`

```diff
- bgm_task = asyncio.create_task(_generate_bgm(task_id, node_idx, bgm_subtask, req, settings, config))
+ bgm_task = asyncio.create_task(_generate_h3_bgm(task_id, node_idx, bgm_subtask, req, settings, config))
```

#### A3. 扩展 `step5_bgm` 配置结构

**文件**: `backend/app/api/v2/tvc_config.py:60-63`

```python
# 新默认值
"step5_bgm": {
    "provider": "minimax-h3",          # 视频通道（与 step5_video 同源）
    "duration": 5,                     # 4-15s
    "prompt": "",                      # 用户自定义 prompt（可空，空则用 req 推断）
    # 移除字段: model=music-2.6, is_instrumental（H3 视频无此概念）
},
```

**迁移兼容**: 旧的 `{model: "music-2.6", is_instrumental}` 数据在 `_config_to_dict` 解析时忽略未知字段，无需数据迁移。

#### A4. 修复 `_save_assets` 类型

**文件**: `backend/app/api/v2/tvc_engine.py:965-977`

```diff
- "type": "audio",
- "name": f"TVC_BGM_{task_id}",
+ "type": "video",  # 改为 video（BGM 现在是带音频的视频）
+ "name": f"TVC_BGM_{task_id}",
  "meta": {
      "source": "tvc_workflow",
      "task_id": task_id,
      "asset_role": "bgm",  # 保留 role 区分
      "provider": "MiniMax H3",  # 新增
  },
```

> 决策点 #2（§5）影响此字段。若选"保持 audio 类型"，保留原样。

#### A5. 调整积分计价（关键）

**文件**: `backend/app/services/points_service.py:58`

```diff
- "minimax_music": "audio",
+ # minimax_music 已废弃；BGM 现归入 MiniMax H3 视频通道
+ # 由 step5_video 计价（H3 视频档位），不再单独计价
```

> 若保留 `minimax_music → audio` 字段不影响（前台节点已 disabled），但需在文档标注 deprecated。

---

### 阶段 B — 前端 UI 改造

#### B1. 后台管理面板

**文件**: `src/app/admin/tvc-config/page.tsx:266-277`

替换 step5_bgm 编辑面板为：
- **provider** 下拉（暂只 `minimax-h3`，后续可加）
- **duration** 数字输入（4-15）
- **prompt** textarea（用户填 BGM 风格 prompt，**新增字段**）

移除 `is_instrumental` 复选框（H3 视频无此概念）。

#### B2. 主提交参数（暂不动）

**文件**: `src/lib/api/tvc-api.ts:237`

`bgm_model` 字段已对后端无意义（新后端不读 `req.bgm_model`），但保留兼容性。可在 PR 中加注释 `// deprecated, see step5_bgm config`。

#### B3. 前端 BGM 播放器（保留兼容性）

**文件**: `src/components/nanoai-workflow/ui/TvcProjectDetail.tsx:192-199`

```diff
- <audio src={project.bgm_url} controls className="w-full h-8" />
+ <video src={project.bgm_url} controls muted className="w-full h-8" />
```

> 决策点 #2 影响：选"保持 audio 类型"则保留 `<audio>`。

#### B4. 工作流 BGM 节点

**文件**: `src/components/nanoai-workflow/nodes/BackgroundMusicNode.tsx`

保留节点但加 deprecated 提示：
- 不再显示 MiniMax Music 模型选择
- 节点仍可显示 `bgm_url` 输出（视频播放器）

**文件**: `src/components/nanoai-workflow/nodes/MiniMaxMusicNode.tsx`

保持现有 `disabled` 状态（`app_visibility.py:104` 已禁用），不动。

---

### 阶段 C — 测试与文档

#### C1. 单元测试

| 文件 | 测试 |
|---|---|
| `backend/tests/unit/test_tvc_engine.py` | 新增 `test_generate_h3_bgm_*`：mock `_submit_video_minimax`，验证 prompt/duration 透传、错误处理、result.audio_url/video_url 双字段 |
| `backend/tests/unit/test_tvc_engine.py` | 旧 `test_generate_bgm_*` 改为 `test_generate_h3_bgm_*` 或直接 rename |
| `backend/tests/unit/test_points_service.py:35` | 移除 `assert node_type_to_model_type("minimax_music") == "audio"`（A5 改了），改测新路径 |

#### C2. E2E

| 流程 | 验证 |
|---|---|
| 一镜到底 6 镜头 + BGM | 总时长增加 30-90s（H3 排队），6 镜头视频正常，BGM 视频成功生成，资产库有 `asset_role=bgm` 条目 |
| 后台管理保存 step5_bgm | 字段正确写入 DB，重新加载一致 |
| 旧配置兼容 | DB 中旧 `step5_bgm={model:music-2.6, is_instrumental:true}` 仍能加载（被忽略未知字段） |

#### C3. CLAUDE.md 更新

| 文件 | 章节 |
|---|---|
| `backend/app/api/v2/CLAUDE.md` | tvc_engine.py 模块说明：5 步流水线第 5 步改为"H3 BGM 氛围镜头" |
| `backend/app/services/CLAUDE.md` | points_service 移除 minimax_music 描述 |
| `src/lib/api/CLAUDE.md` | tvc-api.ts 标注 `bgm_model` deprecated |
| `src/app/CLAUDE.md` | tvc-config 页面标注 step5_bgm 新字段 |

---

## 4. 实施顺序

按依赖排序（**关键路径**）：

```
A1 (替换 _generate_bgm)  ← 起点
  ↓
A2 (更新调用名)
  ↓
A3 (扩展 step5_bgm schema)  ← A1 需读取新字段
  ↓
A4 (改 _save_assets 类型)   ← 可与 A3 并行
  ↓
A5 (points_service 调整)   ← 独立，可与 A3 并行
  ↓
B1 (后台管理面板)            ← A3 必须先完成（schema 决定 UI 字段）
  ↓
B3 (TvcProjectDetail 播放器) ← A4 必须先完成（资产类型决定 UI）
  ↓
C1 (单测) → C2 (E2E) → C3 (CLAUDE.md)
```

**依赖警告**：
- A1 → A2 是同文件改动，**必须同一 commit**
- A1 → A3 跨文件，可分两个 commit（先 A3 schema 再 A1 逻辑，避免运行时字段缺失）
- B 类（前端）依赖 A 类（后端）完成后才能联调

---

## 5. 关键决策点（待用户确认）

> **建议用户先回答以下问题，再进入实施**

### 决策点 #1：BGM 时长策略

- **方案 A**：固定 5s（默认）
  - 优点：H3 排队最快（10-30s），积分消耗低
  - 缺点：与主视频时长不匹配，对齐需要循环播放
- **方案 B**：跟主视频同 `total_duration`（如 15s）
  - 优点：可一次性铺底，时长自然
  - 缺点：H3 排队 60-120s，单价翻倍
- **方案 C**：用户自定义（4-15s 可调）
  - 优点：灵活
  - 缺点：增加 UI 字段 + 用户决策成本

**推荐**：A（默认 5s，循环播放由前端播放器处理）

### 决策点 #2：BGM 资产类型与播放器

- **方案 X**：`type=audio` + `<audio>` 播放器（保持现状）
  - 优点：前端零改动（播放器兼容 video→audio）
  - 缺点：语义不准（实际是视频文件，浏览器可能拒绝纯 audio 标签播放 mp4）
- **方案 Y**：`type=video` + `<video muted>` 播放器
  - 优点：语义准
  - 缺点：前端 TvcProjectDetail.tsx 改播放器 + asset_library 筛选条件（若有 `type=audio` 的过滤）

**推荐**：Y（语义正确，浏览器对 mp4+h264 在 `<video muted>` 下稳定）

### 决策点 #3：BGM prompt 来源

- **方案 α**：仅读 `step5_bgm.prompt` 配置（管理员预设模板）
  - 优点：用户操作简单
  - 缺点：用户无法自定义
- **方案 β**：仅读 `req.bgm_prompt`（用户在主提交表单填）
  - 优点：用户自由
  - 缺点：主表单加字段
- **方案 γ**：优先级 `step5_bgm.prompt` > `req.bgm_prompt` > 模板推断
  - 优点：三层兜底
  - 缺点：逻辑稍复杂

**推荐**：γ（与现有 `step5_video.prompt_optimizer` 风格一致）

### 决策点 #4：BGM 是否计入 step6 资产库

- **是**：保留 `asset_role="bgm"` 字段，资产库可见（与现状一致）
- **否**：仅作为合成素材，不入库（节省空间）

**推荐**：是（现状不变，风险最小）

### 决策点 #5：旧 BGM 节点（BackgroundMusicNode / MiniMaxMusicNode）保留？

- **保留**：节点仍可显示输出 URL（视频播放器），但不再触发生成
- **隐藏**：从节点面板移除，但模板中已使用的实例仍可见

**推荐**：保留 + 加 deprecated 提示（最小影响用户现有画布）

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 新建 TVC 任务，一镜到底 6 镜头 + BGM 完整跑通
- [ ] BGM 视频成功生成（在资产库可见 `asset_role=bgm`）
- [ ] 后台管理保存 step5_bgm 三个字段（provider/duration/prompt）正常
- [ ] 旧 step5_bgm 配置（`{model:music-2.6, is_instrumental}`）仍能加载
- [ ] `req.bgm_model` 参数后端不再依赖（保留兼容性）
- [ ] 前端 BGM 播放器（`<video muted>`）可正常播放

### 6.2 测试验收

- [ ] `pytest tests/unit/test_tvc_engine.py` 全过
- [ ] `pytest tests/unit/test_points_service.py` 全过（旧断言已移除）
- [ ] `pnpm test` 全过（前端无新增测试，可不改）
- [ ] E2E：一镜到底 + BGM 全链路成功

### 6.3 文档验收

- [ ] `backend/app/api/v2/CLAUDE.md` 更新 tvc_engine 模块说明
- [ ] `backend/app/services/CLAUDE.md` 标注 minimax_music deprecated
- [ ] 根 `CLAUDE.md` changelog 增一条记录

---

## 7. 风险与缓解

### 风险 1：H3 后端排队导致 BGM 步骤长时间等待

**描述**：H3 视频生成历史最慢 656s（`tvc_providers.py:98`），BGM 步骤会让总任务时长再增加 1-10 分钟。

**缓解**：
- BGM 默认 5s 时长（决策点 #1 推荐 A）
- `_generate_h3_bgm` 复用 `_poll_wuyin_video` 的 `max_wait=600`（已抬至）
- 任务超时不影响主视频结果（BGM 失败 status=error，主视频照常成功）
- 前端 SSE 进度推送已显示"排队中"提示（沿用现有文案）

### 风险 2：移除 `_generate_bgm` 影响老用户数据

**描述**：`_save_assets` 中 audio 类型资产不再生成（决策点 #2 选 Y 后），老 TVC 任务中的 BGM 资产类型不变（历史数据），但新任务不再产生 audio 资产。

**缓解**：
- 资产表无 schema 变更，仅 `meta.asset_role` 不变
- 历史 `type=audio` 资产仍可访问、播放（前端不强制过滤）
- 文档标注"未来 BGM 资产为 type=video"

### 风险 3：移除 `model=music-2.6` 配置后，admin 页面崩溃

**描述**：`src/app/admin/tvc-config/page.tsx:266-277` 当前读 `config.prompt_template` 和 `config.is_instrumental`，移除字段后页面可能渲染空白。

**缓解**：
- B1 同步移除两个旧字段读取，改为新三字段（provider/duration/prompt）
- DEFAULT_CONFIG 同步更新（保持默认值始终存在）

### 风险 4：BGM prompt 注入风险

**描述**：用户填的 BGM prompt 直接传给 H3，可能触发 MiniMax 内容审核拦截，导致 BGM 失败但主视频成功（用户体验割裂）。

**缓解**：
- 后端 prompt 模板加前缀"TVC广告氛围镜头，无对话、无人物特写"（减少敏感触发）
- BGM 失败不影响主视频状态（沿用现有错误处理）
- SSE 进度条明确显示 BGM 失败原因

### 风险 5：积分扣减不一致

**描述**：当前 `points_service.py:58` 中 `minimax_music → audio` 计价未走视频档位，新方案 BGM 走 H3 视频档位，可能积分消耗变化。

**缓解**：
- 后端 BGM 走 `step5_video` 同 H3 计价逻辑（复用 `submit_fn`，自动一致）
- 测试验证前后积分扣减变化范围

### 风险 6：跨 commit 部署风险

**描述**：若分多个 commit 部署（先 A3 schema 再 A1 逻辑），中间状态可能让 step5_bgm 配置保存异常。

**缓解**：
- 建议**单 commit** 部署 A1+A2+A3+A4+A5（后端原子化）
- 前端 B 类可独立部署

---

## 8. 变更影响清单（预估）

### 代码变更

| 文件 | 改动量 |
|---|---|
| `backend/app/api/v2/tvc_engine.py` | ~80 行（_generate_bgm 替换 + A4 _save_assets） |
| `backend/app/api/v2/tvc_config.py` | ~5 行（DEFAULT_CONFIG + 字段移除） |
| `backend/app/services/points_service.py` | ~1 行（注释 + 移除 mapping） |
| `src/app/admin/tvc-config/page.tsx` | ~15 行（step5_bgm 编辑面板） |
| `src/components/nanoai-workflow/ui/TvcProjectDetail.tsx` | ~3 行（播放器改 video） |
| 测试 + CLAUDE.md | ~50 行 |

**总变更**：~150 行代码 + ~100 行测试/文档

### 数据库变更

**无**。`step5_bgm` 字段类型为 `JSONB`，新增字段无需迁移；旧字段在 `_config_to_dict` 解析时被忽略。

### 兼容性

| 维度 | 兼容性 |
|---|---|
| 旧 step5_bgm 配置 | ✅ 兼容（忽略未知字段） |
| 旧 TVC 任务（已完成） | ✅ 不影响（资产类型不变） |
| 旧 `_generate_bgm` 调用 | ❌ 必须替换（移除 music API 依赖后函数不存在） |
| 旧 `req.bgm_model` 字段 | ✅ 保留（前端不再传，后端忽略） |
| 旧 `BackgroundMusicNode` 实例 | ✅ 保留（仅显示，不触发） |

---

## 9. 等待用户输入

> 实施前需要用户确认 §5 的 5 个决策点：

```
[ ] 决策点 #1：BGM 时长（推荐 A：固定 5s）
[ ] 决策点 #2：资产类型与播放器（推荐 Y：video + <video muted>）
[ ] 决策点 #3：prompt 来源（推荐 γ：三层优先级）
[ ] 决策点 #4：是否入库（推荐 是）
[ ] 决策点 #5：旧 BGM 节点保留（推荐 保留 + deprecated）
```

请用户在确认后回复，BB小子立即开干 🤙