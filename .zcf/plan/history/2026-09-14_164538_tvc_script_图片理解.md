# 任务：tvc_script 节点 minimax M3 + VL-01 视觉理解改造

## 上下文
- 现有 tvc_script 节点 UI 已有 referenceImage 字段（base64）
- 后端 _call_minimax_tvc_script 用 M2.7，完全忽略 referenceImage
- 目标：VL-01 视觉理解 → 拼到 M2.7 剧本 prompt
- 端点 api.minimax.cn（已切）
- minimax M3 多模态已实测通

## 计划
| # | 任务 |
|---|------|
| 1 | curl 验 minimax /v1/vision 真实端点 |
| 2 | tvc_engine.py 加 _describe_image_with_vl01 辅助函数 |
| 3 | Pydantic TvcScriptRequest 加 image_description 字段 |
| 4 | _call_minimax_tvc_script 拼图描述到 user content |
| 5 | 流水线 Step0 注入（referenceImage 存在则调 VL-01）|
| 6 | 改完建镜像部署 |
| 7 | curl 端到端：带图/无图两路验证 |
| 8 | 推送 main |

## 验收
- 无图调用：与改造前一致
- 有图调用：剧本包含产品/场景特征描述
- VL-01 失败：自动 fallback，不报错
