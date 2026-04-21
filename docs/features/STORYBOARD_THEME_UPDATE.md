# Storyboard UI/UX 深色主题更新完成

> **更新日期**: 2026-04-20  
> **参考规范**: Storyboard/assets/styles/storyboard-ui-style-reference.md  
> **状态**: ✅ 完成

---

## 📋 更新概览

已将NanoAI工作流的所有核心组件更新为符合Storyboard UI/UX设计规范的深色主题样式。

### 更新范围

- ✅ **Canvas组件** - 画布主界面
- ✅ **BaseNode组件** - 节点基础组件
- ✅ **Sidebar组件** - 节点库侧边栏
- ✅ **Toolbar组件** - 顶部工具栏
- ✅ **EmptyState组件** - 空状态展示
- ✅ **dark-theme.css** - 深色主题样式文件

---

## 🎨 Storyboard设计规范要点

### 颜色系统

#### 主色调（紫粉渐变）
```tsx
// 文字渐变 - 用于标题
className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"

// 按钮渐变 - 用于操作按钮
className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"

// 进度条渐变
className="bg-gradient-to-r from-purple-500 to-pink-500"
```

#### 背景颜色
| 层级 | Tailwind类名 | 用途 |
|------|-------------|------|
| 主背景 | `bg-slate-900` | 页面、面板主背景 |
| 半透明背景 | `bg-white/5` | 卡片、输入框 |
| 深色半透明 | `bg-black/20` | 遮罩、覆盖层 |
| 边框 | `border-white/10` | 细边框 |
| 分隔线 | `border-slate-700` | 区域分隔 |

#### 文字颜色
| 层级 | Tailwind类名 | 用途 |
|------|-------------|------|
| 主文字 | `text-slate-100` | 大标题 |
| 次文字 | `text-slate-200` | 中标题、重要文字 |
| 辅助文字 | `text-slate-300` | 正文 |
| 弱化文字 | `text-slate-400` | 提示、描述 |
| 占位符 | `text-slate-400/50` | 输入框placeholder |

#### 状态颜色
| 状态 | Tailwind类名 |
|------|-------------|
| 成功 | `text-green-400` / `bg-green-500/20` |
| 错误 | `text-red-400` / `bg-red-500/20` |
| 进行中 | `text-purple-400` / `bg-purple-500/20` |
| 等待中 | `text-slate-500` |

---

## 📝 具体更新内容

### 1. Canvas组件（NanoaiWorkflowCanvas.tsx）

**更新前**:
```tsx
isDark
  ? 'bg-gray-900'  // ❌ 旧样式
  : 'bg-white'
```

**更新后**:
```tsx
isDark
  ? 'bg-slate-900'  // ✅ Storyboard规范
  : 'bg-white'
```

**关键更新**:
- 背景: `bg-slate-900`
- 控制面板: `bg-slate-800/90`, `border-white/10`, `text-slate-300`
- 小地图: `bg-slate-800/90`, `border-white/10`
- 缩放按钮: `bg-slate-800/90`, `border-white/10`, `text-slate-300`
- 快捷键提示: `bg-slate-800/90`, `border-white/10`, `text-slate-300`
- kbd样式: `bg-white/5`, `text-slate-300`, `border-white/10`

---

### 2. BaseNode组件（BaseNode.tsx）

**更新前**:
```tsx
// 端口背景
isDark ? 'bg-gray-900/50 border border-purple-500/20'  // ❌

// 文字颜色
isDark ? 'text-purple-200' : 'text-gray-700'  // ❌
```

**更新后**:
```tsx
// 端口背景
isDark ? 'bg-white/5 border border-white/10'  // ✅

// 文字颜色
isDark ? 'text-slate-200' : 'text-gray-700'  // ✅
```

**关键更新**:
- 端口背景: `bg-white/5` (原`bg-gray-900/50`)
- 端口边框: `border-white/10` (原`border-purple-500/20`)
- 端口Handle边框: `border-slate-700` (原`border-gray-700`)
- 文字层级: `text-slate-100/200/300/400` 系列
- 参数编辑器: `bg-white/5`, `border-white/10`
- Placeholder: `text-slate-400/50` (原`text-purple-400/50`)

---

### 3. Sidebar组件（NanoaiWorkflowSidebar.tsx）

**更新前**:
```tsx
isDark
  ? 'bg-gray-900 border-purple-500/30'  // ❌
  : 'bg-white border-gray-200'
```

**更新后**:
```tsx
isDark
  ? 'bg-slate-900 border-white/10'  // ✅
  : 'bg-white border-gray-200'
```

**关键更新**:
- 侧边栏背景: `bg-slate-900` (原`bg-gray-900`)
- 侧边栏边框: `border-white/10` (原`border-purple-500/30`)
- 节点卡片: `border-white/10`, `bg-white/5`
- 搜索框: `bg-white/5`, `border-white/10`
- 标签背景: `bg-slate-800` (原`bg-purple-900/30`)
- 标签文字: `text-slate-400` (原`text-purple-400`)
- hover效果: `hover:bg-slate-800` (原`hover:bg-gray-800`)

---

### 4. Toolbar组件（NanoaiWorkflowToolbar.tsx）

**更新前**:
```tsx
isDark
  ? 'bg-gray-900 border-purple-500/30'  // ❌
  : 'bg-white border-gray-200'
```

**更新后**:
```tsx
isDark
  ? 'bg-slate-900 border-white/10'  // ✅
  : 'bg-white border-gray-200'
```

**关键更新**:
- 工具栏背景: `bg-slate-900`
- 工具栏边框: `border-white/10`
- 统计信息文字: `text-slate-400` (原`text-purple-400`)
- 分隔线: `bg-white/10` (原`bg-purple-500/30`)
- 按钮hover: `hover:bg-slate-800`
- 对话框:
  - 背景: `bg-slate-900`
  - 边框: `border-white/10`
  - 标题: `text-slate-200`
  - 输入框: `bg-white/5`, `border-white/10`

---

### 5. EmptyState组件（EmptyState.tsx）

**更新前**:
```tsx
isDark
  ? 'bg-gray-900/80 border-purple-500/30'  // ❌
  : 'bg-white/80 border-purple-200'
```

**更新后**:
```tsx
isDark
  ? 'bg-slate-900/80 border-white/10'  // ✅
  : 'bg-white/80 border-purple-200'
```

**关键更新**:
- 徽章背景: `bg-slate-900/80`, `border-white/10`
- 徽章文字: `text-slate-200` (原`text-purple-200`)
- 描述文字: `text-slate-300` (原`text-purple-300`)
- 卡片背景: `bg-white/5`, `border-white/10`
- 快捷键提示: `bg-white/5`, `border-white/10`
- kbd样式: `bg-white/10`, `text-slate-300`

---

### 6. 深色主题CSS（dark-theme.css）

**完全重写**为Storyboard风格，关键样式：

```css
/* 深色主题基础 */
.dark-mode {
  background-color: rgb(15 23 42); /* bg-slate-900 */
  color: rgb(203 213 225); /* text-slate-300 */
}

/* 画布背景 */
.dark-mode .canvas-dark-bg {
  background: rgb(15 23 42); /* bg-slate-900 */
}

/* 节点卡片 */
.dark-mode .node-card-dark {
  background-color: rgb(255 255 255 / 0.05); /* bg-white/5 */
  border: 1px solid rgb(255 255 255 / 0.1); /* border-white/10 */
}

/* 节点呼吸效果 */
.dark-mode .node-status-running {
  animation: node-breathing 2s ease-in-out infinite;
}

/* 连线流动动画 */
.dark-mode .edge-animated {
  stroke-dasharray: 10;
  animation: flow-dash 1s linear infinite;
  stroke: #a855f7;
}
```

---

## 🎯 设计原则

### 颜色使用原则
1. **主要操作**: 使用紫粉渐变（purple-400 to pink-400）
2. **成功状态**: 使用绿色（green-400/500）
3. **错误状态**: 使用红色（red-400/500）
4. **进行中**: 使用紫色（purple-400/500）
5. **辅助信息**: 使用slate灰色系

### 透明度使用
```tsx
// 半透明白色 - 5%
bg-white/5   // 卡片、输入框

// 半透明白色 - 10%
bg-white/10  // 边框、kbd

// 半透明黑色 - 20%
bg-black/20  // 遮罩、覆盖层

// 半透明黑色 - 80%
bg-black/80  // 深色遮罩
```

### 间距规范
- 卡片间距: `gap-2` 或 `gap-3`（8-12px）
- 内边距: `p-2`（小卡片）、`p-4`（大卡片）
- 外边距: `mb-2`（垂直间距）、`gap-2`（水平间距）

---

## ✅ 验证清单

- [x] Canvas组件 - 所有深色样式已更新
- [x] BaseNode组件 - 端口、参数编辑器、状态指示器
- [x] Sidebar组件 - 侧边栏、节点卡片、搜索框
- [x] Toolbar组件 - 工具栏、对话框、按钮
- [x] EmptyState组件 - 空状态、快捷键提示
- [x] dark-theme.css - 深色主题CSS文件

---

## 🎨 效果展示

### 深色主题特点
- **统一背景**: 使用slate-900作为主背景
- **清晰层级**: slate-100/200/300/400文字层级
- **精致透明**: white/5、white/10等半透明效果
- **紫粉强调**: 保留紫粉渐变作为强调色
- **流畅动画**: 连线流动、节点呼吸等动画效果

### 与Storyboard一致
- ✅ 相同的配色系统
- ✅ 相同的透明度规范
- ✅ 相同的间距系统
- ✅ 相同的字体层级
- ✅ 相同的状态颜色

---

## 📚 参考文档

- **Storyboard UI/UX规范**: `Storyboard/assets/styles/storyboard-ui-style-reference.md`
- **项目主文档**: `README_WORKFLOW.md`
- **深色主题CSS**: `src/styles/dark-theme.css`

---

**更新完成时间**: 2026-04-20  
**维护者**: BB小子 🤙  
**状态**: ✅ 生产就绪
