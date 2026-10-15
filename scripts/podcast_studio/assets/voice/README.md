# 解说音轨（锁定）

## huzong_narration.mp3 — 机器干活人觉醒 · 正式配音 🔒

**用户指定锁定，禁止改动/替换/重新合成。**（2026-10-15）

| 项 | 值 |
|---|---|
| 来源 | 胡总 50 岁解说员（用户提供，原始文件 `~/Downloads/胡总_50岁解说员_no-watermark.mp3`） |
| 时长 | 230.49s |
| SHA-256 | `3952272bd16df72b26e18ace255eb22d73c44f0d71993e4415f0ff3353daef56` |
| 对应成片 | `~/Downloads/播客成片_胡总解说版_230s.mp4`（3:50，无 BGM） |
| 字幕 | `out/external.srt`（词级 ASR 精确时间戳，44 条） |

## 使用方式

```bash
# 出片（图文卡与字幕自动对齐该音轨，不动音频本身）
python3 asr_align.py assets/voice/huzong_narration.mp3        # → timeline.json + external.srt
python3 assemble.py --style culture \
  --external-audio assets/voice/huzong_narration.mp3 \
  --external-srt out/external.srt --no-bgm
```

## 护栏

- 本目录文件为**只读基准**：管线只读取、不写入（`--external-audio` 是输入路径）
- 校验和变动 = 音轨被改过，需与用户确认
- TTS 路线（generate.py 无 --external-audio 时）与本音轨无关，互不影响
