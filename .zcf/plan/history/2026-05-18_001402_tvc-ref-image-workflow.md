# TVC 双参考图工作流重构

## 任务
修改TVC工作逻辑：生图只生成主参考图(人物/产品)+场景设计图 → 送入Seedance 2.0(first_frame+last_frame) + 分镜头文字提示词 → 驱动视频生成

## 方案
方案1：双参考图+文字提示词驱动

## 修改文件
1. `backend/app/api/v2/workflow_tasks.py` — _build_nodes() subtask + 积分公式
2. `backend/app/api/v2/tvc_engine.py` — Step 2/3/4/5 全部适配新结构
3. `backend/app/api/v2/tvc_providers.py` — Seedance provider 增加 prompt 参数

## 状态
执行中
