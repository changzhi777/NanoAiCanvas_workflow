# wmtools — 隐形水印/内容凭证工具套件（双引擎）

为 NanoAiCanvas 生成物（NB21 图像 / H3 视频 / TTS 音频）提供：**双层水印（频域+深度学习）+ 合规元数据标识（C2PA）+ 内容指纹库 + 多引擎检测**。

研究依据：`.zcf/plan/current/隐形水印研究.md`（19 维度 + 本机实测矩阵）。

## 双引擎架构

| 层 | 引擎 | 域 | 抗性实测 | 开销 |
|---|---|---|---|---|
| **L1 light** | freq（dwtDctSvd + RS(20,8)） | 图/视频 | JPG q85+/单压/缩放回采 | 全 CPU 秒级 |
| **L2 deep** | wam（Meta WAM，MPS/CPU） | 图像 | q60/q30/截屏/裁剪 **全 100%** | 首载 ~20s，单图秒级 |
| **L2 deep** | videoseal（Meta Video Seal v1.0，CPU） | 视频 | crf30 二压/缩放 50% **全 100%** | 每片 ~8 分钟 |

- `--tier light`（默认）：仅 L1，日常批量
- `--tier deep`：L1+L2 双嵌（快速核验 + 强抗性并存），价值内容用
- L2 缺失时自动降级 L1 并提示；`bash setup_engines.sh` 幂等安装（vendor/ 不进 git）

## 快速开始

```bash
bash setup_engines.sh                 # 首次：装 L2 深度引擎（WAM + Video Seal）

# 一条龙（幂等）：嵌入（L1[+L2]）→ 清洗 → C2PA 签名 → 指纹入库
python3 wm_cli.py pipeline <图或视频> --project <项目名> --generator "NB21|H3" [--tier deep]

# 检测（多引擎 → 证据分级报告）
python3 wm_cli.py detect <文件> [--tier deep] [--out report.json]

# 分步操作
python3 wm_cli.py id --project henry8          # 生成 64-bit ID
python3 wm_cli.py embed <输入> --project henry8 [--engine freq|wam|videoseal]
python3 wm_cli.py clean <视频>                  # 剥元数据（含 H3 workflow Prompt，防泄露）
python3 wm_cli.py sign <文件> --meta '{"k":"v"}' # 仅签名
python3 wm_cli.py fingerprint <文件>            # 指纹入库
python3 wm_cli.py selftest                      # 分引擎健康自检
```

## 证据分级（detect 输出）

| 级别 | 含义 |
|---|---|
| `OURS_SIGNED` | C2PA 凭证含本管线标识（com.nanocanvas.meta）——铁证 |
| `ID_MATCH` | 解码出水印 ID 且在指纹库内——铁证 |
| `WM_FOUND` | 解码出合法 ID（CRC 通过，不在库）——强证据 |
| `SIGNED` | 有第三方 C2PA 凭证 |
| `DIST_MATCH` | pHash 命中库内内容（水印失效时兜底） |
| `PROBABLE_AI` | 元数据含 AI 声明 |
| `UNKNOWN` | 无信号 |

## 技术路线（实测背书）

- **ID**：64-bit（magic 8b + 项目 hash 16b + 日期 16b + 序号 24b），全局唯一
- **纠错**：**RS(20,8)**（reedsolo，纯 Python）——纠 ≤6 字节错；实测 720p + LINEAR 双缩放 + JPG 压力档（位误码 1%）完整恢复
- **图像 L1**：dwtDctSvd（⚠️ 勿用 dwtDct——argmax 漂移缺陷，大图误码 58%）；PSNR ~40dB
- **视频 L1**：overlay（首/中帧，秒级）或 **all_frames 全帧模式**（deep 档：每帧含完整 RS 位流，任意帧可验）
- **图像 L2**：WAM（MPS/CPU）——q60/q30/截屏/裁剪全 100%（维度十八）
- **检测端**：多基准尺寸回采（原生→NB21 2K→H3 768P→1080p→720p），RS 解码成功即命中（误判率趋近零）
- **压缩存活边界（中帧实测）**：crf18 ✅ / crf23 ✅ / **crf28+ ❌**——重压域像素水印物理失效，靠 C2PA 凭证 + pHash 指纹兜底（DIST_MATCH 已实证）
- VideoSeal 引擎为**实验性**（`--engine videoseal`）：M 系列 CPU 可跑，但其嵌入行为对帧数/消息图案敏感（未文档化），待官方后续版本再入主路径

## 依赖（pinned，变更须回归实测矩阵）

- Python 3.14 · invisible-watermark · opencv · numpy 2.x · imagehash · Pillow · **reedsolo**
- c2patool **0.27.22**（brew）· ffmpeg · exiftool（brew）
- L2 可选：torch 2.13+（MPS/CPU）· WAM/VideoSeal 仓库与权重（setup_engines.sh 自动）
- 外部服务：无

## 发布合规（《标识办法》2025-09-01）

1. 发布 AI 内容时在平台内**主动声明**（抖音/视频号声明功能）——显式标识
2. `pipeline` 自动写入 C2PA 元数据隐式标识——强制项
3. 数字水印已嵌入——鼓励项
4. 管线产物自带元数据清洗（H3 workflow Prompt 不外泄）
