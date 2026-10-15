# P01 茶杯 TVC · 执行计划（F1-F22 全量锁定项落地）

> 状态：待批准
> 依据：12 镜深挖定稿 + 9 轮审查（F1-F22）+ 商务三项定稿
> 工作目录：`/Users/mac/Documents/KFC-TVC/茶杯TVC广告制作/`

---

## 〇、工程载体：`teacup_pipeline.py` 模块设计

```
茶杯TVC广告制作/
├── teacup_pipeline.py        # 主入口 CLI
│   ├── db        SQLite 五表（decisions/shots/artifacts/feedback/files）
│   ├── preproc   F21 参考图预裁切
│   ├── genimg    速创 gpt-image-2.5 生图（Authorization + urls 注入 + aspectRatio 1280*720 / S11 封面 2048*1152 待探针）
│   ├── m3gate    M3 三闸 + borderline ±5 容差
│   ├── watermark PIL 图水印 + ffmpeg drawtext 视频水印（--watermark 开关）
│   ├── cos       COS 上传（.22 侧参数化 helper `cos_up.sh <local> <key>` 一条命令，Z5 减链）
│   ├── h3video   速创 video_minimax_h3 提交+轮询（F19 探针先行）
│   ├── assemble  trim/crossfade/BGM/调色/双版导出
│   └── cli       --phase 0/A/B/C/D --resume --index
├── teacup.db                 # SQLite 主库
├── INDEX.md                  # 人读索引（库变更自动重生成）
└── kf/ vid/ bgm/ endcard/ preprocessed/   # 产物目录
```

**SQLite 核心机制**：shots 表状态机 `draft→m3_gate→user_review→rework→approved→final`；approved 镜 lock=true 批量操作自动跳过；feedback 表五字段（raw→interpreted→confirmed→adopted→recheck）全链留痕；返工 ≥3 轮黄灯提醒（F13）。

---

## Phase 0 · 前置准备（~30 分钟，零 API 成本除探针）

| # | 任务 | 产出 | 验证 |
|---|------|------|------|
| 0.1 | **Q6 速创 key 通道**：`WUYIN_KEY=$(ssh zhiming 'docker compose exec -T backend printenv WUYINKEJI_API_KEY')` 环境变量传递（不落盘，数字人项目验证模式）| pipeline env 就绪 | echo 长度核对 |
| 0.2 | **F19 双探针**：① H3 视频端点（Authorization 直调通断 / duration=4 实出长度（S09 依赖）/ 16:9+2K 实际分辨率）② 生图端点 aspectRatio=2048*1152 越档（G1：S11 封面 2K 依赖；实证 768*1344 已通）| 通路判定 + 参数实测值 | 探针片 URL + ffprobe 报告 |
| 0.3 | **F21 参考图预裁切**：包装长图→单杯/茶罐/礼盒 3 张；空乘三视图→正面单图 | `preprocessed/` 4 张 | sips 尺寸核对 |
| 0.4 | SQLite `teacup.db` 初始化：五表建表 + decisions 表写入全部锁定项 | 库文件 + 初值 | sqlite3 查询 |
| 0.5 | **地图宣纸黄底图**：扫描件（12617×5543）调色（泛黄底+褐线）| `preprocessed/map_toned.jpg` | 贴图你确认色调 |
| 0.6 | 产物目录结构创建 + INDEX.md 初版 | 目录树 | ls |

## Phase A · 关键帧生成（两批审定制）

### 批 1 · 母帧链（4 帧 + 1 中间素材，定全片调性）

| 帧 | 内容 | 制作 |
|----|------|------|
| S01-K1 | 地图局部特写（光影斜扫）| 底图 0.4 + 后期光效（**地图铁律 F5：禁生图碰地图**）|
| 线稿杯素材 | 白底线稿风格茶杯单图 | genimg ×1（产品图风格转化注入）→ 抠图备叠层 |
| S01-K2 | 地图全图+线稿杯隐现 | 底图 + 线稿杯叠层合成 |
| S02-K2 | 实物杯电影感浮现 | genimg：单杯参考注入 + 舷窗虚化重绘 |
| S11-定格 | 产品主视觉定格图 | genimg：礼盒参考注入（兼封面交付物）|

**批1 合计 genimg ×3 + 后期合成 ×2**。S05-底 移批2（Q1：其右半依赖 S04-K2）。

**流程**：生成 → M3 闸1（五维：产品一致性≥85/风格≥80/乱字 0 容忍/手部/构图）→ 水印 → **贴对话逐张给你审**（解读确认制）。

### 批 1 过审后 · 批 2（~10 张，可并行）

S02-K1（线稿杯，S01-K2 派生）、S03-K1/K2（茶仓闭/开）、S04-K1/K2（注水始/黄绿透亮终）、**S05-底（分屏：左半 genimg 科技示意 + 右半裁 S04-K2——批内自洽）**、S06-K1/K2（持杯/举杯剪影）、S07-K1（南博女孩·新中式）、S08-K1/K2（空乘持杯/递杯 POV）、S09-K1/K2（航线起点/终点光爆，底图+朱砂红航线后期绘制）、S10-K1（全家福悬浮底图）

**同流程**：M3 闸1 → 水印 → 批量二次审定。

### 批 2 末尾 · Q3 H3 prompt 模板表起草

按已定稿 12 镜分镜，起草全量 H3 prompt 表（英文视觉描述 + `<d>[Chinese] 旁白</d>` voiceover 句式 + `on-screen text` 字幕句式 + first/last 帧引用 + **逐镜 soundscape 环境音（docx 音效列直取）**），入库 artifacts 表——Phase B 逐段直接取用（M3 闸2 兜底验收）。

**模板铁律（H1-H5 + G2/G3 + Z1 参数深挖定稿）**：
- `non_diegetic_music: N/A` **全段强制**——段内配乐与贯穿 BGM 打架，BGM 独立管线
- **Z1 旁白音色锚定句全段统一**：voiceover 前置固定音色描述（male-elite 对应英文，如 "narrated by a calm, mature, refined male voice"）——12 段旁白零音色漂移
- 段内仅存：旁白 `<d>` + soundscape 环境音
- S07 展柜地图 `softly blurred, out of focus`（防乱字，F5 铁律扩展）
- S05 旁白 4.6s/5s 最紧（风险登记，语速实测不达则微调句读）
- 同镜 K1/K2 同参考同色调生成（防段内闪变）
- **Z2 速创 URL 时效**：H3 轮询 success 立即下载落盘（V26B 404 教训），绝不批量延后
- **G2 生图参考纪律**：每帧注入 ≤2 张、参考图主体大背景净（F21 裁切产物）、产品/人物参考不混注
- **G3 生图 prompt 三类模板**：产品类（keep exact cup design/map pattern + Avoid text/hands）/ 人物类（keep exact face/uniform + do not beautify）/ 场景类（无参考直出 + 逐镜 Avoid，S03/S06 加 deformed hands/extra fingers）——与 H3 模板同表起草
- **Z3 S01-K2 构图规范**：1280×720 画布 · 地图横幅居中（2.28:1→上下宣纸色留白）· 线稿杯叠下 1/3
- **Z4 M3 闸2 抽帧点位**：固定 0.5s/2.5s/4.5s（覆盖旁白/字幕时窗，防漏检）

### H3 调用参数终表（速创 API 全参数决策版）

| 参数 | 平台规格 | 本项目取值 | 决策依据 |
|------|---------|-----------|---------|
| `prompt` | 必填 | Q3 模板表逐段组装 | Schema 三字段结构 |
| `first_frame` | URL ×1 | **全段必传**（COS URL · 1280×720）| 构图/色调/人物三重锚定（V28 实证锚定力最强）|
| `last_frame` | URL ×1 | S01-S04/S06/S08/S09/S10 传 | 首尾帧锁动态起讫 |
| `images` | URL ×9，**与首尾帧互斥** | 不用 | 互斥组二选一：构图锚定（首尾帧）> 多参考（images）；人物一致性已在关键帧生图层用 `urls` 注入解决 |
| `videos` | URL ×3，与首尾帧互斥 | 不用 | 动作参考无实拍源（无注水/递茶参考视频）；东航航拍直接实拍剪辑不需 H3 模拟 |
| `audios` | URL ×3，与首尾帧互斥 | **不用，登记备选通道** | ⭐ 若获古琴参考曲（甲方/素材库），BGM 段改 audios 参考模式生成——音乐贴合度优于纯文字描述；BGM 段画面无所谓（只取音轨），放弃首帧无损失 |
| `ratio` | 默认 adaptive | `16:9` 显式 | 防 adaptive 跟参考图漂移 |
| `resolution` | 768P / 2K | `2K` | assemble 前段级降采样 1920×1080（H2 统一基准）|
| `duration` | 4-15 整数 | 5×10 段 / 4×S09 / 15×BGM×2 | 实出 +0.166s 已入时长账 |
| `<d>` 旁白 | Schema 标签 | voiceover 句式（唇闭画外音）| 全片无出镜口播，lip_sync 不启用 |
| `on-screen text` | Schema 句式 | 同源字幕 + M3 缺失检测兜底（F11）| V19 句式 |
| `non_diegetic_music` | Schema 字段 | **全段 N/A（H1 铁律）**| 段内配乐与贯穿 BGM 打架 |
| `overall_soundscape` | Schema 字段 | 逐镜表（docx 音效列直取）| S01 纸张声/S04 注水 ASMR/S06 机舱白噪/S07 博物馆/S08 机场广播… |

**生图端点（gpt-image-2.5）参数**：`prompt` + `urls`（参考注入 ≤2 张：产品裁切图/空乘正面图）+ `aspectRatio: 1280*720`（**实证接受任意 宽*高 值**——文档 1K 表仅参考；S11 封面试 2048*1152 待探针）+ 轮询 5s/600s + 并发 3-4 路 + status=3 重试 2 次报批——88 分链路全参数固化。

### UI/UX 文字层（与批 2 并行）

| 任务 | 工具链 | 产出 |
|------|--------|------|
| 镜11 文字层（"即刻搜索'东航那杯茶'"排版）| ui-ux-pro-max 设计规范 + HTML/CSS + 无头浏览器渲染 | `endcard/S11_text.png`（透明底）|
| 镜12 Logo endcard（东航 jpg 裁水印 + 南博 png 并列 + Slogan）| 同上 + ffmpeg 淡入动效 | `endcard/S12_base.png` + 3s 动效 |
| 字幕样式模板（万一 F11 兜底启用）| drawtext 参数包 | 模板入库 |

## Phase B · H3 视频生成（仅过审镜进入）

**每镜标准流**：首尾帧 COS 上传 → H3 提交（`ratio:16:9, resolution:2K, duration 按段表（5/4/15）` + `<d>[Chinese] 旁白</d>` 画外音 + `on-screen text` 字幕直出 + `music: N/A`）→ 轮询 → **M3 闸2**（动态质量/产品动态一致/尾帧到达度/字幕存在性检测）→ 水印样片 → SQLite 入库。

| 调用 | 规格 |
|------|------|
| S01-S11 | 首尾帧 11 段（**含 S05 H3 图生视频**：分屏底作首帧+科技光效微动+旁白直出）|
| S09 | 航线段 4s（首尾帧：南京微光→航线西端光爆）|
| BGM | 古琴 A 段 + B' 变奏 ×2 次视频生成 → **Q4 `ffmpeg -vn` 抽音轨 → AAC 备用**，排列 `A(15)→A(15)→B'(15)→A裁(13) = 58s` |
| 合计 | **13 次视频 + 探针 1 = 14 次** |

**返工**：M3 fail → 生成返工报告（失败维度+L1-L4 分级+修正方案+成本）→ **报你批准** → 执行 → 再过闸（每轮报批，≥3 轮黄灯）。字幕缺失段 → F11 兜底 ffmpeg 贴字（唯一破例，报你后执行）。

## Phase C · 组装

### 逐镜 trim 表（Q2/Q5 修正版：crossfade 0.15s + 终剪微调）

| 段 | H3 实出 | 处理 | 备注 |
|----|---------|------|------|
| S01-S08、S10、S11 | 5.166s | **保留全长**（Q5：掐尾不掐头，保首帧链对齐；由终剪统一吸收）| |
| S09 | 4.166s | 保留 + 航拍 1.0s 硬切（鼓点，无 crossfade）| 起飞素材抽尾迹云段 |
| S12 | — | 3.0s | Logo 动效纯后期 |
| **全长** | | 10×5.166 + 4.166 + 1 + 3 = **59.83s** | |
| **crossfade** | | 10 接缝 × 0.15s = −1.5s → **58.33s** | |
| **终剪** | | 掐尾 0.33s → **58.0s** ✅ | S11 尾部静区吸收 |

### 双版组装

| 版 | 构成与时长账 | 音轨 | 水印 | 导出 |
|----|------|------|------|------|
| **正片 58.0s** | S01→S12：59.83 − crossfade 10×0.15 − 终剪 0.33 = **58.0s**（trim 表为准）| crossfade 0.15s 段间（音画同步）+ BGM AAB' 贯穿 + H3 原生音效 + 缺口音效库补（F6）| 无 | 1920×1080 H.264 |
| **试稿 33.0s** | S01-S06 + S12：6×5.166 + 3 = 33.996 − crossfade 6×0.15 − 终剪 0.1 = **33.0s** | BGM 裁剪版（A+A裁13+B'尾 / 执行时按听感定）| `P01-TRIAL` | 同上 |

**收尾工序**：全片调色 pass（LUT 向坤舆蓝/宣纸黄收敛，F9）→ M3 闸3 终审（节奏/色调统一/字幕完整/水印正确）→ **你人工终审（含音轨听检）**。

## Phase D · 交付

| 交付物 | 规格 |
|--------|------|
| 正片 | 58s · 16:9 · 1080P · H.264 · 无水印 |
| 试稿版 | 33s · P01-TRIAL 水印 |
| 关键帧原图包 | 12 镜全量无水印 PNG + 版本号 |
| 封面图 | S11 定格图（无字底版 + 文字合成版）|
| 项目档案 | INDEX.md + teacup.db 快照 |

收尾：项目经验沉淀 Claude memory（跨项目复用）。

---

## 时间线（不含返工等待）

| 阶段 | 耗时 | 累计 |
|------|------|------|
| Phase 0 | 30 min | 0.5h |
| Phase A 批1（生成+你审定）| ~1h | 1.5h |
| Phase A 批2（并行生成+二次审定）| ~1.5h | 3h |
| Phase B（13 次 H3，2-3 路并行轮询）| ~1.5-2h | 5h |
| Phase C（组装+调色+终审）| ~1h | 6h |
| Phase D | 30 min | **~6.5h 一个工作日** |

## 全局规则（执行期生效）

1. 每轮 M3 fail 必报你批准才返工；字幕兜底同理
2. approved 镜锁定，重出须你点名
3. 你的反馈先出结构化解读，确认后执行
4. 每阶段完成贴 INDEX.md 快照给你
5. F16（镜4 道具杯）执行到 S04 关键帧时给你两个选项现场定
