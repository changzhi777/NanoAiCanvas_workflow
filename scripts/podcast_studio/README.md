# 播客管线（podcast_studio）

文案 → 解说音轨 → 插画分镜 → 成片（字幕/BGM），一条命令出片。
支持 **三种音轨模式**、**双形态**（单口播竖屏 / 双人对谈横屏）、**双风格**（culture / tech）。

## 快速开始

```bash
# 依赖：ffmpeg（烧录字幕需 libass 版，项目自带 bin/ffmpeg）、pyyaml、bs4+pypdf（RAG）
python3 -m pip install -r requirements.txt

# 1. TTS 模式：脚本 → TTS 配音 → 插画 → 成片（全自动）
python3 generate.py --topic "量子隧穿" --style tech

# 2. 外部解说模式：现成专业解说 → 插画/字幕按真实音轨对齐
python3 generate.py --topic "..." --style culture --resume --no-hero --no-bgm \
  --external-audio assets/voice/huzong_narration.mp3

# 3. 对谈模式：双音色交替（host/guest），时长由文案驱动
python3 generate.py --topic "AI会取代创作者吗" --style tech --mode dialogue
```

## 模块

```
generate.py     主入口（--topic --style --mode --resume --no-hero --no-bgm
                          --external-audio --external-srt --doc --dry-run）
script_gen.py   MiniMax-M2.7 出结构化脚本（超字数自动带反馈重试 / think 剥离）
ingest.py       RAG 取材：URL / PDF / MD / text: 内联（JS 反爬站自动拦截）
tts.py          speech-2.8-hd 逐句合成 → ffprobe 实测时间轴；对谈双音色
cards.py        插画卡：速创 flare → 基础版 → MiniMax image-01-live 三通道 fallback
hero_shot.py    首尾爆点：Hailuo-02 首帧锚定（配 character_ref 转 S2V-01 主体参照）
assemble.py     合成：KenBurns / 字幕烧录 / BGM 混音（amix normalize=0）
asr_align.py    外部解说 ASR 词级对齐（段落轴 + 句级精确字幕）
voice_clone.py  音色克隆（⚠ 当前套餐不支持 2061，模块保留）
get_keys.py     密钥从生产容器拉取（本地缓存 24h，.keys.json 已 gitignore）
tools/bgm/      Music-3.0 网页自动化（ego JS 通道，纯音乐开关轮询）
tools/vocal_remove.py  demucs 人声分离（带人声曲 → 伴奏）
assets/         bgm 曲库 / voice 音轨锁定 / productions/ 作品库
```

## 三种音轨模式对照

| 模式 | 触发 | 配音 | 字幕时间轴 | 适用 |
|---|---|---|---|---|
| TTS（默认） | 不传 --external-audio | speech-2.8-hd 按句合成 | ffprobe 实测逐句 | 无真人解说时 |
| **外部解说** | `--external-audio x.mp3` | 现成专业录音原样使用 | ASR 词级对齐（句级精确字幕） | 有专业配音（如胡总解说） |
| 混合 | TTS 出稿 + 后期换轨 | — | — | 先 TTS 预览、后期换真人 |

## 资产结构

```
assets/
├── bgm/                曲库（styles.<style>.bgm 映射，缺文件自动跳过不阻断）
│   └── _archive/       作废/备用曲留档
├── voice/              解说音轨锁定库（README 有校验和护栏）
└── productions/        作品库（自包含资产包，归档规范见其 README）
```

**纪律**：`out/` 是工作目录，随时被下次生成覆盖 —— 终版产出必须下沉 `assets/productions/`。

## 已知坑（全部实测踩过，代码已防御）

| 坑 | 防御 |
|---|---|
| 速创生图双端点轮流维护 | 三通道 fallback（flare→基础版→image-01-live） |
| 速创 TTS/生图返回 **hex** 编码 | bytes.fromhex（非 base64） |
| 速创基础版收 **form** 表单 | JSON body 会报"KEY 不正确" |
| 首帧 URL 失效白烧计费 | 提交前 HEAD 预检（生产引擎同款） |
| MiniMax Music API 关停（410） | BGM 走 Music-3.0 网页曲库 |
| 语气词标签仅 speech-2.8 系生效 | 旧模型会把 (laughs) 念出来 |
| libass 默认 PlayRes=288 | force_style 显式 PlayRes，字号按此标定 |
| 长段字幕糊满画面 | 按句切条 + 逗号二级切分（单条 ≤2 行） |
| amix 默认 1/n 衰减压人声 | normalize=0 |
| work/ 片段缓存失配 | 片段文件名带时长指纹 |
| Music-3.0 纯音乐开关 | 点击后必须轮询验证 aria-checked，提交前再验一次；生成后 ASR 验无人声 |

## 密钥

`get_keys.py` 从生产容器（ssh zhiming → backend 容器 get_settings）拉取
MINIMAX / WUYINKEJI 两组 key，缓存 `.keys.json`（24h TTL，已 gitignore）。
密钥本身永不入库。
