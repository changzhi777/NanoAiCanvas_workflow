# BGM 曲库

管线按 `config.yaml → styles.<style>.bgm` 自动选曲，`volume 0.25` 混入。
缺文件不阻断（成片降级为纯口播并打印警告）。

## 入库流程（Music-3.0 网页生成，免费）

前置：本机 ego 浏览器已登录 minimax.cn（微信登录一次，长期有效）。

**关键突破**：ego SDK 的 `helpers.js()` 可直接执行页面 JS —— a11y 快照(snapshotText)
在该页面 2–3 次后会卡死，`js()` 完全绕过它，是本流程唯一可靠交互通道。

```bash
# 1. 填词 + 开纯音乐 + 创作（改 PROMPT 文本复用）
ego-browser nodejs < tools/bgm/1_fill_and_create.js 

# 2. 等生成完成（创作约 2-4 分钟）+ 提取音频 URL
ego-browser nodejs < tools/bgm/2_wait_and_extract.js
#   提取方式：定位作品卡 → 派发完整指针序列点击封面 → 读 document.querySelector('audio').currentSrc
#   ⚠ 勿用 /v1/api/audio/history_list（TTS 语音线，返回 25KB/32kHz 预览陷阱）

# 3. 下载入库（必带 Referer，否则 CDN 拒绝）
curl -sL "<AUDIO-URL>" -H "Referer: https://www.minimaxi.com/audio/music" \
     -H "User-Agent: Mozilla/5.0" -o assets/bgm/<风格槽>.mp3
```

## 交互要点（React 受控组件）

- **switch / 按钮**：`.click()` 无效，需完整序列
  `pointerdown → mousedown → pointerup → mouseup → click`（PointerEvent + MouseEvent）
- **textarea 填值**：native setter（`Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set`）
  + `dispatchEvent(new Event('input', {bubbles:true}))`
- **未登录时**计数器和 onChange 被登录墙拦截（填了也不生效）—— 先确认已登录

## 现有曲目

| 文件 | 曲名 | 风格槽 | 时长 |
|---|---|---|---|
| tech_clean.mp3 | 零度静默 (Zero-Degree Silence) | tech | 3:55 |
| culture_slow.mp3 | （待入库） | culture | — |

## 生成用 prompt 模板

- **tech**：极简科学纪录片配乐：柔和钢琴主题，温暖弦乐铺底，轻电子脉冲点缀如远处无线电信号，60BPM 慢板，安静克制、好奇深邃，纯音乐无人声，时长约60秒
- **culture**：中国传统古风配乐：古琴与箫为主，空灵悠远，慢板，安静内省，书卷气与山河意境，留白呼吸感，纯音乐无人声，时长约60秒

（成本：600 声贝/首；当前账户 9,138 声贝 ≈ 15 首）
