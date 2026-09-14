# 任务：M3 改 Anthropic 兼容端点（+ 开关）

## 上下文
- v2.13.123 M3 走 minimax chat/completions 3.5s 输出有 reasoning_content 噪音
- minimax 国内端 /anthropic/v1/messages 2.8s 无噪音（实测）
- 加 cfg 开关 vision_endpoint = "anthropic" | "openai" 兼容回退

## 计划
| # | 任务 |
|---|------|
| 1 | _describe_with_minimax_m3 加 endpoint switch |
| 2 | _call_minimax_tvc_script use_vision 块加 endpoint switch |
| 3 | config.py 加 IMG_DESC_VISION_ENDPOINT 默认 anthropic |
| 4 | 部署+端到端验证（清缓存+提交+查DB描述）|

## 验收
- 默认 anthropic 端点工作（2.8s + 纯描述）
- openai 端点 fallback 也工作
- 描述写入 DB 无 reasoning 噪音
