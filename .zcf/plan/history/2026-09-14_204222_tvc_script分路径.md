# 任务：tvc_script 智能分路径

## 上下文
- 现有 Step 1 任何情况先打 GLM
- 有图也先打 GLM 浪费图

## 计划
| # | 任务 |
|---|------|
| 1 | execute_tvc Step 1 加 has_ref_image 分流 |
| 2 | 推送+部署+端到端（带图/无图两路） |

## 验收
- 带图：直接 minimax，不打 GLM
- 无图：走 GLM
