# 任务：TVC 一镜到底完整优化（PR1 big bang）

> 规划类型：执行规划 | 创建：2026-09-15 | 状态：待用户批准 | 上游设计：[tvc-oneshot-full-design-2026-09-15.md](memory/tvc-oneshot-full-design-2026-09-15.md)

## 目标

将 TVC "一镜到底"模式从"按钮占位 + 默认多分镜生成"升级为"专业级广告片一体化生成"。一次提交 = 单段 15s 长镜头 + 双参考图（人+物）+ 自动 BGM/ambient + A/B 变体挑选，全部结果在 TvcScriptNode 一个节点卡片里看完成。

## 总工作量

~3800 行（按用户决定"big bang"，单 PR 内 2-3 个 commit 分批 review）

## 实施步骤（按 commit 分组）

### Commit 1 — DB + Service 骨架（后端基础，~1000 行）

| # | 原子操作 | 文件 | 预期结果 |
|---|---------|------|---------|
| 1.1 | `TvcOneShotTemplate` 模型（4 构图 × 3 叙事 = 12 行种子）| `backend/app/models/tvc_one_shot.py` | 字段：id, narrative(enum: display/plot/hybrid), composition(enum: character_object/front_side/merged/clean_bg), name, prompt_template(text), recommended_duration(int), motion_chain(text), bpm_hint(int nullable), is_active(bool), created_at, updated_at |
| 1.2 | `TvcOneShotLog` 模型（A/B 埋点）| 同文件 | 字段：id, template_id(fk), task_id, user_id, narrative, composition, action(enum: generated/shown/downloaded/cancelled), created_at |
| 1.3 | Alembic 迁移（独立非破坏）| `backend/alembic/versions/018_tvc_one_shot_*.py` | 创建 2 张表 + 12 行默认数据 |
| 1.4 | `services/one_shot_prompt.py` 核心：`generate(req)` | 新文件 | 输入：narrative=None(随机), composition=None(随机), subject_desc, object_desc, lighting="golden_hour" → 返回 `{prompt, template_id, narrative, composition, duration, motion_chain, bpm_hint, composition_seed, narrative_seed}` |
| 1.5 | 占位符替换 + 头尾 `static hold 0.5s` 自动追加 | 同上 | 模板字段 `{subject}/{object}/{composition_motion}/{lighting}` → 实际值 |
| 1.6 | 时长自适应（narrative → 12/15/15s，模板 `recommended_duration` 优先）| 同上 | |
| 1.7 | 动作链感知（subject_desc 关键词匹配"model/person"→ human_motion；"bottle/product"→ product_motion；两个都有 → interactive）| 同上 | |
| 1.8 | BPM 节奏提示（模板 `bpm_hint` 字段透出）| 同上 | |
| 1.9 | A/B 多候选支持（`candidate_count: int` 参数，>1 则多次 generate 取不同种子，narrative 相同 + composition 不同）| 同上 | |
| 1.10 | 埋点 hook（每次 generate 写 log: action='generated'）| 同上 | |
| 1.11 | 单测：模板种子完整性 / 占位符替换 / narrative-composition 组合 / 埋点写入 | `tests/unit/test_one_shot_prompt.py` | 12 用例 |

### Commit 2 — tvc_engine 集成 + 提示词优化（后端核心，~500 行）

| # | 原子操作 | 文件 | 预期结果 |
|---|---------|------|---------|
| 2.1 | `_optimize_prompts` 分支：`req.shot_count == 1` → 调 `one_shot_prompt.generate()` | `backend/app/api/v2/tvc_engine.py` | 一镜到底走新路径 |
| 2.2 | 一镜到底模式：`_save_assets` 存 1 张参考图（character-ref），2 张图位时存 2 张（character-ref + object-ref）| 同上 | |
| 2.3 | `optimize_endpoint` (`/api/glm/optimize-prompt`) 提示词二次优化 | `backend/app/api/v2/glm_proxy.py` | 接收 prompt + user_id → 调 GLM 二次润色 → 返回 `{original, optimized, diff}` |
| 2.4 | 集成日志埋点（`tvc_one_shot_logs` action='optimized'）| 同上 | |
| 2.5 | BGM 节拍同步：`/api/v2/tvc-tasks/{id}/recommend-bpm` 后处理 | `backend/app/api/v2/tvc_engine.py` | 视频生成完成后调 ffprobe 提取动作密度 → 推荐 BPM（70/90/120/150） |
| 2.6 | 声音设计：`/api/v2/tvc-tasks/{id}/mix-audio` 后处理 | 同上 | 接受 ambient_urls 数组 + BGM URL → ffmpeg mix → 返回新 URL |
| 2.7 | 单测：分支覆盖 / 二次优化 diff / BPM 推荐 | `tests/unit/test_tvc_one_shot_*.py` | 6 用例 |

### Commit 3 — Admin 后台 + 前端灯笼播放器 + 节点改造（前端+管理端，~2300 行）

| # | 原子操作 | 文件 | 预期结果 |
|---|---------|------|---------|
| 3.1 | 灯笼图位组件（复用人/物两图位）| `src/components/nanoai-workflow/ui/LanternImage.tsx` | props: `subject`, `label`, `value`, `onChange`, `onRemove`, `status`（empty/uploading/done/failed）；CSS：多层 box-shadow + hover translate-y + 选中 ring |
| 3.2 | 视频播放器组件 | `src/components/nanoai-workflow/ui/MiniVideoPlayer.tsx` | props: `src`, `meta`(duration/composition/narrative/seed); HTML5 video + 自定义控件条 + 元数据条 |
| 3.3 | TvcScriptNode 改造 | `src/components/nanoai-workflow/nodes/TvcScriptNode.tsx` | K1（删除按钮）+ K3（双灯笼）+ K2（视频内嵌）+ K4（生成小卡）+ K5（错误重试）+ K8（折叠下游 + 展开按钮）+ 方向 5（优化按钮 + PromptOptimizerDialog） |
| 3.4 | 大图 Modal（K7）| `src/components/nanoai-workflow/ui/ImageLightbox.tsx` | 全屏 + 高清 + "再生成一张"按钮 |
| 3.5 | 提示词优化 Dialog（方向 5）| `src/components/nanoai-workflow/ui/PromptOptimizerDialog.tsx` | 原始 vs 优化后对比 + 接受/拒绝 |
| 3.6 | K8 折叠下游（hidden 节点 + 展开按钮）| `src/stores/nanoaiWorkflowStore.ts` | `params.oneShot === true` 时折叠所有下游节点；UI 按钮切换 |
| 3.7 | Admin 后台：模板 CRUD 页面 | `src/app/admin/tvc-one-shot/page.tsx` | 表格 + 编辑抽屉 + "重置默认" 按钮 + A/B 图表（recharts）|
| 3.8 | Admin Sidebar 入口 | `src/components/admin/AdminSidebar.tsx` | "一镜到底模板" |
| 3.9 | 前端 client | `src/lib/api/tvc-one-shot.ts` | listTemplates/upsert/delete/seedDefault/listLogs/recommendBpm/mixAudio |
| 3.10 | 类型扩展（前端）| `src/lib/api/tvc-api.ts` | `TvcOneShotTemplate` / `TvcOneShotResult` 类型 |

### Commit 4 — 单测 + e2e（测试覆盖，~600 行）

| # | 原子操作 | 文件 | 预期结果 |
|---|---------|------|---------|
| 4.1 | 后端单测：one_shot_prompt 全部覆盖 | `tests/unit/test_one_shot_prompt.py` | 12+ 用例 |
| 4.2 | 后端单测：optimize_prompt + recommend_bpm + mix_audio | `tests/unit/test_*.py` | 6+ 用例 |
| 4.3 | e2e：一镜到底完整链路 | `e2e/tvc-oneshot.spec.ts` | shot_count=1 → 完整跑通 → 视频内嵌 + 2 张参考图 + 资产库 |

### 验收标准

- ✅ 4 构图 × 3 叙事 = 12 默认模板覆盖完整（admin CRUD 可改）
- ✅ 一镜到底模式：shot_count=1 + duration 12/15s 自动选 + 2 张图位 + 头尾 static hold
- ✅ 时长自适应：narrative → display 12s / plot 15s / hybrid 15s
- ✅ 动作链感知：subject_desc 含 "model/product/bottle" 等关键词 → 注入对应 motion 模板
- ✅ BPM 节奏：模板字段 + 出片后 recommend_bpm 接口
- ✅ BGM + ambient 混音：mix_audio 接口可调，输出新视频
- ✅ A/B 多候选：candidate_count=3 → 同种子不同模板产出 3 个变体
- ✅ 提示词优化：LLM 二次润色 + diff 对比 + 接受/拒绝
- ✅ 灯笼图位 + 视频播放器（K-Lite 5 项 UI 改造）
- ✅ K8 折叠下游节点（hidden + 展开按钮）
- ✅ Admin 后台可编辑模板 + 看 A/B 图表
- ✅ e2e 一镜到底流程完整通过

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 单 PR 3800 行过大 | 4 个 commit（commit 1-3 后端/前端各拆 2 段），review 压力分散 |
| 模板组合爆炸（4×3=12 + 4 种 A/B 变体 = 48 路径）| seed 随机 + result 缓存（Redis hash by `(seed+narrative+composition)`）|
| 灯笼视觉 + 播放器组件被复用 | 抽 `LanternImage.tsx` / `MiniVideoPlayer.tsx` 单独文件 |
| K8 折叠影响现有非一镜到底用户 | 默认折叠状态跟随 `params.oneShot`，无感 |
| 现有 2 个产品 bug（之前发现）| 与本 PR 同步修复（计费口径 + UUID 校验）|

## 关联

- 上游设计：[memory/tvc-oneshot-full-design-2026-09-15.md](memory/tvc-oneshot-full-design-2026-09-15.md)
- TVC 链路背景：[[tvc-coverage-e2e-2026-09-15]]
- COS 资产库：[tvc-coverage-e2e-2026-09-15.md 段落]
- 七牛云 GLM：[glm-anthropic-protocol-bug-2026-09-15.md]
- 现有"一镜到底"按钮位置：`src/components/nanoai-workflow/ui/WorkflowPropertiesPanel.tsx:578`
- 计划文档归档路径（完成时）：`.zcf/plan/history/2026-09-15_HHMMSS_one-shot-full-optimization.md`

请批准进入 [模式：执行]？be water 🤙
