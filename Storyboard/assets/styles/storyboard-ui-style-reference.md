# 故事板UI样式参数参考

> 提取时间：2026-04-20 21:36
> 来源：Storyboard 前端组件代码分析

---

## 📊 样式系统总览

### 设计主题
- **主色调**：紫色系（Purple）+ 粉色系（Pink）
- **辅助色**：绿色（成功）、红色（错误）、蓝色（音频）
- **背景**：深色系（Slate-900）
- **文字**：浅色系（Slate-100/200/300/400）

---

## 🎨 颜色系统

### 主色调（紫粉渐变）

| 用途 | Tailwind类名 | 使用场景 |
|------|-------------|----------|
| 主标题 | `from-purple-400 to-pink-400` | Dialog标题渐变 |
| 主按钮 | `from-purple-500 to-pink-500` | 下一步按钮 |
| 主按钮悬停 | `from-purple-600 to-pink-600` | 下一步按钮hover |
| 成功按钮 | `from-green-500 to-emerald-500` | 一键生成按钮 |
| 进度条 | `from-purple-500 to-pink-500` | 任务进度条 |
| 任务进度背景 | `from-purple-900/30 via-pink-900/20 to-purple-900/30` | 动画卡片背景 |

### 状态颜色

| 状态 | Tailwind类名 | 使用场景 |
|------|-------------|----------|
| 成功 | `text-green-400` / `bg-green-500/20` | 完成状态 |
| 错误 | `text-red-400` / `bg-red-500/20` | 错误状态 |
| 进行中 | `text-yellow-400` / `text-purple-400` | 生成中状态 |
| 等待中 | `text-muted-foreground` / `text-slate-500` | 待处理状态 |
| 主强调 | `text-primary` | 选中状态、强调文字 |
| 青色旁白 | `text-cyan-400/70` | 旁白文字 |

### 背景颜色

| 层级 | Tailwind类名 | 透明度 |
|------|-------------|--------|
| 深色背景 | `bg-slate-900` | 100% |
| 半透明背景 | `bg-black/20` | 20% |
| 卡片背景 | `bg-white/5` | 5% |
| 边框 | `border-white/10` | 10% |
| 分隔线 | `border-slate-700` | 100% |
| 遮罩 | `bg-black/80` | 80% |

---

## 🔤 字体系统

### 字体大小

| 用途 | Tailwind类名 | 字号 |
|------|-------------|------|
| 大标题 | `text-lg` | 18px |
| 中标题 | `text-sm` | 14px |
| 正文 | `text-xs` | 12px |
| 小字 | `text-[10px]` | 10px |
| 超小字 | `text-[8px]` | 8px |

### 字体粗细

| 用途 | Tailwind类名 | 字重 |
|------|-------------|------|
| 粗体 | `font-bold` | 700 |
| 中粗 | `font-semibold` | 600 |
| 中等 | `font-medium` | 500 |
| 常规 | 默认 | 400 |

---

## 📐 间距系统

### 内边距（Padding）

| 用途 | Tailwind类名 | 尺寸 |
|------|-------------|------|
| 对话框 | `p-4` | 16px |
| 卡片 | `p-2` | 8px |
| 紧凑卡片 | `p-1.5` | 6px |
| 小间距 | `px-2 py-1` | 水平8px 垂直4px |
| 极小间距 | `px-1.5 py-0.5` | 水平6px 垂直2px |
| 徽章 | `px-2 py-0.5` | 水平8px 垂直2px |

### 外边距（Margin）

| 用途 | Tailwind类名 | 尺寸 |
|------|-------------|------|
| 垂直间距 | `mb-4` | 16px |
| 小间距 | `mb-2` / `mt-2` | 8px |
| 极小间距 | `mb-1` / `mt-1` | 4px |
| 水平间距 | `gap-2` | 8px |
| 小水平间距 | `gap-1` | 4px |

### 圆角（Border Radius）

| 用途 | Tailwind类名 | 尺寸 |
|------|-------------|------|
| 大圆角 | `rounded-lg` | 8px |
| 中圆角 | `rounded` | 4px |
| 小圆角 | `rounded-sm` | 2px |
| 圆形 | `rounded-full` | 9999px |

---

## 🖼️ 尺寸系统

### 按钮尺寸

| 类型 | 高度 | 宽度 | 图标尺寸 |
|------|------|------|----------|
| 大按钮 | `h-8` | 32px | `w-4 h-4` |
| 中按钮 | `h-6` | 24px | `w-3 h-3` |
| 小按钮 | 自定义 | - | `w-2.5 h-2.5` |

### 图片尺寸

| 类型 | 宽高比 | 尺寸 |
|------|--------|------|
| 封面图 | `aspect-video` | 16:9 |
| 正方形 | `aspect-square` | 1:1 |
| 缩略图 | `w-12 h-12` | 48×48px |
| 小缩略图 | `w-8 h-8` | 32×32px |

### 对话框尺寸

| 类型 | 宽度 | 高度 |
|------|------|------|
| 向导对话框 | `max-w-2xl` | 最大672px |
| 最大高度 | `max-h-[85vh]` | 85%视口高度 |
| 内容区 | `max-h-[320px]` | 320px |
| 内容区（大） | `max-h-[48vh]` | 48%视口高度 |

---

## 🎭 动画系统

### 旋转动画

| 动画 | 持续时间 | 使用场景 |
|------|----------|----------|
| 旋转图标 | `storyboard-rotate 4s linear infinite` | 故事板图标旋转 |
| 慢速旋转 | `animate-spin-slow 8s` | 背景渐变旋转 |

### 渐变动画

| 动画 | 类型 | 使用场景 |
|------|------|----------|
| 渐变移动 | `bg-[length:200%_100%]` | 进度条背景 |
| 脉冲 | `animate-pulse` | 运行中指示器 |
| 自转 | `animate-spin` | Loading图标 |

### 过渡效果

| 属性 | 持续时间 | 使用场景 |
|------|----------|----------|
| 透明度 | `duration-300` | 图片淡入淡出 |
| 通用过渡 | `transition-all` | 所有状态变化 |
| 颜色过渡 | `transition-colors` | 背景和颜色变化 |

---

## 📱 响应式断点

| 断点 | 屏幕宽度 | 网格列数 |
|------|----------|----------|
| 默认 | < 1024px | 2列 |
| lg | ≥ 1024px | 3列 |
| xl | ≥ 1280px | 4列 |

示例：
```tsx
<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
```

---

## 🎯 特殊效果

### 渐变文字

```tsx
className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
```

### 模糊背景

```tsx
className="backdrop-blur-xl" // 对话框背景
```

### 阴影效果

```tsx
className="shadow-2xl" // 放大查看图片
```

### 滚动区域

```tsx
<ScrollArea className="h-full" />
<ScrollArea className="flex-1" />
```

---

## 🔲 组件特定样式

### StoryboardWizard（向导对话框）

| 元素 | 样式类名 |
|------|----------|
| 对话框容器 | `max-w-2xl max-h-[85vh] bg-slate-900 border-slate-700 text-slate-100` |
| 标题 | `text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent` |
| 关闭按钮 | `h-8 w-8 text-slate-400 hover:text-slate-200` |
| 上一步按钮 | `border-slate-600 text-slate-300 hover:bg-slate-800` |
| 下一步按钮 | `bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white` |
| 提交按钮 | `bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white` |

### StoryboardPanel（场景卡片）

| 元素 | 样式类名 |
|------|----------|
| 卡片容器 | `rounded-lg border border-white/10 bg-black/20 overflow-hidden group` |
| 图片区域 | `aspect-video bg-white/5 relative` |
| 场景编号徽章 | `absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium` |
| 镜头类型 | `text-xs font-medium text-primary` |
| 画面描述 | `text-xs text-muted-foreground line-clamp-2` |
| 旁白 | `text-[10px] text-cyan-400/70 line-clamp-1` |

### StoryboardAssetCard（资产卡片）

| 元素 | 样式类名 |
|------|----------|
| 卡片容器 | `group relative rounded-lg overflow-hidden cursor-pointer transition-all` |
| 选中状态 | `ring-2 ring-primary` |
| 悬停效果 | `hover:ring-1 hover:ring-white/20` |
| 封面图 | `aspect-video bg-white/5 relative` |
| 悬停遮罩 | `absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2` |
| 场景数量徽章 | `absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 rounded text-[10px] text-white font-medium` |
| 音频状态 | `p-1 bg-green-500/80 rounded text-[10px] text-white` |

### StoryboardTaskQueue（任务队列）

| 元素 | 样式类名 |
|------|----------|
| 任务卡片 | `rounded-lg bg-white/5 border border-white/10 overflow-hidden` |
| 进度条 | `w-full bg-muted rounded-full h-1 mt-2 overflow-hidden` |
| 进度条填充 | `h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all` |
| 完成提示Toast | `bg-green-500/10 border-t border-green-500/20` |

### StoryboardTaskAnimation（任务动画）

| 元素 | 样式类名 |
|------|----------|
| 动画容器 | `bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30 border border-purple-500/20` |
| 图标背景 | `w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500` |
| 进度百分比 | `text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent` |
| 子进度条 | `h-1 bg-white/5 rounded-full overflow-hidden` |

---

## 🎨 颜色使用示例

### 紫粉渐变（主色调）
```tsx
// 文字渐变
className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"

// 按钮渐变
className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"

// 进度条渐变
className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
```

### 状态颜色
```tsx
// 成功
className="text-green-400 bg-green-500/20"

// 错误
className="text-red-400 bg-red-500/20"

// 进行中
className="text-purple-400 bg-purple-500/20"

// 等待中
className="text-slate-500 bg-white/5"
```

### 背景透明度
```tsx
// 半透明黑色
className="bg-black/20"  // 20%透明度
className="bg-black/40"  // 40%透明度
className="bg-black/60"  // 60%透明度
className="bg-black/80"  // 80%透明度

// 半透明白色
className="bg-white/5"   // 5%透明度
className="bg-white/10"  // 10%透明度
className="bg-white/20"  // 20%透明度
```

---

## 📝 使用建议

### 颜色选择
1. **主要操作**：使用紫粉渐变（purple-400 to pink-400）
2. **成功状态**：使用绿色（green-400/500）
3. **错误状态**：使用红色（red-400/500）
4. **进行中**：使用紫色（purple-400/500）
5. **辅助信息**：使用slate灰色系

### 间距规范
1. **卡片间距**：gap-2 或 gap-3（8-12px）
2. **内边距**：p-2（小卡片）、p-4（大卡片）
3. **外边距**：mb-2（垂直间距）、gap-2（水平间距）

### 字体层级
1. **标题**：text-lg（18px）
2. **正文**：text-xs（12px）
3. **小字**：text-[10px]（10px）

---

**文档生成时间**：2026-04-20 21:36
**分析组件数**：8个前端组件
**样式参数总数**：100+ 个
