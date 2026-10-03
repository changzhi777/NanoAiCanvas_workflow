# TVC 五锚点主控可调 — 计划 V3（需求定案，等"开始"执行）

> 状态：**需求定案（2026-10-03 七题收齐）**，等"开始"执行
> 权威源：GitHub `MiniMax-AI/MiniMax-H3` skills/h3-prompt-writing/references/base-en.txt 官方指南全文

## 需求定案（7 项选择题结果）

| # | 决策项 | 定案 |
|---|--------|------|
| 1 | 配音主路 | **H3 原生台词**（`<d>` 声画同出带唇形；速创 TTS 不做） |
| 2 | 音色粒度 | **性别 + 音色预设库**（男女各若干预设，每个预设=一段编译器音色描述词） |
| 3 | 说话人范围 | **单人 (S1) + 画外音旁白**（唇闭声明；对话剧本自动降级旁白转述；规避官方串音风险） |
| 4 | character_desc | **预设下拉 + 可编辑描述框**（预设：3D动漫吃货哥/真人写实/国风/自定义） |
| 5 | product_desc | **三段式字段**：产品全称/核心卖点/价格（与验收审查字段天然对齐） |
| 6 | 横竖+运镜 | **9:16 默认**（16:9 可选）+ 运镜升级 **H3 官方 14 种词汇**（含幅度+速度子选项） |
| 7 | 首版范围 | **最小核心**：编译器替换旧自由文本（保留回滚开关）；速创 TTS 备选路与 A/B 对比不做 |

## H3 Schema 编译规范（编译器核心逻辑）

三字段输出（官方 base-en.txt）：
```
integrated_multimodal_description: [Shot 1] <风格词官方表：3D CG 等>，<运镜官方词+幅度+速度>，主体+产品时间轴，
  (S1) 音色特征描述（预设词）says: <d>[Chinese] 台词逐字</d>
  / 旁白： (S1) says in an off-screen voiceover: <d>[Chinese]...</d> while lips remain completely closed
  结尾 KV shot + on-screen text 引号逐字（"培根蛋法风烧饼12.5元"）
overall_soundscape: 环境音 1-4 句（从 scene 背景推导，默认模板）
non_diegetic_music: bgm_prompt 映射（乐器/速度/节奏，禁情绪词；无则 N/A）
```
- I2VA 首帧指令首行：`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
- 台词来源：parsed_script.narration → 旁白模式；dialogue → (S1) 台词模式
- 无配音（voice_gender=none）：不出 `<d>`，soundscape 照写，台词转花字

## 实施里程碑（"开始"后）

| M | 内容 | 量级 |
|---|------|------|
| M1 | `services/h3_prompt.py` 编译器（五锚点+剧本 → 三字段 schema）+ 音色预设库（男 3/女 3 描述词）+ 运镜映射表（现 7 种 → 官方 14 种）+ **角色 sheet / 产品 KV 生图模板构造器**（见下）+ 单测（schema 完整性/台词逐字/说话人稳定/sheet-KV 模板字段） | ~500 行 |
| M2 | 字段链：SubmitRequest 六字段（character_desc/product_name_desc/product_sell/product_price/voice_gender/aspect_ratio）+ **图位配置字段（enable_character_sheet/enable_product_kv）** + 引擎注入（config 传导+参考图 prompt 复用编译产物）+ 回滚开关（config 开关切回旧 prompt） | ~220 行 |
| M3 | 前端面板：角色预设+可编辑框 / 产品三段式 / 配音性别+音色下拉 / 横竖版下拉 / 运镜官方词升级 / **图位开关（角色 sheet☑ 产品 KV☑）+ 模型选择** | ~320 行 |
| M4 | 部署 + E2E：法风烧饼全锚点单（女声配音+竖屏+3D预设+**角色 sheet+产品 KV**）→ 双闸报告 + 展示页更新；对比旧 prompt 版本观感 | 验证 |

## 生图模板纳入（角色 Sheet + 产品 KV，2026-10-03 定案）

### 角色 Sheet 模板（step4 character-ref 升级）

- **模板骨架**（六模块，`services/h3_prompt.py` 或独立 `image_templates.py`）：
  ```
  专业的角色设定参考图（character sheet），三视图：front view, side view, back view。
  {character_desc}            ← 五锚点②直接复用（含 3D CG 风格词/服装/发型/面部）
  配色板：{品牌色/角色主色}。
  flat white background, clean layout, concept art style, horizontal layout.
  ```
- **模型**：gpt-image-2.5-sunburst（精度高适合编辑，0.3 元/张）；aspectRatio 跟随模板（9:16 时 sheet 用横版 1280*720 出图——sheet 天然横版，生图参数与视频比例解耦）
- **可选扩展图位**：表情表（expression sheet）/ 产品同框pose——首版不做，模板骨架预留
- **消费关系**：sheet 图 → H3 I2VA 首帧 + 参考一致性锚（替代/增强现 character-ref 氛围图）

### 产品 KV 模板（step4 新增图位 product-kv）

- **模板骨架**（六段结构）：
  ```
  商业产品广告 KV 主视觉。主体：{product_name_desc}，{角度：45° hero shot/正面平铺/悬浮}。
  材质细节：{product_sell 卖点映射材质词：酥皮层次/拉丝/蒸汽/金属反光/磨砂}。
  打光：studio lighting, softbox, rim light, {light_style 映射}。
  场景：{scene 背景或纯色渐变 hero 底}。构图：居中/三分法，clean space for headline（文案区预留，不渲染文字）。
  ```
- **模型**：flare 主力；NanoBanana-2-Lite 打样（面板可选，0.08 元/张低成本试构图）
- **花字策略**：KV 图不渲染中文（乱码风险），文案区留白；花字走 H3 视频 on-screen text 引号机制
- **消费关系**：KV 图 → 结尾 KV shot 首帧/参照 + 验收闸 product_fidelity 审查的参照图（比现在用场景图审产品更准）

### 图位与计费

- 图位配置化：默认 2 图（角色+场景）→ 开启后 2+N（+sheet +productKV），`enable_character_sheet/enable_product_kv` 面板开关
- 计费：每图按 image 档叠加（estimate/deduct 的 calc_tvc_cost image 项 ×(2+N)）
- 审查联动：product_fidelity/ip_consistency 审查的 ref_images 优先取 sheet/KV 图（比场景图更准）

## 风险

- 速创代理对结构化 prompt 的透传（字符串应原样达 H3）——M1 首任务实测
- H3 中文台词发音质量（官方案例偏英文）——M4 E2E 实测
- 编译器回归：切换开关保证旧链路可回滚

## 附二：参考图与分镜设计维度深挖（2026-10-03，文生图潜力研究）

### A. 人物角色设计图（Character Sheet）——step4 升级方向

**六模块结构化 prompt**（社区最佳实践汇总）：
1. **任务锚定首句**：`专业的游戏/动漫角色设定参考图（character sheet / model sheet）`——避免生成普通插画
2. **视图显式指令**：`three views: front view, side view, back view`（三视图）+ 可选表情表（expression sheet）/装备拆解/色板
3. **分模块描述**：服装 / 发型 / 面部特征 / 配色（给色值或色板）/ 姿态，分块描述降低随机性
4. **干净底版**：`flat white background, clean layout, concept art style`
5. **比例格式**：横版宽幅适合 character sheet
6. **两步法一致性**：先出设定图 → 设定图作为参考图输入后续生成（我们的 H3 I2VA 首帧天然就是"设定图输入"——设定图质量直接决定视频角色一致性）

**落地设计（step4-character-ref 升级）**：
- 预设模板 = character_desc 预设 + sheet 骨架（六模块）+ 品牌元素（肯德基红白/厨师帽）
- 新增可选第 3 张图：**表情/姿态表**（视频情绪节拍的表演参照）
- 生图模型分工：sheet 用 gpt-image-2.5-sunburst（"精度很高 适合编辑图片"，0.3 元/张）

### B. 产品宣传 KV 设计——step4 新增产品 KV 图位

**六段结构**（产品摄影方法论）：
1. **主体**：产品全貌 + 角度（45° hero shot / 正面平铺 / 悬浮）
2. **材质**：词库——酥皮层次/金属反光/磨砂玻璃/皮革纹理/亚克力悬浮/拉丝（食品：蒸汽/酱汁拉丝/碎屑纷飞）
3. **打光**：词库——studio lighting / softbox / rim light / backlight / golden hour / 逆光轮廓
4. **场景背景**：使用场景植入（早餐餐桌/门店）或纯色渐变 hero 底
5. **构图视角**：居中对称/三分法/留白文案区
6. **文案区域预留**：中文花字**不在生图里渲染**（gpt-image 中文乱码风险），生图时 `clean space for headline` 预留，花字由视频 prompt 的 on-screen text 引号机制或后期贴片

**模型分工（速创矩阵 × 能力）**：
| 用途 | 模型 | 理由 |
|------|------|------|
| 角色 sheet | gpt-image-2.5-sunburst | 官方定位"精度高、适合编辑图片" |
| 产品 KV | gpt-image-2.5-flare（现主力）或 NanoBanana-2-Lite 打样 | flare 快且稳；Lite 0.08 元/张打样低成本低试错 |
| 中文花字 | GPT Image 系（文字渲染 99% 准确）| Nano Banana 2 文字略逊 |
| 氛围场景 | NanoBanana-2-Lite | 写实人像/场景氛围优势 + 极速低价 |

### C. 分镜设计维度（分镜表结构化——衔接 H3 [Shot N] 时间轴）

专业分镜六维度（传统方法论 × AI 实践）：
1. **景别**：远景/全景/中景/近景/特写（情绪节拍：广→紧→特写递进）
2. **构图**：角度（平/俯/仰/荷兰角）+ 层次（前景/中景/背景三层光影分离主体）
3. **运镜**：衔接 H3 官方 14 词汇（已定案）
4. **摄影参数**：焦距（35mm/85mm 人像）/机位/运动方式逐镜头标注
5. **节拍**：每镜头秒数 + 情绪曲线（Hook→展开→高潮→定格 KV）
6. **声画**：每镜头台词/音效标注（衔接 H3 `<d>` 台词机制）

**落地设计**：parsed_script 的 shots 升级结构化分镜表（景别/构图/运镜/节拍/声画五列）——直接喂 H3 编译器生成 `[Shot N] At 00:03.500...` 时间轴，替代现在的自由文本情节。

### D. 与五锚点的关系

- character_desc 预设 = sheet 模板的"角色描述模块"复用（一次编写，sheet 生成 + H3 编译器两处消费）
- product_desc 三段式 = KV 模板的主体/卖点段 + 审查字段复用
- 分镜表 = 编译器 integrated_multimodal_description 的中间表示（IR）
- 新增图位：step4 可扩展为 2+1+N（角色 sheet + 场景 + 可选表情表 + 产品 KV）——计费按张叠加

## 附三：KFC 官方要求对照 × 审查机制增强（2026-10-03）

### KFC 官方要求（公开可得部分）

1. **品牌资产官方源**：global.kfc.com（Primary KFC Logo 下载 / KFC red CMYK 规格）；KFC Global Brand Identity Standards 31 页 PDF（Logo 使用：reverse 应用、1-colour logo + positive Colonel 深色背景规则）
2. **KFC Red ≈ #E4002B**（Pantone 485C / RGB 228,0,43，业界通用值）
3. **上校头像（Colonel Sanders）= 核心 IP**：形象不可扭曲/改色/加特效；Logo serif 大写 + 上校头像右置
4. **中国广告法（硬性法律，罚 20-100 万）**：
   - 极限词禁用（广告法第九条）：最高级/最佳/第一/顶级/极品/极致/独家/国家级/销量冠军
   - 食品特殊：禁"最新科学/最新技术/最先进工艺"；禁替代母乳暗示/哺乳妇女婴儿形象；普通食品禁疾病预防治疗功效声称（"增强免疫力/降血糖"）；禁医疗用语
5. 肯德基中国内部 VI/IP 授权细则不公开——**飞书 Brief 仍是最权威标准源**（现有按需导入设计正确）

### 对照现有验收闸 14 项 → 差距分析

| 缺口 | 严重度 | 增强设计 |
|------|--------|---------|
| **广告法极限词/食品违禁词审查** | 🔴 法律风险（20-100 万罚款） | 新增 criteria `ad_law_compliance`（llm_content，**veto**）：审查台词/花字/slogan 是否含极限词清单 + 食品违禁语（功效声称/母乳替代/医疗用语）。**剧本闸是最佳拦截点**（文案生成后立即查，省成片成本）；违禁词清单内置编译器/审查 prompt |
| **Logo/上校头像完整性** | 🔴 品牌红线（客户必打回） | 新增 criteria `logo_integrity`（llm_visual，**veto**）：Logo 形状/配色/上校形象是否变形改色加特效；prompt_hint 注入品牌 PDF 规则摘要 |
| **品牌色标准值** | 🟡 | scene_mood_visual 的 prompt_hint 注入 KFC Red #E4002B 参考值；产品 KV 生图模板背景/主色锚点同步注入 |
| **健康/功效声称** | 🟡 | 并入 ad_law_compliance 项（食品违禁语子清单） |
| slogan 规范 | 🟢 已覆盖（copy_fidelity） | — |
| IP 授权元素 | 🟢 部分覆盖（must_elements） | Brief 联名 IP 元素齐全性已有 |

### 五锚点计划联动更新

- **生图模板**：角色 sheet / 产品 KV 骨架注入品牌段（KFC Red #E4002B 主色锚 + "Logo/上校头像保持官方原样，不变形不改色"负向约束）
- **H3 编译器**：narration/dialogue 文本进 `<d>` 前过极限词预检（正则清单秒判 + LLM 复核）；花字 on-screen text 同检
- **criteria 扩展**：14 项 → 16 项（+ad_law_compliance / +logo_integrity），种子模板迁移 019 或新迁移
- **审查 prompt 资产化**：违禁词清单 / 品牌规则摘要存 acceptance 模板的 criteria prompt_hint（admin 可编辑——客户标准变化不改代码）

## 附：H3 深挖核心发现（V2 存档）

- H3 原生联合生成视频+立体声音频（voice/环境音/音效/音乐 四层），单次生成非后处理
- 结构化 Schema 三字段（integrated_multimodal_description / overall_soundscape / non_diegetic_music）
- 配音控制：说话人 ID (S1) + 音色特征描述 + <d>[语言]台词逐字</d>；旁白 off-screen voiceover + 唇闭声明
- 运镜官方 14 词汇 × 幅度 × 速度；on-screen text 引号逐字；3D CG 官方风格词
- conditions 支持 audio 音色参考（≤3，<Audio 1> voice-timbre reference）
- 已知风险：多说话人 voice bleed（官方实锤）+ 幻觉语音 → 单说话人优先
- 速创 TTS（audio_tts，0.0006 元/字符，男女音色表）降级为可控旁白备选（首版不做）
