# NanoAI Video Compose CLI

FFmpeg 驱动的自动视频合成 CLI 工具，支持分镜头拼接、字幕烧录、BGM 混流、前后对比。

## 安装

```bash
cd cli-agent
pnpm install
```

依赖：FFmpeg（需在 PATH 中或通过环境变量/配置文件指定）

## 环境设置

### 诊断检查

```bash
# 一键检查 FFmpeg 环境、Filter 支持和当前配置
pnpm dev setup
```

### 配置管理

```bash
# 生成本地配置文件
pnpm dev setup --init

# 生成全局配置
pnpm dev setup --init --global

# 修改单项配置
pnpm dev setup --ffmpeg-path /usr/local/bin/ffmpeg
pnpm dev setup --default-preset 4k
pnpm dev setup --default-volume 0.5
pnpm dev setup --asset-dir /path/to/assets
pnpm dev setup --api-port 3200
```

### 配置文件

支持两级配置（项目级 `.nanoairc.json` > 全局 `~/.nanoai/.nanoairc.json`），环境变量优先级最高。

```json
{
  "ffmpeg": {
    "path": "ffmpeg",
    "ffprobePath": "ffprobe"
  },
  "output": {
    "preset": "1080p",
    "formats": ["1080p"],
    "directory": "./output"
  },
  "bgm": {
    "defaultVolume": 0.3
  },
  "subtitle": {
    "fontSize": 16,
    "color": "&HFFFFFF",
    "outlineColor": "&H000000",
    "outlineWidth": 2,
    "position": "bottom"
  },
  "asset": {
    "enabled": false,
    "directory": "../backend/chat-uploads/assets"
  },
  "api": {
    "port": 3100,
    "host": "0.0.0.0"
  }
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FFMPEG_PATH` | ffmpeg 二进制路径 | `ffmpeg` |
| `FFPROBE_PATH` | ffprobe 二进制路径 | `ffprobe` |
| `API_PORT` | HTTP API 端口 | `3100` |

## CLI 命令

### setup — 环境诊断与配置

```bash
pnpm dev setup              # 诊断环境
pnpm dev setup --init       # 生成配置文件
pnpm dev setup --init --global  # 全局配置
```

### compose — 完整合成管线

4 阶段管线：拼接 → 对比 → 字幕 → BGM + 多规格输出

```bash
pnpm dev compose -c clip1.mp4 clip2.mp4 clip3.mp4 \
  --bgm bgm.m4a \
  --subtitles subs.json \
  --preset 1080p \
  --output my_video

# 保存到后端资产库
pnpm dev compose -c clip1.mp4 clip2.mp4 \
  --bgm bgm.m4a \
  --save-asset
```

### concat — 快速拼接

```bash
pnpm dev concat -i clip1.mp4 clip2.mp4 clip3.mp4
```

### compare — 前后对比分屏

```bash
pnpm dev compare -i original.mp4 -r result.mp4 --layout side-by-side
```

### subtitle — 字幕烧录

```bash
pnpm dev subtitle -i video.mp4 --subs subs.json
```

### bgm — BGM 混流

```bash
pnpm dev bgm -i video.mp4 --audio bgm.m4a --volume 0.3
```

## MCP Server

```bash
pnpm mcp
```

4 个工具：`compose`、`concat`、`compare`、`status`

## HTTP API

```bash
pnpm serve
# 默认端口 3100（可通过配置或环境变量修改）
```

端点：
- `POST /api/compose` — 提交合成任务
- `GET /api/tasks` — 任务列表
- `GET /api/tasks/:id` — 任务状态
- `GET /api/health` — 健康检查

## 字幕 JSON 格式

```json
[
  {"start": 0, "end": 3, "text": "第一幕"},
  {"start": 3, "end": 6, "text": "第二幕"}
]
```

## 输出预设

| 预置 | 分辨率 | 帧率 | 编码 |
|------|--------|------|------|
| `720p` | 1280x720 | 30 | H.264 |
| `1080p` | 1920x1080 | 30 | H.264 |
| `4k` | 3840x2160 | 30 | H.264 |
| 自定义 | `WxH@fps` | - | H.264 |

## 测试

```bash
pnpm test
```

## 项目集成

- 前端：`StoryboardVideoPanel` 属性面板 AI 剪辑 Tab
- 后端：`glm_proxy.py` 的 `/tvc-video-agent` 端点
- Skill：`VideoComposeSkill` 标准接口
