[根目录](../../CLAUDE.md) > [src](../) > **store**

---

# Store 模块 - 状态管理中心

> Redux Toolkit 状态管理 + IndexedDB 持久化

**最后更新**: 2026-04-15
**维护者**: NanoAiCanvas Team

---

## 模块职责

Store 模块负责：

- 全局状态管理（Redux Toolkit）
- 数据持久化（IndexedDB）
- 异步操作处理（createAsyncThunk）
- 类型化的 Hooks

---

## 入口与启动

### Store 配置

**文件**: `store.ts`

```typescript
export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
})
```

**使用方式**:

```tsx
import { Provider } from 'react-redux'
import { store } from '@/store/store'

<Provider store={store}>
  <App />
</Provider>
```

### 类型化 Hooks

**文件**: `hooks.ts`

```typescript
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

---

## 对外接口

### Redux Slices

#### 1. canvasSlice

**文件**: `slices/canvasSlice.ts`

**State**:
```typescript
interface CanvasState {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
  viewport: { x: number; y: number; zoom: number }
}
```

**Actions**:
- `setNodes`: 设置节点列表
- `setEdges`: 设置连线列表
- `onNodesChange`: 处理节点变化
- `onEdgesChange`: 处理连线变化
- `onConnect`: 创建新连接

**Async Thunks**:
- `addNodeAsync`: 异步添加节点
- `addEdgeAsync`: 异步添加连线
- `updateNodeAsync`: 异步更新节点
- `deleteNodeAsync`: 异步删除节点
- `deleteEdgeAsync`: 异步删除连线
- `loadFromStorage`: 从存储加载数据

**Selectors**:
- `selectNodes`: 获取节点列表
- `selectEdges`: 获取连线列表
- `selectViewport`: 获取视口状态

#### 2. uiSlice

**文件**: `slices/uiSlice.ts`

**State**:
```typescript
interface UIState {
  selectedNodes: string[]
  selectedEdges: string[]
  panelOpen: {
    properties: boolean
    templates: boolean
    history: boolean
    layers: boolean
  }
  contextMenu: {
    open: boolean
    position: { x: number; y: number }
    target: string | null
  }
}
```

**Actions**:
- `setSelectedNodes`: 设置选中的节点
- `setSelectedEdges`: 设置选中的连线
- `togglePanel`: 切换面板显示状态
- `setPanelOpen`: 设置面板显示状态
- `openContextMenu`: 打开上下文菜单
- `closeContextMenu`: 关闭上下文菜单

**Selectors**:
- `selectSelectedNodes`: 获取选中节点
- `selectSelectedEdges`: 获取选中连线
- `selectPanelOpen`: 获取面板状态

#### 3. settingsSlice

**文件**: `slices/settingsSlice.ts`

**State**:
```typescript
interface SettingsState {
  theme: Theme
  locale: string
  autosave: boolean
  autosaveInterval: number
  gridSize: number
  snapToGrid: boolean
  showMiniMap: boolean
  showGrid: boolean
}
```

**Actions**:
- `setTheme`: 设置主题
- `setLocale`: 设置语言
- `setAutosave`: 设置自动保存
- `setAutosaveInterval`: 设置自动保存间隔
- `setGridSize`: 设置网格大小
- `setSnapToGrid`: 设置吸附网格
- `setShowMiniMap`: 设置小地图显示
- `setShowGrid`: 设置网格显示

**Selectors**:
- `selectAutosave`: 获取自动保存状态
- `selectAutosaveInterval`: 获取自动保存间隔
- `selectTheme`: 获取主题
- `selectLocale`: 获取语言

---

## 关键依赖与配置

### 依赖项

- `@reduxjs/toolkit`: Redux 工具集
- `react-redux`: React 绑定
- `reactflow`: React Flow 类型
- `idb`: IndexedDB 封装

### IndexedDB

**文件**: `db.ts`

**数据库名称**: `nanoai-canvas-db`
**版本**: 1

**对象存储**:
- `nodes`: 节点数据
- `edges`: 连线数据

**API**:
- `addNode`: 添加节点
- `addEdge`: 添加连线
- `updateNode`: 更新节点
- `deleteNode`: 删除节点
- `deleteEdge`: 删除连线
- `getAllNodes`: 获取所有节点
- `getAllEdges`: 获取所有连线
- `clearAll`: 清空所有数据
- `exportData`: 导出数据
- `importData`: 导入数据

---

## 数据模型

### CanvasState

```typescript
interface CanvasState {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
}
```

### UIState

```typescript
interface UIState {
  selectedNodes: string[]
  selectedEdges: string[]
  panelOpen: {
    properties: boolean
    templates: boolean
    history: boolean
    layers: boolean
  }
  contextMenu: {
    open: boolean
    position: { x: number; y: number }
    target: string | null
  }
}
```

### SettingsState

```typescript
interface SettingsState {
  theme: Theme
  locale: string
  autosave: boolean
  autosaveInterval: number
  gridSize: number
  snapToGrid: boolean
  showMiniMap: boolean
  showGrid: boolean
}
```

---

## 测试与质量

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] Redux slice reducers
- [ ] Async thunks
- [ ] Selectors
- [ ] IndexedDB 操作

---

## 常见问题 (FAQ)

### Q: 如何添加新的状态？

A: 在对应的 slice 中添加新的 state 字段和 action。

### Q: 如何持久化状态？

A: 使用 `createAsyncThunk` 和 IndexedDB，参考 `addNodeAsync`。

### Q: 如何优化性能？

A:
- 使用 `useAppSelector` 选择特定字段
- 避免在 selector 中进行复杂计算
- 使用 `reselect` 创建记忆化 selector

---

## 相关文件清单

```
src/store/
├── store.ts                 # Store 配置
├── hooks.ts                 # 类型化 Hooks
├── db.ts                    # IndexedDB 操作
└── slices/
    ├── canvasSlice.ts       # 画布状态
    ├── uiSlice.ts           # UI 状态
    └── settingsSlice.ts     # 设置状态
```

---

## 变更记录 (Changelog)

### 2026-04-15
- 初始化模块文档
- 完成 3 个 Redux slices
- 实现 IndexedDB 持久化
- 添加异步操作支持
