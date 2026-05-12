# 互换侧边栏节点和模板显示方式

## 任务
- 侧边栏：节点内联 → 模板内联
- 弹窗：模板弹窗 → 节点弹窗

## 修改文件
1. `WorkflowTemplates.tsx` — 从模板弹窗改为节点弹窗
2. `NanoaiWorkflowSidebar.tsx` — 从节点内联改为模板内联
3. `NanoaiWorkflowCanvas.tsx` — 调整回调和连线

## 状态：执行中
