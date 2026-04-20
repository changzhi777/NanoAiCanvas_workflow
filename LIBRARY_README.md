# NanoAiCanvas 组件库

> 基于 React Flow 的无限画布组件库 - 可定制的节点编辑器

**版本**: 2.2.0
**License**: MIT
**作者**: IoTchange

---

## 📦 安装

```bash
# npm
npm install nanoai-canvas

# pnpm
pnpm add nanoai-canvas

# yarn
yarn add nanoai-canvas
```

### peerDependencies

您需要在项目中安装以下依赖：

```bash
# 必需的 peer dependencies
npm install react@^19.2.4 react-dom@^19.2.4
npm install react-redux@^9.1.2 @reduxjs/toolkit@^2.2.5
npm install reactflow@^11.11.4

# 可选依赖（根据需要）
npm install i18next react-i18next idb
```

---

## 🚀 快速开始

### 完整应用（最简单）

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasPage />
    </div>
  )
}
```

### 自定义集成（推荐）

```tsx
import { Canvas, CardNode, PropertiesPanel } from 'nanoai-canvas'
import { ReactFlowProvider } from 'reactflow'
import 'nanoai-canvas/styles'

function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
        {/* 主画布 */}
        <Canvas />

        {/* 属性面板 */}
        <PropertiesPanel />
      </div>
    </ReactFlowProvider>
  )
}
```

---

## 📖 组件 API

### Canvas

主画布组件，提供无限画布功能。

```tsx
import { Canvas } from 'nanoai-canvas'

function MyComponent() {
  return <Canvas />
}
```

**Props**: 无（通过 Redux Store 管理）

---

### PropertiesPanel

属性面板，显示和编辑节点属性。

```tsx
import { PropertiesPanel } from 'nanoai-canvas'

function MyComponent() {
  return <PropertiesPanel />
}
```

**Props**: 无（通过 Redux Store 管理）

---

### CardNode

卡片节点组件，支持 7 种预定义类型。

```tsx
import { CardNode } from 'nanoai-canvas'

const nodeTypes = {
  card: CardNode,
}
```

**支持的节点类型**：
- `task` - 任务节点
- `event` - 事件节点
- `milestone` - 里程碑节点
- `decision` - 决策节点
- `data` - 数据节点
- `start` - 开始节点
- `end` - 结束节点

---

### FloatingMenuBar

浮动菜单栏，提供常用操作按钮。

```tsx
import { FloatingMenuBar } from 'nanoai-canvas'

function MyComponent() {
  const handleZoomIn = () => {}
  const handleZoomOut = () => {}

  return (
    <FloatingMenuBar
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onFitView={() => {}}
      onUndo={() => {}}
      onRedo={() => {}}
      onSave={() => {}}
    />
  )
}
```

---

## 🎨 样式

### 导入完整样式

```tsx
import 'nanoai-canvas/styles'
```

### 按需导入样式

```tsx
// 核心样式
import 'nanoai-canvas/dist/styles.css'

// 或者分别导入
import 'nanoai-canvas/dist/globals.css'
import 'nanoai-canvas/dist/canvas.css'
```

### 自定义主题

```css
/* 您的全局 CSS */
:root {
  --canvas-primary: 168 70% 45%; /* 主色调 */
  --canvas-background: #0a0a0a; /* 背景色 */
  --canvas-grid-color: rgba(255, 255, 255, 0.05); /* 网格颜色 */
}
```

---

## 🔧 Redux 集成

### 使用内置 Store

```tsx
import { Provider } from 'react-redux'
import { setupStore } from 'nanoai-canvas/store'

const store = setupStore()

function App() {
  return (
    <Provider store={store}>
      <CanvasPage />
    </Provider>
  )
}
```

### 集成到现有 Store

```tsx
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { canvasReducer, uiReducer, settingsReducer } from 'nanoai-canvas/store'

const store = configureStore({
  reducer: {
    // 您的 reducer
    myFeature: myFeatureReducer,
    // NanoAiCanvas reducers
    canvas: canvasReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
})
```

---

## 🪝 Hooks

### useAutosave

自动保存 Hook。

```tsx
import { useAutosave } from 'nanoai-canvas'

function MyComponent() {
  useAutosave() // 自动保存到 localStorage
  return <Canvas />
}
```

### useShortcuts

快捷键 Hook。

```tsx
import { useShortcuts } from 'nanoai-canvas'

function MyComponent() {
  useShortcuts() // 启用快捷键
  return <Canvas />
}
```

### useI18n

国际化 Hook。

```tsx
import { useI18n } from 'nanoai-canvas'

function MyComponent() {
  const { t } = useI18n()
  return <div>{t('common.save')}</div>
}
```

---

## 📝 类型定义

所有类型都已导出，支持 TypeScript。

```tsx
import type {
  NodeData,
  NodeType,
  NodeStatus,
  EdgeData,
} from 'nanoai-canvas'

// 使用类型
const myNode: NodeData = {
  id: '1',
  type: 'task',
  label: '我的任务',
  status: 'in_progress',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

---

## 🎯 使用示例

### 示例1：最小集成

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function App() {
  return <CanvasPage />
}
```

### 示例2：自定义布局

```tsx
import { Canvas, PropertiesPanel, NodeTemplatesPanel } from 'nanoai-canvas'
import { ReactFlowProvider } from 'reactflow'
import 'nanoai-canvas/styles'

export default function App() {
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <NodeTemplatesPanel />
        <Canvas />
        <PropertiesPanel />
      </div>
    </ReactFlowProvider>
  )
}
```

### 示例3：集成到现有应用

```tsx
import { Canvas, CardNode } from 'nanoai-canvas'
import { ReactFlow, Background } from 'reactflow'
import 'nanoai-canvas/styles'
import 'reactflow/dist/style.css'

const nodeTypes = {
  card: CardNode,
}

export default function MyApp() {
  return (
    <ReactFlow nodeTypes={nodeTypes}>
      <Background />
      <Canvas />
    </ReactFlow>
  )
}
```

---

## 🌍 国际化

支持中英文切换。

```tsx
import { setupStore } from 'nanoai-canvas/store'

const store = setupStore({
  settings: {
    language: 'zh-CN', // 或 'en-US'
  }
})
```

---

## 💾 数据持久化

使用 IndexedDB 自动保存。

```tsx
import { useAutosave } from 'nanoai-canvas'

function App() {
  useAutosave({
    interval: 3000, // 3秒自动保存
    key: 'my-canvas-data',
  })
  return <Canvas />
}
```

---

## 🎨 主题定制

### Base Nova 暗色主题（默认）

```css
@import 'nanoai-canvas/styles';
```

### 自定义亮色主题

```css
:root {
  --canvas-background: #ffffff;
  --canvas-foreground: #000000;
  --canvas-primary: 168 70% 45%;
}
```

---

## 🔨 高级用法

### 自定义节点

```tsx
import { CardNode } from 'nanoai-canvas'
import type { NodeData } from 'nanoai-canvas'

function CustomNode({ data }: { data: NodeData }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      background: data.color || '#3b82f6',
    }}>
      {data.label}
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
  card: CardNode,
}
```

### 自定义快捷键

```tsx
import { useShortcutSystem } from 'nanoai-canvas/hooks/useShortcutSystem'

function App() {
  const { handleKeyDown } = useShortcutSystem()

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return <Canvas />
}
```

---

## 📦 导出清单

### 组件
- `Canvas` - 主画布
- `CanvasPage` - 完整页面
- `CardNode` - 卡片节点
- `PropertiesPanel` - 属性面板
- `NodeTemplatesPanel` - 模板面板
- `Toolbar` - 工具栏
- `FloatingMenuBar` - 浮动菜单
- `ShortcutHintPanel` - 快捷键帮助

### Hooks
- `useAutosave` - 自动保存
- `useShortcuts` - 快捷键
- `useI18n` - 国际化

### 工具函数
- Redux selectors
- Store 配置

### 类型
- `NodeData`
- `NodeType`
- `NodeStatus`
- `EdgeData`
- 更多...

---

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 📞 联系方式

- **作者**: 常智（外星动物）
- **邮箱**: 14455975@qq.com
- **组织**: IoTchange
- **GitHub**: [项目地址]

---

**🎊 感谢使用 NanoAiCanvas！**
