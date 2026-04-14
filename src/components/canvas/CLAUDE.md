[根目录](../../CLAUDE.md) > [src](../) > [components](../) > **canvas**

---

# Canvas 模块 - 无限画布核心

> 基于 React Flow 的无限画布实现，支持节点拖拽、缩放、平移和连线

**最后更新**: 2026-04-15
**维护者**: NanoAiCanvas Team

---

## 模块职责

Canvas 模块是 NanoAiCanvas 的核心组件，负责：

- 渲染无限画布
- 管理节点和连线的可视化
- 处理用户交互（拖拽、缩放、平移）
- 集成 React Flow 的所有核心功能

---

## 入口与启动

### 主组件

**文件**: `Canvas.tsx`

```typescript
export default function Canvas() {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector(selectNodes)
  const edges = useAppSelector(selectEdges)
  // ...
}
```

**使用方式**:

```tsx
import Canvas from '@/components/canvas/Canvas'

<Canvas />
```

### 节点类型

**文件**: `nodes/CardNode.tsx`

```typescript
const CardNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  // 节点渲染逻辑
})
```

---

## 对外接口

### Canvas 组件

**Props**: 无（通过 Redux Store 获取数据）

**Redux Actions**:
- `onNodesChange`: 处理节点变化
- `onEdgesChange`: 处理连线变化
- `onConnect`: 处理新连接
- `setViewport`: 更新视口状态

### CardNode 组件

**Props**:
```typescript
interface NodeProps<NodeData> {
  data: NodeData
  selected: boolean
  id: string
  type: string
}
```

---

## 关键依赖与配置

### 依赖项

- `reactflow`: 画布核心库
- `@reduxjs/toolkit`: 状态管理
- `@/components/ui/card`: shadcn/ui Card 组件
- `@/components/ui/badge`: shadcn/ui Badge 组件

### 样式配置

**文件**: `canvas.css`

- 自定义 React Flow 样式
- 节点选中效果
- 连线样式

---

## 数据模型

### NodeData

```typescript
interface NodeData {
  id: string
  type: NodeType
  label: string
  description?: string
  status: NodeStatus
  color?: string
  icon?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
}
```

### EdgeData

```typescript
interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  color?: string
  type?: 'default' | 'straight' | 'step' | 'smoothstep'
  animated?: boolean
  createdAt: number
}
```

---

## 测试与质量

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] 节点渲染
- [ ] 连线创建
- [ ] 拖拽交互
- [ ] 缩放和平移

### 集成测试

**状态**: 未实现

**建议测试场景**:
- [ ] 创建节点流程
- [ ] 删除节点流程
- [ ] 连接节点流程

---

## 常见问题 (FAQ)

### Q: 如何添加新的节点类型？

A:
1. 在 `src/types/index.ts` 中定义新的 `NodeType`
2. 创建新的节点组件（参考 `CardNode.tsx`）
3. 在 `Canvas.tsx` 的 `nodeTypes` 中注册

### Q: 如何自定义节点样式？

A: 修改 `CardNode.tsx` 中的样式逻辑，或创建自定义节点组件。

### Q: 画布性能优化？

A:
- 使用 `memo` 包装节点组件
- 启用 React Flow 的虚拟化
- 控制节点和连线数量

---

## 相关文件清单

```
src/components/canvas/
├── Canvas.tsx              # 主画布组件
├── canvas.css              # 画布样式
└── nodes/
    └── CardNode.tsx        # 卡片节点组件
```

---

## 变更记录 (Changelog)

### 2026-04-15
- 初始化模块文档
- 完成核心功能实现
- 添加 7 种预定义节点类型
- 实现自动保存和快捷键支持
