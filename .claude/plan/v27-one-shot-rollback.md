# V27 H3 多锚点精确控制提示词优化

> **状态**：📋 审查优化（重写为 H3 提示词工程规范，多锚点精确控制，零冗余）
> **来源**：V19 成功链路（字幕同步 1:1）+ V26 三幕结构（首尾固定/中间可变）+ 用户"优化H3提示词脚本，多锚点精确控制"
> **核心**：不简化脚本；反向强化 H3 prompt，使每个锚点可被 H3 精确解析执行

---

## 0. 目标：V19 待办 + 全能力 H3，单次直出

- **无后期合成**：不拼接/不烧录/不转码，直接取 H3 产物
- **H3 全能力**：原生配音（`<d>[Chinese]`）+ 原生字幕（`on-screen text`）+ 原生 BGM（`non_diegetic_music`）+ 原生环境音（`overall_soundscape`）+ 尾帧融合（`last_frame`）+ 分镜时间轴（`[Shot N]`）
- **多锚点**：每一帧的 人物/场景/光线/运镜/字幕/双语 都显式锚定，H3 无自由发挥空间

---

## 1. 链路参数（V19 验证过，零代码改动）

| 参数 | 值 | 说明 |
|------|-----|------|
| shot_count | **1** | 一镜到底，单次 H3 生成 |
| duration | 15 / 15 | H3 最长档（实测 15.08s） |
| aspect_ratio | 9:16 | 768×1376 |
| image_model | gpt-image-2 | character-ref + scene-ref 双参考图 |
| video_model | MiniMax-H3（速创） | prompt 直传 Schema |
| optimize_mode | tvc_deep | GLM-5.3 thinking + DS4 dialogue_timeline |
| voice | male / male-elite | H3 原生男声精英 |
| TVC_H3_SCHEMA_PROMPT | True | Schema 编译主控 |
| TVC_SUBTITLE_BURN | False | H3 原生字幕（V19 效果） |
| last_frame_url | **COS KV 图** | 尾帧融合 → 用户宣传页 |

**依赖**：prompt 必须用 `[镜头N]` 标记（引擎正则 `_re.split(r"\[镜头(\d)\]"` 提取 story_shots），**不用"第一段"式软指令**（V26B 教训）。

---

## 2. H3 Schema 三字段结构（编译器输出，多锚点全展开）

```
integrated_multimodal_description: <[Shot N] 时间轴 + 视觉 + 配音 + on-screen 字幕>
overall_soundscape:                <实验室环境音（需从餐厅模板改 ⚠️）>
non_diegetic_music:                <BGM prompt>
```

### 2.1 多锚点精确控制组装（每个 [Shot N] 段落）

每条镜头段（`h3_prompt.py` 多镜分支）= 6 个锚点的精确指令叠层：

| # | 锚点 | 编译器注入 | 控制精度 |
|---|------|-----------|---------|
| A | **人物** | `character_desc` + `(S1)` 音色 → 主体描述 | 是谁 / 什么长相 / 什么嗓音 |
| B | **场景** | `scene_desc` → 环境 + 道具 | 在哪 / 有什么设备 |
| C | **光线** | `light_style` → H3 光线词汇 | 冷色显示屏光 etc |
| D | **运镜** | `camera_movement` → H3 运镜词汇 | 推/移/绕/固定 |
| E | **台词** | `<d>[Chinese] {line} </d>` + 唇闭 | 谁说 / 说什么 |
| F | **字幕** | `with on-screen text reading "{line}"` | 显示什么 |

**叠加规则**：段落 = `[Shot N] (t0 to t1)[ At t0, cuts to] {B场景} {A人物} {C光线} {D运镜} {E配音} {F字幕}`

### 2.2 时间轴锚定

- `[Shot N] (00:XX.XXX to 00:YY.YYY)` 硬时间窗（delta 由 compiler 精确算）
- `At 00:XX.ZZZ, the shot cuts to` 切点协议
- 每镜头唯一 `line`（一镜一句 ≤16 字）→ 既是 `<d>` 配音源又是字幕源

### 2.3 未用锚点（本次不启用）

- ⛔ `extra` 关键词（会让 H3 改写对白 → V7 教训，不写）
- ⛔ "synchronized subtitles" 修饰词（会触发 H3 改对白）

---

## 3. 片内时间轴（三幕，首尾固定）

| 幕 | 时间窗 | 内容 | 台词 | 锚点侧重 |
|----|--------|------|------|---------|
| 镜头1 | 0-4s | 实验室控制台纵深开场 | 有人研究宇宙，有人探索未知……（13字/3.71s） | 场景B+人物A 锁定人设与场合 |
| 镜头2 | 4-12s | 人不出画，屏切全息星图（V27A 默认；B/C/D衍生） | 而我，只想知道今天，肯德基x三体宇宙（17字/4.86s） | 运镜D 推近 + 场景B 屏上星图 |
| KV | 12-15s | H3 尾帧融合 → 用户"天生翅粉宇宙同频"宣传页 | 探索美味新宇宙（7字/2s） | 尾帧锚定（见 §5） |

> 台词全规整在前 12s（DS4 "末句 ≤12s" 规则天然适配）；12-15s KV 定格含 1 句字幕 + 2s 纯 KV。

---

## 4. H3 prompt 针对性优化点（预执行审计）

### 4.1 `h3_prompt.py` — soundscape 改实验室模板 ⚠️ 必改

**现状**：
```python
soundscape = "Soft restaurant ambience continues underneath with light kitchen sounds. A crisp bite and gentle packaging rustle..."
```
**问题**：餐厅环境音（厨房声/包装声）不贴合天体物理实验室，第二幕/产品段"咬一口+包装"是 KFC 快餐 B-roll，非实验室叙事。

**优化**：soundscape 改为**实验室声景模板**，并随镜头段动态推导：
```python
soundscape = (
  "Quiet research-laboratory ambience: low computer hum, soft keyboard clatter, "
  "occasional faint equipment beeps, air-conditioning hiss."
)
```
（场景在下文 §4.3 通过引擎 `step5_bgm.prompt` 二次保证。）

### 4.2 `h3_prompt.py` — 人设锚点显式化（防 V25"像 KFC 员工"）

在 `character_desc` 前预埋身份锚，防止 H3 把研究员画成服务员：
```python
"{character_desc}. He is an astrophysics researcher at a research institute, "
"NOT a restaurant employee; no uniform, no restaurant setting."
```
＋ 全局负约束注入（见 §4.3 引擎层"双层禁令"）。

### 4.3 引擎层（tvc_engine.py）— 脚本级多锚点注入

在 `_optimize_prompts` / `_breakdown_shots` 组装阶段注入 4 组精确锚点（不改引擎主流程，只在 prompt 构建段增强）：

| 锚点组 | 注入内容 |
|--------|---------|
| G1 全局负约束 | 一二幕禁：KFC门店/Logo/包装桶/鸡翅/价格/工服/窗户/书架/台灯；仅 KV 收尾允许品牌 |
| G2 场景正锚 | 必含：弧形多屏控制台/星图/数据流/信号波形/辐射警告标志/仪表盘/全息投影/线缆/发光按钮 |
| G3 字幕样式 | 底部斜切角45° HUD/蓝发光描边/白色粗体/半透明深蓝底/一镜一句/禁顶部文字框 |
| G4 soundscape 覆盖 | `step5_bgm.prompt` 传实验室环境音（而非餐厅默认） |

### 4.4 `srt_generator.py` / `_burn_subtitles_step`

- `TVC_SUBTITLE_BURN=False` → 不烧录，字幕由 H3 原生 on-screen text 渲染（V19 效果）
- SRT 始终生成入库（剪映/PR 后期可用），但**不用于本片**（无后期）

---

## 5. KV 尾帧资产（已就绪）

```
URL: https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/v26/kv-santi-final.webp
状态: ✅ COS 已上传，公网 200
用法: last_frame_url 直传 → H3 尾帧融合 → 结尾定格用户宣传页
```

---

## 6. 执行步骤（待"生成"）

```
Step 1  h3_prompt.py：soundscape 改实验室模板 + 人设身份锚
Step 2  tvc_engine.py：G1-G4 锚点注入（prompt 构建段）
Step 3  git commit + push + 远程 build backend
Step 4  构造 payload（[镜头N] + last_frame_url + 全参数）
Step 5  POST submit → 轮询 → 取单段 H3 产物（~20 分钟）
Step 6  抽帧验收：§4 多锚点逐项检查 + V19 字幕风格比对
Step 7  归档 三体翅桶_V27A.mp4 → Downloads/tvc-output/kfc-santi/
```

**预计 ~35 分钟**（10 部署 + 20 生成 + 5 验收）。

---

## 7. 已锁定决策

| # | 决策 |
|---|------|
| 1 | 回撤 V19 链路：shot_count=1 单次生成，零后期 |
| 2 | H3 全能力原生直出（配音/字幕/BGM/环境音/尾帧融合） |
| 3 | 三幕结构：首尾固定 + 中间一幕可变（V27A 默认全息星图） |
| 4 | KV 尾帧 = 用户宣传页（COS 已备） |
| 5 | 人物 = 3D 卡通理工男聪明小子（非真人非Q版） |
| 6 | 场景 = 实验室显示屏（无窗户） |
| 7 | 字幕 = V19 风格 1:1 |
| 8 | 只做 V27A，衍生后续追加 |
| 9 | **优化 H3 prompt 多锚点精确控制**（不简化、零冗余） |

---

**待确认：阻断项 = soundscape 实验室模板改造 + 人设身份锚。其余零代码改动。说"好了"或"生成"开始。** 🤙