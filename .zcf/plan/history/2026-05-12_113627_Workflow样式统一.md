# Workflow 节点样式统一计划

**创建时间**: 2026-05-02 18:53:08
**状态**: 进行中

## 目标
Workflow节点向Canvas靠拢，统一节点卡片和连线样式

## 计划内容

### 阶段 A：节点卡片改造
1. BaseNode 头部 - 扁平化，移除渐变
2. 按钮样式 - 移除3D效果
3. 阴影风格 - 统一为简洁单色阴影
4. 边框 - 统一为 border-border/50

### 阶段 B：连线改造
5. Workflow Canvas 注册 CustomEdge
6. 添加 Workflow 节点类型颜色映射

## 参考
- Canvas CardNode: `/src/components/canvas/nodes/CardNode.tsx`
- Workflow BaseNode: `/src/components/nanoai-workflow/nodes/BaseNode.tsx`
- CustomEdge: `/src/components/nanoai-workflow/nodes/CustomEdge.tsx`
- nodeColors: `/src/components/nanoai-workflow/nodes/nodeColors.ts`