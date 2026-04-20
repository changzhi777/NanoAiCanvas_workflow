# 🧪 本地测试步骤

## 步骤1：本地构建库

```bash
cd /Users/mac/cz_code/NanoAiCanvas
pnpm run build:lib
```

**结果**: ✅ 成功

**输出**:
```
dist/
├── nanoai-canvas.js       # ESM (150 KB)
├── nanoai-canvas.cjs      # CommonJS (104 KB)
├── nanoai-canvas.js.map   # Source map
├── nanoai-canvas.cjs.map  # Source map
└── style.css              # 样式 (48 KB)
```

---

## 步骤2：在其他项目中使用

### 方法1：使用 pnpm link（推荐）

#### 在库项目中：

```bash
cd /Users/mac/cz_code/NanoAiCanvas

# 设置 pnpm global（首次使用）
pnpm setup
source ~/.zshrc

# 全局链接库
pnpm link --global
```

#### 在使用项目中：

```bash
# 创建测试项目
mkdir test-project && cd test-project
pnpm init

# 链接库
pnpm link nanoai-canvas --global

# 安装依赖
pnpm add react react-dom react-redux @reduxjs/toolkit reactflow
```

#### 创建测试文件：

```tsx
// src/App.tsx
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function App() {
  return <CanvasPage />
}
```

---

### 方法2：使用本地文件路径

```bash
# 在使用项目中
cd /path/to/your-project

# 直接使用本地路径
pnpm add file:/Users/mac/cz_code/NanoAiCanvas
```

---

### 方法3：手动复制文件

```bash
# 1. 构建库
pnpm run build:lib

# 2. 复制 dist 目录到使用项目
cp -r dist /path/to/your-project/node_modules/nanoai-canvas/

# 3. 在使用项目中导入
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'
```

---

## 验证清单

- [ ] 构建成功（`pnpm run build:lib`）
- [ ] dist 目录包含所有文件
- [ ] 可以在新项目中安装
- [ ] 可以导入组件
- [ ] 样式正确加载
- [ ] 功能正常工作

---

## 当前状态

✅ **步骤1完成**: 本地构建成功
⏳ **步骤2进行中**: 可通过以上方法测试
