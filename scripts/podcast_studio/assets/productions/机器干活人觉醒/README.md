# 机器干活人觉醒 · 作品档案

> AI 取代劳动后的人类觉醒 —— 十段哲思短片
> **出品**：2026-10-15 ｜ **时长** 3:50（230s）｜ **画幅** 720×1280（9:16 竖屏）

## 成片

| 文件 | 说明 |
|---|---|
| `成片_胡总解说_流光BGM_230s.mp4` | 最终版（13.4MB，SHA-256 `364b88f3…`） |

**构成**：胡总专业解说（锁定）＋《流光》纯器乐 BGM（0.18 音量）＋ 11 段水墨分镜 KenBurns ＋ 词级精确字幕（44 条，烧录+独立 SRT）

## 资产清单（全部自包含）

| 文件 | 内容 | 校验和（前 16 位） |
|---|---|---|
| `解说音轨_胡总.mp3` | 胡总 50 岁解说员（🔒 用户指定锁定，禁止改动） | `3952272bd16df72b` |
| `BGM_流光.mp3` | MiniMax Music-3.0 生成纯器乐 3:51（ASR 0 字验证无人声） | `e07d6da49789e494` |
| `分镜脚本.json` | 11 段分镜（文本 + 英文 visual_hint，视觉弧线冷→暖） | — |
| `时间轴.json` | 段落级时间轴（ASR 词级对齐实测） | — |
| `字幕.srt` | 44 条句级字幕（词级时间戳，非估算） | `7e379add4032d9d5` |
| `cards/card_00-10.png` | 11 张水墨插画（速创 GPT-Image-2.5，816×1456） | — |

## 制作管线（可复现）

```bash
# 1. 解说音轨 → ASR 词级对齐（段落轴 + 精确字幕）
python3 asr_align.py assets/productions/机器干活人觉醒/解说音轨_胡总.mp3

# 2. 出片（图文卡 + 字幕 + BGM 混音）
python3 generate.py --topic "机器干活人觉醒" --style culture --resume --no-hero \
  --external-audio <解说音轨> --no-bgm          # 或 assemble 直调
# 本次实际使用：assemble.py --style culture --external-audio ... --external-srt ...
```

## 制作参数

| 项 | 值 |
|---|---|
| 解说 | 胡总 50 岁解说员（用户提供，只读基准） |
| BGM | 《流光》MiniMax Music-3.0 / 纯音乐开关轮询确认 + ASR 0 字验证 |
| BGM 音量 | **0.18**（按用户"太抢"反馈从 0.25 下调；amix normalize=0 保人声峰值） |
| 字幕 | libass 烧录，PlayRes 720×1280，字号 40 / MarginV 90，14 字折行 |
| 分镜 | 11 段（含开场），KenBurns 推拉轮换 |

## v5 横版手绘重制（2026-10-16，当前交付）

| 文件 | 说明 |
|---|---|
| `成片_横版手绘_胡总解说_流光BGM_爆点版_230s.mp4` | **最终交付版**：1280×720 + 首尾 6s 爆点（速创 H3 首帧锚定） |
| `hero_front.mp4 / hero_back.mp4` | 爆点素材原片 |
| `成片_横版手绘_胡总解说_流光BGM_230s.mp4` | 无爆点版（对照） |
| `cards_landscape/card_00-10.png` | 11 张横版手绘插画（image-01-live，1456×816） |

- 画幅 9:16 → **16:9**；风格 水墨写实 → **手绘插画**（brush strokes + gouache）
- 分镜/文案/解说音轨/BGM 全部不变（解说音轨 SHA `3952272bd16df72b` 复核一致）
- 生成通道：速创双端点维护 → MiniMax image-01-live（aspect 16:9）
- 字幕：PlayRes 1280×720 / 字号 36 / 折行 26 字（config 化）

## 版本沿革（归档）

- v1 TTS 版（Gentle_Senior 女声 + 山河古韵 BGM + TTS 时间轴）→ 音色不符
- v2 胡总解说版（无 BGM）→ 词级精确字幕
- v3 脉动之光 BGM 版 → **BGM 带人声（歌）作废**，原件在 `assets/bgm/_archive/pulse_of_light_VOCAL.mp3`
- v4 流光纯器乐 BGM → 交付（竖版）
