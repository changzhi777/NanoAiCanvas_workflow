# KFC TVC 验收标准审查闸 — 执行计划（方案 2：旁挂服务）

> 状态：待用户批准
> 日期：2026-10-02
> 前置研究：`kfc-tvc-acceptance-gate-research.md`（10 项决策 + 实测结论 + 前端审查 21 项）
> 架构：审查独立模块旁挂，引擎两时机点调用，审查失败降级 unverified 不拖主链

## 里程碑总览

| 里程碑 | 内容 | 预估 |
|--------|------|------|
| M1 | 后端基础：数据模型 + 迁移 + 审查服务核心 + 单测 | ~350 行 |
| M2 | 飞书导入 + API + 引擎插桩 + 计费 + 单测 | ~350 行 |
| M3 | 前端：API client + 导入 UI + 报告卡 + 重做交互 | ~400 行 |
| M4 | 竖屏链路 + P0 五修复 | ~300 行 |
| M5 | E2E 验证：真实 Brief 全链跑通 | 验证 |

---

## M1 后端基础

### 1.1 数据模型 `backend/app/models/tvc_acceptance.py`（新文件）

```python
class TvcAcceptanceTemplate(Base):
    __tablename__ = "tvc_acceptance_templates"
    id: UUID pk
    customer_code: str(64) unique indexed   # "kfc"
    name: str(128)                          # "KFC 吃货哥 IP 系列"
    aspect_ratio: str(8) = "9:16"
    duration_sec: int = 15
    criteria: JSON                          # 标准项数组（见 1.2 schema）
    is_active: bool = True
    created_at / updated_at

class TvcAcceptanceReport(Base):
    __tablename__ = "tvc_acceptance_reports"
    id: UUID pk
    task_id: str(64) indexed                # 关联 tvc task
    template_id: UUID nullable              # 快照冗余 template_snapshot JSON 防模板变更
    gate: str(16)                           # "script" | "final"
    status: str(16)                         # passed | failed | unverified
    score: int                              # 0-100（分级加权）
    veto_hit: JSON                          # 命中否决项 key 列表
    items: JSON                             # 逐项结果（见 1.3）
    conflicts_top: JSON                     # 前 3 冲突点摘要
    redo_count: int = 0                     # 重做计数（上限 3）
    decision: str(16) nullable              # accepted | redo_done（用户动作）
    model_meta: JSON                        # 审查模型/token/耗时
    created_at
```

### 1.2 criteria 标准项 schema（14 维度映射）

```json
[{
  "key": "aspect_ratio",            // 唯一键
  "label": "画面比例 9:16",
  "category": "rule_hard",          // rule_hard | rule_content | llm_content | llm_visual | archive
  "weight": 10,
  "veto": true,                     // 一票否决
  "rule": {"type": "aspect_ratio", "expect": "9:16"},   // rule_* 必填
  "prompt_hint": null               // llm_* 必填：审查提示要点
}]
```

KFC 默认 14 项（导入飞书 Brief 时自动生成，可 admin 编辑）：
- rule_hard：aspect_ratio(9:16, veto)、duration(15±2s, veto)
- rule_content：price_hit（Brief 价格数字在脚本/花字命中）、product_name_hit（产品全称命中）
- llm_content：slogan_fidelity、offer_mechanism（活动机制）、must_elements（必现元素）、ending_norm（结尾 KV/海报规范）、copy_fidelity（指定文案忠实度）
- llm_visual：ip_consistency（IP 形象 vs 参照图，veto——"不要改动任何面部衣物细节"）、product_fidelity（产品还原 vs 产品 KV，veto——"颜色材质不能变形"）、scene_mood（场景氛围/品牌色调）
- archive：delivery_date、progress_status

### 1.3 报告 items schema

```json
[{
  "key": "ip_consistency",
  "label": "IP 形象一致性",
  "pass": false,
  "weight": 10, "veto": true,
  "conflict": "主角面部特征与参照图不一致（眼睛比例偏差）",
  "standard_ref": "ip主角出镜，不要改动任何面部、衣物等细节",   // Brief 原文
  "actual": "抽帧 #2/#4 中主角眼睛明显大于参照图",
  "advice": "重新生成参考图或提高 IP 参照权重后重做视频步骤"
}]
```

### 1.4 审查服务 `backend/app/services/acceptance.py`（新文件，核心）

函数清单：
- `async run_script_gate(task_id, parsed_script: dict, template: dict) -> report_dict`
  - 规则层：`_rule_check(criteria, context)` 纯函数——产品名/价格在脚本文本字段命中、时长字段比对
  - LLM 层：`_llm_content_review(criteria, script_json, brief_ctx)`——glm-5.3（`_glm_chat` 复用）输出 JSON 报告（逐项 pass/conflict/advice），内置 JSON 修复
  - 汇总：`_compute_score(items)`——veto 命中 → score 直接压至 ≤20 并标 failed；否则 Σ(pass×weight)/Σweight×100
- `async run_final_gate(task_id, video_url, script, template, ref_images) -> report_dict`
  - ffprobe 分辨率/时长（容器 ffmpeg，复用 video_thumbnail 服务的调用模式）
  - 抽帧：`_extract_frames(video_url, n=6)`——均匀抽 6 帧 base64
  - 视觉层：`_m3_visual_review(frames, ref_images, criteria)`——M3 Anthropic 端点（复用 tvc_engine `_describe_image` 的调用骨架抽出公共 helper `_minimax_anthropic_chat`），参照图+帧+标准 → 逐项 JSON
  - 合并规则层+LLM 文本层 → 最终报告
- 降级：任何模型调用失败 → 该 gate 报告 status=unverified（items 留空，conflicts_top 提示"审查服务暂不可用"），不抛异常

### 1.5 alembic 迁移 `backend/alembic/versions/019_tvc_acceptance.py`

- 建两张表 + KFC 模板种子（criteria 从研究文档 14 项生成 DEFAULT_KFC_TEMPLATE）
- down_revision = 018

### 1.6 单测 `backend/tests/unit/test_acceptance.py`

- 规则引擎 6 例（比例/时长/价格命中/产品名命中/否决触发/权重计算）
- score 计算 3 例（全过/veto 压分/加权平均）
- LLM mock 3 例（正常 JSON/坏 JSON 修复/失败降级 unverified）

---

## M2 飞书导入 + API + 引擎插桩 + 计费

### 2.1 飞书抓取解析 `backend/app/services/feishu_brief.py`（新文件）

- `async fetch_bitable(share_url: str) -> dict`：
  - 解析 URL 提取 base token / table / view 参数
  - httpx GET `{host}/space/api/v1/bitable/{token}/clientvars?...`（研究文档已验证参数集，匿名可访问）
  - `gzip.decompress(base64.b64decode(data["table"]))` 解压 → fieldMap/recordMap
- `def parse_brief(rows, fields) -> BriefBundle`：
  - 转置表还原：`文本` 列 = 维度名 → 标准维度映射表（本期主题/人物形象/故事背景/文案内容/情节描述/必现信息/画面比例/视频类型/素材链接/交付日期…）
  - 输出：`{base_name, items: [{column: "第一条", theme, criteria_fields: {...}}]}`
- `def to_template_criteria(brief_item) -> criteria[]`：维度值 → 1.2 schema（产品名/价格正则提取、必现元素拆分、IP 细节冻结自动 veto）

### 2.2 API `backend/app/api/v2/tvc_acceptance.py`（新文件）

| 路由 | 功能 |
|------|------|
| `POST /v2/tvc-acceptance/import-feishu` | body `{share_url}` → 抓取解析返回 BriefBundle（不落库，预览用） |
| `POST /v2/tvc-acceptance/templates/from-brief` | body `{bundle_item, customer_code}` → upsert 模板（含 criteria 生成） |
| `GET/PUT/DELETE /v2/tvc-acceptance/templates[/{id}]` | 模板 CRUD（admin 权重编辑） |
| `GET /v2/tvc-acceptance/reports?task_id=` | 查报告（script/final） |
| `POST /v2/tvc-acceptance/reports/{id}/decision` | body `{action: accept|redo, from_step?}` → 接受标记 / 触发重做 |
| `GET /v2/tvc-acceptance/reports/{id}/export` | 导出客户版（正式措辞 markdown/HTML） |
- main.py 注册路由

### 2.3 引擎插桩 `backend/app/api/v2/tvc_engine.py`（~40 行）

- 提交参数扩展：SubmitRequest 加 `acceptance_template_id: Optional[UUID]`（workflow_tasks.py 同步透传）
- step1（剧本）完成后：若带模板 → 同步 `await run_script_gate(...)`（文本审查 ~15s 可接受），结果写 state.nodes 新节点 `step-review-script`（SSE 天然推送）
- 任务 completed 写入后：`asyncio.create_task(run_final_gate(...))` 异步成片闸；完成后写 state.nodes `step-review-final` + Redis pub 推送 review 完成事件
- 审查计费：任务提交时带模板 → 随任务预扣 acceptance 档积分；unverified 自动退

### 2.4 单步重做 `workflow_tasks.py` 新端点

- `POST /tvc-tasks/{id}/redo` body `{from_step: "images"|"video"|"full", one_shot_seed?}`
- 实现：从 Redis state 取上次 parsed_script/参考图 URL → 构造部分执行（复用引擎 step4/step5 函数）→ 正常计费 → redo_count+1（上限 3，超限 409）
- **风险预案**：若引擎 state 结构不支持部分恢复 → 降级实现「复用脚本+seed 全链重提」（扣除已验证步骤差异计费），计划评审时二选一

### 2.5 计费 `points_service.py`

- 新增 `"acceptance_review"` 档：双闸包固定积分（初值 5，PRICES 可配）
- 单测补 acceptance 档用例

### 2.6 M2 单测

- feishu_brief：转置解析 3 例（用研究文档 data/ 真实 JSON fixture）+ criteria 生成 3 例
- API：import/模板 CRUD/report 查询/decision 5 例

---

## M3 前端

### 3.1 API client `src/lib/api/tvc-acceptance-api.ts`（新文件）

- importFeishu / templates CRUD / getReports / decide / exportClient 版方法 + 类型定义

### 3.2 Brief 导入 UI（TvcScriptNode 扩展）

- 输入区上方加「导入飞书 Brief」按钮（Wand2 图标复用）
- 点击弹 ImportBriefDialog（新组件）：贴链接 → 拉取解析 → 显示节内条目列表（第一条~第N条 + 主题）→ 选条目 → 预览生成的标准集（14 项表格）→ 确认关联（存 params.acceptanceTemplateId + 节点显示关联徽标）

### 3.3 报告卡 `src/components/nanoai-workflow/ui/AcceptanceReportCard.tsx`（新组件）

- 挂载：TvcScriptNode 完成态（MiniVideoPlayer 下方）+ SSE review 事件触发刷新
- 视觉：环形百分比（≥85 绿 / 60-84 黄 / <60 红，veto 命中强制红）+ 状态徽标（passed/failed/unverified）
- 冲突点列表：每项 = 标准原文 vs 实际对比 + LLM 建议（折叠展开，参考 TvcExecutionPanel NodeCard 动效）
- 按钮组：`接受`（绿，调 decision accept）/ `单步重做`（橙，弹出步骤选择 images|video|full → 调 redo）/ `导出客户版`（下载 markdown）
- redo_count 徽标（0/3）

### 3.4 积分预估联动

- tvc-cascade `calcTvcParams` 修 P1（bgm 20 分、按模型参数、一镜到底 shotCount=1 直算）+ 带 acceptance +5 分显示

---

## M4 竖屏链路 + P0 五修复

### 4.1 竖屏（标准集驱动）

- 后端：`_gen_one_gpt_image_25_flare` aspect_ratio 参数化（从 req/config 读，默认 16:9 保持兼容，带 acceptance 模板时用模板 aspect_ratio）；`_submit_video_minimax` ratio 同理
- 前端：MiniVideoPlayer `aspect-video` → 动态（onLoadedMetadata 读 videoWidth/Height 切 aspect-[9/16]）
- 资产库/项目详情竖屏展示 object-contain 适配（TvcProjectDetail video max-h 限制）

### 4.2 P0 五修复

1. **productImage/referenceImage 传链**：SubmitRequest 加 `product_image`；useTvcExecution submitParams 传 `referenceImage/productImage`；引擎生图 ref_url 消费 product_image（产品参照图注入）
2. **PromptOptimizerDialog 入口恢复**：TvcScriptNode 输入区右上角挂 Wand2 按钮（已有死 import 复活）
3. **BGM unmuted**：TvcProjectDetail `<video controls>`（去 muted）
4. **localStorage 防爆**：nanoaiWorkflowStore partialize 剔除 params.referenceImage/productImage base64 字段（序列化前 strip，加载时保留运行时值不受影响——图改存 URL 引用走资产上传为后续优化）
5. **cancel 文案**：改「终止后将按已完成步骤退款」

### 4.3 P1 顺手修（M4 一并）

- fallback glm-5.1 → glm-5.3；M2.7 → M3；analyzeProductReference 前端模型参数去死（后端已迁 M3）
- SSE 断连降级：onError 后起 `setInterval` 轮询 getTaskStatus（30s）至终态
- quality 下拉移除或接通（移除，YAGNI）

---

## M5 E2E 验证

1. 部署（git push → 服务器 pull → build --no-cache → 迁移 → 容器 grep 特征串验证 + /health）
2. 真实链路：导入第七节 Brief（三体）→ 关联任务 → 一镜到底提交（9:16）→ 剧本闸报告 → 成片闸报告（含 IP 视觉审查）→ 重做一次 video → 接受 → 导出客户版
3. 回归：251+ 单测全过、多分镜链不受影响、无模板任务零变化
4. MiniMax 审查 key 部署到 .env（`MINIMAX_API_KEY` 若与现有官方 key 冲突则新键 `MINIMAX_REVIEW_API_KEY`）

## 风险清单

| 风险 | 应对 |
|------|------|
| 引擎 state 不支持单步恢复 | redo 降级为复用脚本+seed 全链重提（2.4 预案） |
| M3 审查 token 波动（长 Brief） | prompt 压缩：Brief 标准集只送 criteria 相关字段，帧图 6 张上限 |
| 飞书匿名链接失效 | import 接口友好报错 + 支持手动贴标准 JSON 兜底 |
| 审查误判（LLM 假阳性） | 所有 veto 项报告标注「建议人工复核」；decision 永远用户手点 |
