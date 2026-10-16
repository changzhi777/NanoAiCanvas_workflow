# 亨利八世：都铎王朝 —— 英文播客图文解说片 · 制作档案

> 第二条「播客图文解说工作流」成片。英文解说 · MiniMax「英文播音员」克隆音色 · 苏格兰风笛 BGM。
> 工作流定义见根 [CLAUDE.md](../../../CLAUDE.md)「播客图文解说工作流」章节。

## 成片

| 版本 | 文件 | 规格 |
|---|---|---|
| V1 英文终版 | `播客成片_英文版_HenryVIII_181s.mp4` | 1280×720 / 30fps / ~181s / H.264+AAC |

结构（工作流标准三段式）：

| 时间轴 | 内容 |
|---|---|
| 0 – 14.1s | 数字人对口型开场（书房场景仿真人讲解，Hook：1509 黄金王子登基） |
| 14.1 – 169.8s | Tudor 历史知识图卡轮播（8 张主卡；段3 = 六王后总卡 + 六王后竖版连播各 2s） |
| 169.8 – 181s | 数字人对口型收尾（CTA：关注/点赞/下一位君主） |

**翻页**：图卡间为 3D 页翻转过渡（`tools/page_turn.py` numpy 帧渲染）——
页面绕左缘旋转翻走（透视压缩 + 变暗）→ 页背白纸向左滑出 → 新页落定；
折痕/投影柔影随动。0.4s/次，共 13 次。**非缓推、非平面扫**（用户两次迭代定型）。

## 音频链

- **配音**：MiniMax T2A v2，音色 `ttv-voice-2026101516002026-tBS3qC8Y`（英文播音员），speed 0.95
  - 三段：open 14.14s / mid 155.66s / close 11.04s → 全片音色一致
- **BGM**：苏格兰风笛（MiniMax Music-3.0 网页生成，600 声贝），`bagpipes.mp3` 126.6s 纯音乐
  - ⚠️ **用户终审后去除**（「去掉BGM 纯解说」）——`build_final_en.py` 的 `BGM_GAIN=0` 即纯解说直出；
    风笛曲留档 `音轨/BGM_苏格兰风笛.mp3`，需要时 `BGM_GAIN>0`（建议 0.15）+ `amix normalize=0` 恢复
  - prompt：高地风笛主题悠扬苍凉，军鼓轻点行进感，弦乐铺底温暖深沉，慢板
- 首尾段音轨取自 lipsync 输出视频（音频=TTS 原音），三段统一转 wav 再 concat（防混合容器炸）

## 视觉链

- **人物锚图**：`henry8_anchor_16x9.png`（NB21，Holbein 古典画像风格 Henry VIII）
- **8 张 Tudor 主卡**（NB21 subject_reference 挂锚图 + 16:9 2K + Holbein 油画风 + English label）：
  Renaissance Prince / Break with Rome / Six Wives / Price of Defiance /
  Father of the Navy / Aging Tyrant / Immortal Image / Time Judges Kings
- **六王后肖像**（3:4 竖版，姓名+命运标签）：Catherine of Aragon—Divorced / Anne Boleyn—Beheaded /
  Jane Seymour—Died / Anne of Cleves—Divorced / Catherine Howard—Beheaded / Catherine Parr—Survived
  - 组装时 crop 偏上（保脸）+ zoompan 缓推
- **数字人**：速创 H3（`video_minimax_h3`，768P/15s/16:9）→ `video_digital_humans` 口型替换英文 TTS

## 对齐与字幕

- MiniMax ASR `asr-1.0`（language=en）词级时间戳：open 36 词 / mid 399 词 / close 35 词
- `asr_align_en.py`：段首/段尾**双词组锚点** + 顺序单调约束（ASR 词数≠脚本词数，
  "Henry's"拆词、"the Eighth"→"VIII" 会让游标漂移——头尾双锚根治）
- 产出 `en_timeline.json`（10 段轴）+ `en_bilingual.srt`（43 条中英双语，英文按词边界换行）

## 教训（本轮新增）

1. **H3 prompt 带字幕请求会污染下游**：`on-screen subtitle text of his words` → 硬字幕烧进源视频，
   lipsync 原样保留。首尾段 H3 一律禁止字幕措辞（open v3 措辞为基准）。
2. **first_frame 语义**：`zaji_hero_back_16x9.png` 是灯笼街背影图（中文版电影感收束用）。
   英文版 close 要书房正面 → 用 `zaji_hero_front_16x9.png`，与 open 呼应。
3. **素材先验**：组装前必须抽帧验收 lipsync 源视频（人物/场景/无字幕三项），不能只看时长。

## 目录

```
亨利八世都铎王朝/
├── README.md                 ← 本档案
├── 播客成片_英文版_HenryVIII_181s.mp4
├── 图卡_Tudor主卡/           ← 8 张 16:9
├── 图卡_六王后/              ← 6 张 3:4
├── 音轨/                     ← tts_en 三段 + BGM_苏格兰风笛
├── 字幕分镜/                 ← en_bilingual.srt + en_timeline.json + henry8_script.json
└── 数字人/                   ← 锚图 + lipsync 首尾段
```

制作：播客图文解说工作流 v2 · 2026-10-16
