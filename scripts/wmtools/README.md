# wmtools — 隐形水印/内容凭证工具套件

为 NanoAiCanvas 生成物（NB21 图像 / H3 视频 / TTS 音频）提供：**合规元数据标识（C2PA）+ 像素隐形水印 + 内容指纹库 + 三层检测**。

研究依据：`.zcf/plan/current/隐形水印研究.md`（17 维度 + 本机实测矩阵）。

## 快速开始

```bash
# 一条龙（幂等）：嵌入水印 → 清洗元数据 → C2PA 签名 → 指纹入库
python3 wm_cli.py pipeline <图或视频> --project <项目名> --generator "NB21|H3"

# 检测（三层 → 证据分级报告）
python3 wm_cli.py detect <文件> [--out report.json]

# 分步操作
python3 wm_cli.py id --project henry8          # 生成 128-bit ID
python3 wm_cli.py embed <输入> --project henry8 # 仅嵌水印
python3 wm_cli.py clean <视频>                  # 剥元数据（含 H3 workflow Prompt，防泄露）
python3 wm_cli.py sign <文件> --meta '{"k":"v"}' # 仅签名
python3 wm_cli.py fingerprint <文件>            # 指纹入库
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
- **图像**：dwtDctSvd（⚠️ 勿用 dwtDct——argmax 漂移缺陷，大图误码 58%）；PSNR ~40dB
- **视频**：首帧+中点帧 overlay → 单命令重编码 CRF18（`-force_key_frames` 保 IDR），检测抽首/中/尾（尾帧为阴性对照）
- **检测端**：多基准尺寸回采（原生→NB21 2K→H3 768P→1080p→720p），RS 解码成功即命中（误判率趋近零）
- 实测存活：JPG q85 ✅ / H.264 crf23 ✅ / 缩放+回采 ✅（含**缩小一半直检**） / 噪声 ✅ / 亮度 🟡（RS 兜底）

## 依赖（pinned，变更须回归实测矩阵）

- Python 3.14 · invisible-watermark · opencv · numpy 2.x · imagehash · Pillow · **reedsolo**
- c2patool **0.27.22**（brew）· ffmpeg · exiftool（brew）
- 外部服务：无（全本地 CPU）

## 发布合规（《标识办法》2025-09-01）

1. 发布 AI 内容时在平台内**主动声明**（抖音/视频号声明功能）——显式标识
2. `pipeline` 自动写入 C2PA 元数据隐式标识——强制项
3. 数字水印已嵌入——鼓励项
4. 管线产物自带元数据清洗（H3 workflow Prompt 不外泄）
