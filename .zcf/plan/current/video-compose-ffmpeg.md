# 任务：视频合成 FFmpeg 深挖对接

> 规划类型：需求规划 | 创建：2026-09-15 | 状态：待评审

## 目标定义

TVC 工作流第 4 步（视频合成）目前 FFmpeg 能力简陋（硬切拼接 + 简单混音），前端暴露的参数（transition 等）后端收到即丢弃。本任务深挖 FFmpeg 能力并对接到工作流，让"广告片合成"达到可交付质量。

## 现状盘点

### 后端 compose（`workflow_tasks.py:246-393`）

| 能力 | 状态 | 说明 |
|------|------|------|
| 下载分镜视频 | ✅ | httpx 到 tmpdir |
| normalize | ✅ | scale+pad+libx264 crf23 |
| 拼接 | ⚠️ | concat demuxer **硬切** |
| **transition 参数** | ❌ **收到即丢** | `ComposeRequest.transition="fade"` 全程未使用 |
| BGM 混音 | ⚠️ | amix 简单混，无 fade in/out、无 loudnorm |
| 分辨率 | ⚠️ | 单档（RESOLUTION_MAP 只取一档输出）|
| 字幕/overlay | ❌ | 无 |
| 进度上报 | ❌ | 同步阻塞单请求（60s+ 超时风险）|

### cli-agent（TS 独立包，与 backend 脱节）

7 操作完备：concat / amix / overlay / subtitles / normalize / compare / extractAudio
+ 4 阶段 pipeline（concat→compare→subtitle→bgm→finalize）+ MCP + Fastify HTTP。
**但 backend compose 完全没调用它**（语言/部署边界，MCP stdio 不适合后端热路径）。

### 前端（`StoryboardVideoNode.tsx:23-27`）

参数已完备并传后端：`transition / outputFormat / resolution / enableBgmMix / bgmVolume`
（BGM 节点另有 `fadeIn / fadeOut / source / volume`）

## 功能分解与优先级

### P0 — 转场真实现（xfade）

**问题**：前端选 fade、文档承诺 fade，实际硬切。

**方案**：ffmpeg `xfade` filter 链式叠加
```bash
# N 段视频 xfade：
# [0][1]xfade=transition=fade:duration=0.5:offset=(d0-0.5)[v01];
# [v01][2]xfade=...:offset=(d0+d1-1.0)[v012]...
```
- 转场类型映射：`fade / dissolve / wipeleft / slideup / circleopen / cut(不叠=纯 concat)`
- offset 计算：累积时长 - 累积转场时长
- 兼容性：xfade 需重编码（不能 copy）→ 与 normalize 合并成一次编码
- 转场时长：参数化（默认 0.5s，可视 shot_duration 自适应）

**验收**：`transition=fade` 输出视频在分镜边界有 0.5s 渐变（ffprobe 帧差可检）

### P1 — BGM 精细处理

**问题**：无 fade in/out（前端 BGM 节点有参数但没传到 compose）、响度不统一。

**方案**：
- `ComposeRequest` 加 `bgm_fade_in: float = 1.0` / `bgm_fade_out: float = 1.5`
- filter chain：`[1:a]afade=t=in:d=1,afade=t=out:st=(总长-1.5):d=1.5,loudnorm=I=-16:TP=-1.5[bgm]`
- amix 后整体 `alimiter` 防削波
- 无原声时（分镜视频通常无音轨）：BGM 直接 map，不走 amix

**验收**：BGM 开头 1s 淡入、结尾 1.5s 淡出；峰值 ≤ -1.5dBFS

### P2 — 多规格输出 + 质量档

**问题**：单档输出；crf/preset 硬编码。

**方案**：
- `resolution: "all"` → 一次合成 1080p + 720p 双档（cli-agent OUTPUT_PRESETS 同款）
- `quality: "high/standard/draft"` → 映射 crf(18/23/28) + preset(slow/fast/veryfast)
- 输出命名：`tvc_{id}_1080p.mp4` / `tvc_{id}_720p.mp4`

**验收**：一次请求产出双档；同源双档 ffprobe 分辨率正确

### P3 — 字幕烧录（TVC 广告必备）

**问题**：广告片常需花字/字幕，当前无。

**方案**：
- `ComposeRequest` 加 `subtitles: Optional[list[SubtitleCue]]`（text + start + end + style）
- 生成 SRT/ASS → `ffmpeg -vf subtitles=file.ass`
- 样式模板：TVC 常用（底部居中、描边、品牌字体）

**验收**：字幕在对应时间轴出现、样式正确

### P4 — Ken Burns（静图转视频，可选）

TVC 有时用静态参考图做平移/缩放；`zoompan` filter。低优先级，视需求。

### P5 — 健壮性与进度

- compose 改**异步任务**（复用 workflow_executor 状态机）→ 返回 task_id + SSE 进度
- 或最简：`subprocess` 超时提到 300s + 步骤日志
- 错误分步上报（下载失败/转码失败/拼接失败 各返回明确 code）

**验收**：10 段视频合成无超时；每一步失败有明确错误码

## 实施步骤

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| 1 | 抽 `backend/app/services/video_compose.py` | service + 单测骨架 | - |
| 2 | xfade 转场（P0） | transition 映射 + 链式 xfade | 1 |
| 3 | BGM fade + loudnorm（P1） | filter chain | 1 |
| 4 | 多规格 + 质量档（P2） | 双档输出 | 1 |
| 5 | 前端透传 bgm fade 参数 | StoryboardVideoNode + BGMNode | 3 |
| 6 | 字幕（P3） | ASS 生成 + subtitles filter | 1 |
| 7 | 集成测试 | e2e compose 用例扩展 | 2-6 |
| 8 | （评估）cli-agent 能力对齐 | 决策记录 | - |

## 验收标准

- ✅ transition=fade 真出转场（对比 ffprobe 帧）
- ✅ BGM fade in/out + 响度达标
- ✅ 多规格一次产出
- ✅ `pytest tests/unit/test_video_compose.py` 覆盖核心 filter 构建逻辑
- ✅ TVC 全链路（含合成）e2e 通过
- ✅ 现有 compose 调用不破坏（向后兼容：transition 缺省 = cut）

## 风险

1. **xfade 重编码开销**：N 段 720p xfade 需 2-5 分钟；P5 异步化一定要做
2. **xfade 兼容性**：要求同分辨率/帧率/像素格式——normalize 步骤必须统一到 yuv420p
3. **cli-agent 双实现漂移**：后端独立实现后，cli-agent 管线用于本地/离线场景，需文档标注边界
4. **字体依赖**：字幕需容器内装中文字体（思源黑体），Dockerfile 需加

## 关联

- 现有实现：`backend/app/api/v2/workflow_tasks.py:246-393`（compose 端点）
- cli-agent：`cli-agent/src/core/ffmpeg.ts`（7 操作参考实现）
- 前端：`src/components/nanoai-workflow/nodes/StoryboardVideoNode.tsx`
- 相关 memory：[tvc-coverage-e2e-2026-09-15]（产物转存 bug——合成后同样需要转存 COS/本地）
