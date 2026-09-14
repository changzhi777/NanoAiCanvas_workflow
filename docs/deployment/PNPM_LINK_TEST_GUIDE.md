# 🧪 通过 pnpm Link 测试指南

> **目标**: 在测试项目中验证 NanoAiCanvas 库的可用性

---

## 📋 步骤

### 步骤1：全局链接库

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm link --global
```

**预期输出**:
```
/Users/mac/Library/pnpm/global/5:
+ nanoai-canvas 2.2.0 -> ../../../../cz_code/NanoAiCanvas
```

---

### 步骤2：创建测试项目

```bash
# 创建测试项目目录
cd /Users/mac/cz_code
mkdir test-nanoai-app
cd test-nanoai-app

# 初始化 React 项目
pnpm create vite test-app --template react-ts
```

---

### 步骤3：在测试项目中链接库

```bash
cd /Users/mac/cz_code/test-nanoai-app/test-app
pnpm link nanoai-canvas --global
```

---

### 步骤4：安装依赖

```bash
# 安装必需的 peer dependencies
pnpm add react react-dom react-redux @reduxjs/toolkit reactflow
```

---

### 步骤5：创建测试文件

创建 `src/App.tsx`:

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return <CanvasPage />
}

export default App
```

---

### 步骤6：测试运行

```bash
# 启动开发服务器
pnpm dev
```

---

## ✅ 验证清单

- [ ] 全局链接成功
- [ ] 测试项目创建成功
- [ ] 可以导入组件
- [ ] 样式正确加载
- [ ] 应用可以启动
- [ ] 画布功能正常

---

## 🔍 测试场景

### 场景1：完整应用测试

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function App() {
  return <CanvasPage />
}
```

**验证点**:
- ✅ 应用启动
- ✅ 画布显示
- ✅ 快捷键工作（⌘F1）
- ✅ 节点可以创建

---

### 场景2：自定义布局测试

```tsx
import { Canvas, PropertiesPanel } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Canvas />
      <PropertiesPanel />
    </div>
  )
}

export default App
```

**验证点**:
- ✅ 组件独立工作
- ✅ 布局正确显示
- ✅ 面板功能正常

---

### 场景3：仅核心组件测试

```tsx
import { Canvas, CardNode } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

const nodeTypes = { card: CardNode }

function App() {
  return <Canvas nodeTypes={nodeTypes} />
}

export default App
```

**验证点**:
- ✅ 核心组件可以单独使用
- ✅ 自定义节点类型正常
- ✅ 样式正确应用

---

## 🐛 常见问题排查

### 问题1：找不到模块

**错误**: `Cannot find module 'nanoai-canvas'`

**解决方案**:
```bash
# 检查全局链接
pnpm list -g | grep nanoai-canvas

# 重新链接
cd /Users/mac/cz_code/NanoAiCanvas
pnpm link --global
```

---

### 问题2：样式不生效

**错误**: 组件显示但样式不对

**解决方案**:
```tsx
// 确保导入样式
import 'nanoai-canvas/styles'

// 或者
import 'nanoai-canvas/dist/style.css'
```

---

### 问题3：Redux 报错

**错误**: `Could not find provider`

**解决方案**:
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

---

## 🎯 快速测试命令

```bash
# 1. 全局链接
cd /Users/mac/cz_code/NanoAiCanvas
pnpm link --global

# 2. 创建测试项目
cd /Users/mac/cz_code
pnpm create vite test-app --template react-ts

# 3. 链接库
cd test-app/test-app
pnpm link nanoai-canvas --global
pnpm add react react-dom react-redux @reduxjs/toolkit reactflow

# 4. 创建测试文件
cat > src/App.tsx << 'EOF'
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function App() {
  return <CanvasPage />
}
EOF

# 5. 运行测试
pnpm dev
```

---

## 📊 测试结果

### 当前状态

- ✅ Verdaccio 私有 registry 已设置
- ✅ nanoai-canvas@2.2.0 已发布到 Verdaccio
- ⏳ 等待执行 pnpm link 测试

### 已创建的指南

1. **Verdaccio 配置**: 完成
2. **GitHub Packages 配置**: 准备就绪
3. **pnpm Link 测试**: 本文档

---

**准备执行 pnpm link 测试了吗？我可以帮您自动化这个过程。**
