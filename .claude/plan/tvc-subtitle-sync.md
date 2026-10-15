# TVC 字幕精确同步 — 执行计划（脚本时间轴 + H3 锚定 + 烧录一体化）

> 状态：待执行
> 日期：2026-10-04
> 前置讨论：十版字幕实验（V7-V16）+ 六维深挖 + 三轮审查优化
> 核心思路：**脚本先行时间轴**（单一真相源）→ H3 音画锚定 → SRT 同源生成 → 烧录一体化

## 定案汇总

| 决策点 | 定案 |
|--------|------|
| 时间轴权威源 | **A 脚本先行**——DS4 输出 dialogue_timeline |
| 字幕位置 | **固定底部 10%**，白字黑边 52px |
| 时间粒度 | **逐台词行**（15s 内 4-6 屏） |
| 字幕版本 | **单版本烧死**（不做双版本/VTT/track/在线渲染） |
| 烧录策略 | **生成链必经步骤**（step 5.5），失败优雅降级 |
| 多语言 | 架构预留（sub_zh.srt 命名 + meta language 字段），Phase 2 实施 |
| 效率 | 烧录与 BGM 并行 + veryfast 编码 + 无台词短路 |

## Phase 0：容器环境验证（前置依赖）

```bash
# 三连测（在 nanoai-backend-1 容器内）
1. ffmpeg -filters | grep subtitles          # libass 滤镜存在
2. fc-list | grep -i "noto.*cjk"             # 中文字体可达
3. 实际烧录一段中文测试 SRT                    # 端到端可用
```
任一失败 → 回退 PIL overlay 方案（V16 已验证工艺）。

## M1：剧本阶段——dialogue_timeline 生成

### 1.1 剧本 prompt 升级（glm_proxy.py TVC_SCRIPT_PROMPT）

在现有 JSON schema 基础上新增 `dialogue_timeline` 字段，附三条规则：
```
台词时间轴规则：
1. 按 3.5 个汉字/秒 估算每句时长
2. 首句从 0.5s 开始（视频起始短暂静默）
3. 末句在 12.0s 前结束（留 3s 给产品 KV 定格）
4. 相邻台词间隔至少 0.5 秒

输出格式：
"dialogue_timeline": [
  {"line": "宇宙这么大，什么才是最重要的？", "start": 0.5, "end": 3.8},
  {"line": "有人研究宇宙，有人探索未知……", "start": 4.3, "end": 8.0}
]
```

### 1.2 剧本解析容错

tvc_engine 剧本解析处增加 dialogue_timeline 提取（与 shots/narration 同层），缺失时 fallback 从 shots[].dialogue 估算（3.5 字/秒）。

## M2：H3 编译器——音画锚定 + clean frame

### 2.1 Shot 边界对齐（h3_prompt.py compile_h3_prompt）

story_shots 的时间轴从 dialogue_timeline 推导（不再均匀分配）：
```python
# 现有：seg = kv_cut / n_shots（均匀）
# 改为：seg 边界 = dialogue_timeline 的 start/end（非均匀）
```

### 2.2 时窗声明

每个 Shot 描述追加时间窗：
```
[Shot 1] (00:00.000 to 00:04.000) ... (S1) says: <d>[Chinese] ...</d> spoken precisely within this time window.
```

### 2.3 Clean frame（H3 原生字幕抑制）

- 删除 dialogue 与 on-screen text 的绑定
- 画面描述追加 `clean frame, no burned-in text overlays`
- `<d>` 照写（要声音），字幕文本变量同时喂 SRT（单一变量源）

### 2.4 字幕文本单一变量源

```python
for shot in story_shots:
    line = shot["line"]  # ← 同一变量
    h3_prompt += f"<d>[Chinese] {line} </d>"       # 消费者 1
    srt_entries.append({"text": line, "start": ...})  # 消费者 2
```

## M3：SRT 生成器（新模块）

### 3.1 services/srt_generator.py

```python
def generate_srt(dialogue_timeline: list[dict], video_duration: float) -> str:
    """dialogue_timeline → SRT 文本

    内置：
    - 语速校验：duration/char_count 超出 2-6 字/秒范围时修正至 3.5 字/秒
    - 自动换行：>14 字折两行（768px/52px ≈ 14 字/行）
    - 末行截断：确保 end <= video_duration
    """
```

### 3.2 烧录命令（容器内）

```bash
ffmpeg -i {video} -vf "subtitles={srt}:force_style='FontSize=24,MarginV=30,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3'" \
  -c:v libx264 -preset veryfast -crf 22 -c:a copy -movflags +faststart {output}
```

## M4：引擎集成——step 5.5 + 资产 + 验收闸

### 4.1 tvc_engine step 5.5（视频生成后、资产入库前）

```python
# _generate_videos 内，主视频下载后：
if req.voice_gender != "none" and dialogue_timeline:
    srt_content = generate_srt(dialogue_timeline, video_duration)
    burned_path = burn_subtitles(video_local_path, srt_content)
    # 烧录与 BGM 并行（asyncio.gather 已有）
```

### 4.2 烧录失败优雅降级

```python
try:
    burned = await burn_subtitles(...)
except Exception as e:
    logger.warning(f"subtitle burn failed: {e}")
    burned = None  # 用干净版
    # SRT 照常入库
```

### 4.3 资产入库

- 烧录版视频（或降级干净版）→ COS → video 资产
- SRT 文件 → COS `tvc/{task_id}/sub_zh.srt` → text 资产（meta: format=srt, language=zh, asset_role=subtitle）
- COS 双文件并行上传

### 4.4 验收闸 +subtitle_data_sync

纯数据比对（零模型调用）：
- SRT 存在且行数 = dialogue_timeline 行数
- 时间戳单调递增且在视频时长内
- 字幕文本 = dialogue_timeline 的 line（strip 换行归一化后比对）

### 4.5 无台词短路

`voice_gender == "none"` 时跳过整个字幕链（SRT/烧录/资产/审查）。

## M5：部署 + E2E 验证

### 5.1 部署
增量构建（缓存命中秒级）+ 容器 grep 特征串验证。

### 5.2 E2E：三体翅桶 V17（全字幕链）

- 提交全锚点任务（男声 + 多镜头 + KV 尾帧）
- 验证：剧本含 dialogue_timeline → H3 Schema 含时窗声明 → 成片字幕精确同步（抽帧 4 点验证时序）→ SRT 资产入库 → 验收闸 subtitle_data_sync 通过
- 展示页正常（视频已带字幕，零改动）

## 改动文件清单

| 文件 | 改动 | 量级 |
|------|------|------|
| `backend/app/api/v2/glm_proxy.py` | TVC_SCRIPT_PROMPT + dialogue_timeline 规则 | ~30 行 |
| `backend/app/services/h3_prompt.py` | Shot 对齐 timeline + 时窗声明 + clean frame + 单一变量源 | ~60 行 |
| `backend/app/services/srt_generator.py` | 🆕 SRT 生成 + 语速校验 + 换行 + 烧录命令 | ~120 行 |
| `backend/app/api/v2/tvc_engine.py` | step 5.5 集成 + 降级 + 资产 + dialogue_timeline 提取 | ~80 行 |
| `backend/app/models/tvc_acceptance.py` | +subtitle_data_sync criteria | ~5 行 |
| `backend/app/services/acceptance.py` | +subtitle_data_sync 数据比对 | ~30 行 |
| `backend/tests/unit/test_srt_generator.py` | 🆕 SRT 生成器单测 | ~100 行 |
| `backend/tests/unit/test_h3_prompt.py` | +时窗/clean frame 测试 | ~30 行 |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 容器无 libass | Phase 0 验证 + PIL overlay 兜底 |
| H3 音频不跟时窗 | 时窗是软约束（±1s 容差）；验收闸数据比对兜底 |
| DS4 时间轴不合理 | 语速校验自动修正（3.5 字/秒） |
| 烧录失败 | 优雅降级（干净版 + SRT 入库 + 日志提示） |
