# TVC 模板深度优化

**创建时间**: 2026-05-12 12:08:09
**状态**: 执行中

## 修复清单（P0→P1→P2）

### P0 功能缺陷
1. submit 端点增加积分校验
2. _optimize_prompts / _breakdown_shots 实际调用 GLM
3. 修复 shot_idx 计算错误

### P1 体验/稳定性
4. video_model 参数对齐（前端提交时传 video_model/image_model）
5. 生图加重试机制（max_retries=3）
6. 一键提交读取级联参数（非 hardcode）
7. SSE 心跳（15s ping）

### P2 代码质量
8. import httpx 提到文件顶部
9. 扁平化数据流（去掉层层 source 嵌套）
10. 模板类型断言修复

## 涉及文件
- backend/app/api/v2/workflow_tasks.py（主文件，步骤1-9）
- src/components/nanoai-workflow/nodes/TvcScriptNode.tsx（步骤10-11）
- src/components/nanoai-workflow/templates/tvcVideo01.ts（步骤12）
