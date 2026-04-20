# 🚀 在本地项目中使用 NanoAiCanvas

> **通过 pnpm link 在任何本地项目中引用 NanoAiCanvas 库**

---

## 📋 前提条件

确保已满足以下条件：

- ✅ Node.js >= 18.0.0
- ✅ pnpm 已安装
- ✅ NanoAiCanvas 已完成构建

---

## ⚡ 快速开始（3 步）

### 步骤 1️⃣: 构建 NanoAiCanvas 库

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib
```

**预期输出**:
```
dist/style.css          49.57 kB │ gzip:  9.45 kB
dist/nanoai-canvas.js  171.17 kB │ gzip: 39.87 kB
dist/nanoai-canvas.cjs 118.90 kB │ gzip: 33.90 kB
✓ built in 455ms
```

---

### 步骤 2️⃣: 在你的项目中配置依赖

在你的项目的 `package.json` 中添加：

```json
{
  "name": "your-project-name",
  "dependencies": {
    "nanoai-canvas": "link:../NanoAiCanvas",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-redux": "^9.1.2",
    "@reduxjs/toolkit": "^2.2.5",
    "reactflow": "^11.11.4"
  }
}
```

**重要**:
- `"link:../NanoAiCanvas"` 中的路径是相对于你的项目目录的
- 如果项目在不同位置，请相应调整路径，例如：
  - `"link:../../cz_code/NanoAiCanvas"`
  - `"link:/Users/mac/cz_code/NanoAiCanvas"` (绝对路径)

---

### 步骤 3️⃣: 安装依赖并使用

```bash
cd /path/to/your-project
pnpm install
```

**预期输出**:
```
+ nanoai-canvas 2.2.0 <- ../NanoAiCanvas
```

---

## 💻 代码使用示例

### 示例 1: 完整应用（最简单）

创建或修改 `src/App.tsx`:

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CanvasPage />
    </div>
  )
}

export default App
```

---

### 示例 2: 自定义布局

```tsx
import { Canvas, PropertiesPanel, NodeTemplatesPanel } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧：画布区域 */}
      <div style={{ flex: 1 }}>
        <Canvas />
      </div>

      {/* 右侧：面板区域 */}
      <div style={{ width: 320, overflow: 'auto' }}>
        <PropertiesPanel />
        <NodeTemplatesPanel />
      </div>
    </div>
  )
}

export default App
```

---

### 示例 3: 仅使用核心组件

```tsx
import { Canvas } from 'nanoai-canvas'
import 'nanoai-canvas/styles'
import { ReactFlowProvider } from 'reactflow'

function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas />
      </div>
    </ReactFlowProvider>
  )
}

export default App
```

---

## 🎯 完整项目示例

### 项目目录结构

```
your-project/
├── package.json           # 配置 nanoai-canvas 链接
├── vite.config.ts         # Vite 配置
├── index.html             # HTML 入口
├── .npmrc                 # npm registry 配置
└── src/
    ├── main.tsx           # React 入口
    ├── App.tsx            # 主应用（导入 CanvasPage）
    └── index.css          # 全局样式
```

---

### package.json 完整示例

```json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "nanoai-canvas": "link:../NanoAiCanvas",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-redux": "^9.1.2",
    "@reduxjs/toolkit": "^2.2.5",
    "reactflow": "^11.11.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.11",
    "typescript": "^5.9.3"
  }
}
```

---

### vite.config.ts 示例

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    host: true
  }
})
```

---

### index.html 示例

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Project - NanoAiCanvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### src/main.tsx 示例

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 🔄 开发工作流

### 日常开发流程

```bash
# 1. 修改 NanoAiCanvas 源代码
cd /Users/mac/cz_code/NanoAiCanvas
# 编辑任何源文件...

# 2. 重新构建库
pnpm run build:lib

# 3. 在你的项目中自动生效
# Vite 会自动检测 dist/ 变化并刷新浏览器
```

**重要**: 每次修改 NanoAiCanvas 源代码后，必须重新构建库！

---

### 监听模式（可选）

自动监听文件变化并重新构建：

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib -- --watch
```

---

## 🛠️ 启动你的项目

```bash
cd /path/to/your-project
pnpm dev
```

**预期输出**:
```
VITE v5.4.21  ready in 79 ms
➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

打开浏览器访问 `http://localhost:3000` 即可看到 NanoAiCanvas 应用！

---

## 🐛 常见问题

### ❌ 问题 1: 找不到模块 'nanoai-canvas'

**错误信息**:
```
Cannot find module 'nanoai-canvas' or its corresponding type declarations
```

**解决方案**:

```bash
# 1. 确保库已构建
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib

# 2. 检查 dist/ 目录是否存在
ls -la dist/

# 3. 在你的项目中重新安装
cd /path/to/your-project
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### ❌ 问题 2: 样式未加载

**解决方案**: 确保导入了样式文件

```tsx
// ✅ 正确
import 'nanoai-canvas/styles'

// 或者
import 'nanoai-canvas/dist/style.css'

// ❌ 错误 - 缺少样式导入
import { CanvasPage } from 'nanoai-canvas'
// 缺少样式导入！
```

---

### ❌ 问题 3: 依赖安装失败

**错误信息**:
```
ERR_PNPM_FETCH_404  GET http://localhost:4873/...
```

**解决方案**: 在你的项目中创建 `.npmrc` 文件

```bash
cd /path/to/your-project
echo "registry=https://registry.npmjs.org" > .npmrc
pnpm install
```

---

### ❌ 问题 4: 修改库代码后未生效

**解决方案**: 重新构建库

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib

# 浏览器会自动刷新
```

---

## 📦 可用的组件和 API

### 导入方式

```typescript
// 主组件
import { CanvasPage } from 'nanoai-canvas'

// 核心组件
import { Canvas } from 'nanoai-canvas'
import { CardNode } from 'nanoai-canvas'

// 面板组件
import { PropertiesPanel } from 'nanoai-canvas'
import { NodeTemplatesPanel } from 'nanoai-canvas'

// 工具栏
import { Toolbar } from 'nanoai-canvas'

// Redux Store
import { setupStore } from 'nanoai-canvas/store'

// 样式
import 'nanoai-canvas/styles'
```

### 导出的类型

```typescript
import type {
  Node,
  Edge,
  CanvasState,
  SettingsState,
  UISettings
} from 'nanoai-canvas'
```

---

## 🎨 自定义配置

### 修改默认主题

NanoAiCanvas 使用 CSS 变量，你可以覆盖它们：

```css
/* src/custom-theme.css */
:root {
  --primary: 168 70% 45%;
  --secondary: 280 60% 50%;
  /* ... 其他颜色变量 */
}
```

```tsx
import 'nanoai-canvas/styles'
import './custom-theme.css'
```

### 自定义节点类型

```tsx
import { Canvas, CardNode } from 'nanoai-canvas'
import 'nanoai-canvas/styles'
import { ReactFlowProvider } from 'reactflow'

const nodeTypes = {
  card: CardNode,
  // customNode: CustomNodeComponent
}

function App() {
  return (
    <ReactFlowProvider>
      <Canvas nodeTypes={nodeTypes} />
    </ReactFlowProvider>
  )
}
```

---

## 📊 项目结构示例

### 示例 1: 单一项目

```
/Users/mac/cz_code/
├── NanoAiCanvas/          # 库项目
│   ├── src/
│   ├── dist/
│   └── package.json
│
└── my-project/            # 你的项目
    ├── package.json       # "nanoai-canvas": "link:../NanoAiCanvas"
    └── src/
        └── App.tsx
```

---

### 示例 2: 多项目共享

```
/Users/mac/cz_code/
├── NanoAiCanvas/          # 库项目（共享）
│   ├── src/
│   ├── dist/
│   └── package.json
│
├── project-alpha/         # 项目 A
│   ├── package.json       # "nanoai-canvas": "link:../NanoAiCanvas"
│   └── src/
│
└── project-beta/          # 项目 B
    ├── package.json       # "nanoai-canvas": "link:../NanoAiCanvas"
    └── src/
```

---

## 🎯 最佳实践

### ✅ DO (推荐做法)

1. **使用相对路径** - 更容易团队协作
   ```json
   "nanoai-canvas": "link:../NanoAiCanvas"
   ```

2. **版本控制提示** - 在 README 中说明
   ```markdown
   ## 本地开发
   此项目使用本地的 NanoAiCanvas 库，请修改 package.json 中的路径为你的本地路径。
   ```

3. **环境变量** - 使用环境变量管理路径（可选）
   ```json
   {
     "dependencies": {
       "nanoai-canvas": "link:${NANOAI_CANVAS_PATH}"
     }
   }
   ```

### ❌ DON'T (避免做法)

1. **不要提交 node_modules**
   ```gitignore
   node_modules/
   pnpm-lock.yaml
   ```

2. **不要在生产环境使用 link:**
   - 生产环境应该使用发布的版本
   - link: 仅用于本地开发

3. **不要忘记重新构建**
   - 修改库代码后必须 `pnpm run build:lib`

---

## 📝 总结

### ✅ 你现在可以：

1. ✅ 在任何本地项目中引用 NanoAiCanvas
2. ✅ 实时查看库代码的修改效果
3. ✅ 自定义布局和组件
4. ✅ 快速迭代开发

### 🚀 下一步：

1. **创建你的项目** - 按照上面的步骤设置
2. **参考示例** - 查看 `/Users/mac/cz_code/demo-project`
3. **开始开发** - 享受流畅的开发体验

---

## 📚 相关文档

- [完整使用指南](./PNPM_LINK_USAGE_GUIDE.md)
- [示例项目](/Users/mac/cz_code/demo-project)
- [API 文档](./LIBRARY_README.md)
- [发布流程](./PUBLISH_SUMMARY.md)

---

**文档更新**: 2026-04-15
**状态**: ✅ 已验证可用
**维护者**: changzhi777
