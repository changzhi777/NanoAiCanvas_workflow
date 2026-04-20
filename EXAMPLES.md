# NanoAiCanvas 使用示例

> 如何在其他项目中使用 NanoAiCanvas 组件库

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 创建新项目
pnpm create vite example-app --template react-ts
cd example-app

# 安装 NanoAiCanvas
pnpm add nanoai-canvas

# 安装必需的 peer dependencies
pnpm add react react-dom react-redux @reduxjs/toolkit reactflow
```

### 2. 完整应用示例

```tsx
// src/App.tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CanvasPage />
    </div>
  )
}

export default App
```

### 3. 自定义布局示例

```tsx
// src/App.tsx
import { Canvas, PropertiesPanel, NodeTemplatesPanel } from 'nanoai-canvas'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { canvasReducer, uiReducer, settingsReducer } from 'nanoai-canvas/store'
import 'nanoai-canvas/styles'

// 创建 Redux store
const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
})

function App() {
  return (
    <Provider store={store}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* 左侧模板面板 */}
        <NodeTemplatesPanel />

        {/* 中央画布 */}
        <Canvas />

        {/* 右侧属性面板 */}
        <PropertiesPanel />
      </div>
    </Provider>
  )
}

export default App
```

### 4. 仅使用核心组件

```tsx
// src/App.tsx
import { Canvas, CardNode } from 'nanoai-canvas'
import { ReactFlow } from 'reactflow'
import 'nanoai-canvas/styles'
import 'reactflow/dist/style.css'

const nodeTypes = {
  card: CardNode,
}

function App() {
  return (
    <ReactFlow nodeTypes={nodeTypes}>
      <Canvas />
    </ReactFlow>
  )
}

export default App
```

---

## 📦 不同使用场景

### 场景1：作为独立页面

适用于：需要完整的画布功能

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function MyCanvas() {
  return <CanvasPage />
}
```

### 场景2：嵌入现有应用

适用于：在现有项目中添加画布功能

```tsx
import { Canvas } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function MyComponent() {
  return (
    <div style={{ height: '500px', border: '1px solid #ccc' }}>
      <Canvas />
    </div>
  )
}
```

### 场景3：自定义 Redux Store

适用于：已有 Redux Store 的项目

```tsx
import { Canvas } from 'nanoai-canvas'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { canvasReducer, uiReducer } from 'nanoai-canvas/store'

// 集成到现有 store
const store = configureStore({
  reducer: combineReducers({
    myFeature: myReducer,
    canvas: canvasReducer,
    ui: uiReducer,
  }),
})

function App() {
  return (
    <Provider store={store}>
      <Canvas />
    </Provider>
  )
}
```

---

## 🎨 自定义主题

### Base Nova 暗色主题（默认）

```tsx
import 'nanoai-canvas/styles'
```

### 自定义亮色主题

```css
/* src/styles/theme.css */
:root {
  --canvas-background: #ffffff;
  --canvas-foreground: #000000;
  --canvas-primary: 168 70% 45%;
}

/* src/App.tsx */
import 'nanoai-canvas/styles'
import './styles/theme.css'
```

---

## 🌍 国际化

### 切换到英文

```tsx
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { settingsReducer } from 'nanoai-canvas/store'

const store = configureStore({
  reducer: {
    settings: settingsReducer,
  },
  preloadedState: {
    settings: {
      language: 'en-US',
    },
  },
})

function App() {
  return (
    <Provider store={store}>
      {/* ... */}
    </Provider>
  )
}
```

---

## 🔧 高级用法

### 自定义节点

```tsx
import { CardNode } from 'nanoai-canvas'
import type { NodeData } from 'nanoai-canvas'

function MyCustomNode({ data }: { data: NodeData }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: data.color || '#3b82f6',
      color: 'white',
      minWidth: '200px',
    }}>
      <h3>{data.label}</h3>
      <p>{data.description}</p>
    </div>
  )
}

// 使用
const nodeTypes = {
  custom: MyCustomNode,
  card: CardNode,
}

function App() {
  return <Canvas nodeTypes={nodeTypes} />
}
```

### 自定义快捷键

```tsx
import { useShortcutSystem } from 'nanoai-canvas'

function App() {
  const { handleKeyDown } = useShortcutSystem({
    onShortcutTrigger: (id) => {
      console.log('快捷键触发:', id)
      // 自定义处理
    },
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return <Canvas />
}
```

---

## 📝 注意事项

### peerDependencies

必须安装的依赖：

```json
{
  "peerDependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-redux": "^9.1.2",
    "@reduxjs/toolkit": "^2.2.5",
    "reactflow": "^11.11.4"
  }
}
```

### 样式导入

必须导入样式：

```tsx
import 'nanoai-canvas/styles'
// 或
import 'nanoai-canvas/dist/style.css'
```

### Redux Provider

如果使用独立组件（不是 CanvasPage），需要包裹 Provider：

```tsx
import { Provider } from 'react-redux'
import { store } from './store' // 需要配置

<Provider store={store}>
  <Canvas />
</Provider>
```

---

## 🆚 常见问题

### 1. 样式不生效

**问题**: 导入组件后样式不对

**解决**: 确保导入了样式文件
```tsx
import 'nanoai-canvas/styles'
```

### 2. Redux 报错

**问题**: 使用独立组件时报 Redux 错误

**解决**: 确保 Redux Provider 正确配置
```tsx
<Provider store={store}>
  <Canvas />
</Provider>
```

### 3. 类型错误

**问题**: TypeScript 类型不匹配

**解决**: 检查是否安装了类型定义
```bash
pnpm add -D @types/react @types/react-dom
```

---

## 📚 更多资源

- **完整文档**: [LIBRARY_README.md](../LIBRARY_README.md)
- **发布指南**: [PUBLISH_GUIDE.md](../PUBLISH_GUIDE.md)
- **项目主页**: [GitHub Repository]

---

**🎊 开始使用 NanoAiCanvas，快速构建您的画布应用！**
