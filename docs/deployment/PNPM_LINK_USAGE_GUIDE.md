# 🔗 pnpm Link 完整使用指南

> **目标**: 在其他本地项目中通过 pnpm link 使用 NanoAiCanvas

---

## 📋 前提条件

- ✅ NanoAiCanvas 已构建：`pnpm run build:lib`
- ✅ 目标项目已初始化（React + Vite）
- ✅ pnpm 已安装

---

## 🎯 方法一：`link:` 协议（推荐）

### 为什么推荐？

✅ **简单直观** - 一行配置即可
✅ **路径明确** - 清晰指向本地路径
✅ **跨平台** - 不依赖全局配置
✅ **易于维护** - 项目内自包含

### 详细步骤

#### 1️⃣ 确保库已构建

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

#### 2️⃣ 在目标项目的 package.json 中添加依赖

假设你的项目结构是：
```
/Users/mac/cz_code/
├── NanoAiCanvas/        # 库项目
└── my-project/          # 你的项目
```

在 `my-project/package.json` 中：

```json
{
  "name": "my-project",
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

**路径说明**:
- `link:../NanoAiCanvas` - 相对于项目目录的路径
- `link:../../cz_code/NanoAiCanvas` - 跨目录的路径
- `link:/Users/mac/cz_code/NanoAiCanvas` - 绝对路径

#### 3️⃣ 安装依赖

```bash
cd /Users/mac/cz_code/my-project
pnpm install
```

**预期输出**:
```
+ nanoai-canvas 2.2.0 <- ../NanoAiCanvas
```

#### 4️⃣ 在代码中使用

**完整应用（最简单）**:
```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return <CanvasPage />
}

export default App
```

**自定义布局**:
```tsx
import { Canvas, PropertiesPanel } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Canvas />
      </div>
      <div style={{ width: 300 }}>
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
```

#### 5️⃣ 启动项目

```bash
pnpm dev
```

✅ **项目成功启动！**

---

## 🌐 方法二：全局链接

### 什么时候使用？

- 需要在多个项目中共享同一个本地包
- 希望模拟真实的 npm 包安装体验

### 详细步骤

#### 1️⃣ 在库项目中创建全局链接

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm link --global
```

**预期输出**:
```
/Users/mac/Library/pnpm/global/5:
+ nanoai-canvas 2.2.0 -> ../../../../cz_code/NanoAiCanvas
```

#### 2️⃣ 在目标项目中链接全局包

```bash
cd /Users/mac/cz_code/my-project
pnpm link nanoai-canvas --global
```

#### 3️⃣ 在代码中使用

```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'
```

---

## 📊 两种方法对比

| 特性 | `link:` 协议 | 全局链接 |
|------|-------------|----------|
| **配置复杂度** | ⭐ 简单 | ⭐⭐ 中等 |
| **跨项目共享** | ❌ 每个项目单独配置 | ✅ 全局共享 |
| **路径可见性** | ✅ 清晰明确 | ⚠️ 隐式链接 |
| **推荐程度** | ✅✅✅ 强烈推荐 | ✅ 适合多项目 |

---

## 🔄 开发工作流

### 日常开发流程

```bash
# 1. 修改 NanoAiCanvas 源代码
cd /Users/mac/cz_code/NanoAiCanvas
vim src/components/canvas/Canvas.tsx

# 2. 重新构建库
pnpm run build:lib

# 3. 在目标项目中查看更改（自动刷新）
# Vite 会自动检测 dist/ 变化并刷新浏览器
```

### 监听模式（可选）

为了更方便的开发，可以添加文件监听：

```bash
# 在 NanoAiCanvas 目录中
pnpm run build:lib -- --watch
```

---

## 🎓 最佳实践

### 1. 项目组织

```
/Users/mac/cz_code/
├── NanoAiCanvas/          # 库项目
│   ├── src/
│   ├── dist/
│   └── package.json
│
├── my-project-1/          # 项目 1
│   ├── package.json       # "nanoai-canvas": "link:../NanoAiCanvas"
│   └── src/
│
└── my-project-2/          # 项目 2
    ├── package.json       # "nanoai-canvas": "link:../NanoAiCanvas"
    └── src/
```

### 2. .gitignore 配置

在 `my-project/.gitignore` 中：

```gitignore
# 不要提交 node_modules 中的链接
node_modules
```

### 3. 团队协作

**对于其他开发者**，需要修改 `link:` 路径为他们的本地路径：

```json
{
  "dependencies": {
    "nanoai-canvas": "link:/path/to/their/NanoAiCanvas"
  }
}
```

或者使用环境变量：

```json
{
  "dependencies": {
    "nanoai-canvas": "link:${NANOAI_CANVAS_PATH}"
  }
}
```

```bash
export NANOAI_CANVAS_PATH="/Users/other/dev/NanoAiCanvas"
pnpm install
```

---

## 🐛 常见问题排查

### 问题1: 找不到模块

**错误信息**:
```
Cannot find module 'nanoai-canvas' or its corresponding type declarations
```

**解决方案**:
```bash
# 1. 检查库是否已构建
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib

# 2. 检查 dist/ 目录是否存在
ls -la dist/

# 3. 重新安装依赖
cd /Users/mac/cz_code/my-project
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题2: 类型定义缺失

**错误信息**:
```
Could not find a declaration file for module 'nanoai-canvas'
```

**解决方案**:

在 `tsconfig.json` 中添加：
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

或者手动创建类型定义文件 `src/nanoai-canvas.d.ts`:
```typescript
declare module 'nanoai-canvas' {
  export const CanvasPage: any
  export const Canvas: any
  // ...其他导出
}
```

### 问题3: 样式不加载

**解决方案**:

确保导入样式文件：
```tsx
import 'nanoai-canvas/styles'
```

或者导入 CSS 文件：
```tsx
import 'nanoai-canvas/dist/style.css'
```

### 问题4: 构建产物未更新

**解决方案**:

强制重新构建：
```bash
cd /Users/mac/cz_code/NanoAiCanvas
rm -rf dist
pnpm run build:lib
```

---

## 📦 完整示例项目

我已经为你创建了一个完整的示例项目：

**位置**: `/Users/mac/cz_code/demo-project`

**项目结构**:
```
demo-project/
├── package.json           # 包含 link:../NanoAiCanvas
├── vite.config.ts
├── index.html
├── .npmrc                # 使用公共 npm registry
├── README.md             # 详细说明
└── src/
    ├── main.tsx
    ├── App.tsx           # 使用 CanvasPage
    └── index.css
```

**运行示例**:
```bash
cd /Users/mac/cz_code/demo-project
pnpm install
pnpm dev
```

**结果**: ✅ 成功启动在 http://localhost:3003/

---

## 🚀 快速参考

### 最少配置（3 步）

**步骤1**: 添加依赖到 package.json
```json
{
  "dependencies": {
    "nanoai-canvas": "link:../NanoAiCanvas"
  }
}
```

**步骤2**: 安装
```bash
pnpm install
```

**步骤3**: 使用
```tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'
```

### 常用命令

```bash
# 构建库
pnpm run build:lib

# 安装链接的依赖
pnpm install

# 启动开发服务器
pnpm dev

# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 相关文档

- [库构建指南](./LIBRARY_README.md)
- [发布流程总结](./PUBLISH_SUMMARY.md)
- [使用示例](./EXAMPLES.md)
- [Verdaccio 配置](./VERDACCIO_SETUP.md)

---

## ✅ 总结

**推荐方案**: 使用 `link:` 协议

**优点**:
- ✅ 简单明了
- ✅ 路径清晰
- ✅ 易于维护
- ✅ 跨平台兼容

**工作流**:
1. 修改库代码 → 重新构建 → 自动刷新
2. 所有更改实时生效
3. 无需发布到 registry

**下一步**: 开始在你的项目中使用 NanoAiCanvas！

---

**文档更新**: 2026-04-15
**状态**: ✅ 已验证可用
**示例项目**: `/Users/mac/cz_code/demo-project`
