# Nano2 UI/UX 设计规范

> 基于 `src/app/nano2/page.tsx` 及其关联组件的视觉设计提取
> 版本：1.0.0 | 更新：2026-05-05

---

## 1. 布局系统

### 1.1 页面整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  Header (bg-card/80 backdrop-blur-xl border-b border-white/10) │
├─────────────────────────────────────────────────────────────┤
│  Main (grid grid-cols-12 gap-3 p-3)                          │
│  ┌──────────┬──────────┬──────────┐                         │
│  │ Generation│ TaskDetail │ History/ │                        │
│  │ Panel     │ Panel     │ Assets   │                        │
│  │ (4列)     │ (5列)     │ (3列)    │                        │
│  └──────────┴──────────┴──────────┘                         │
├─────────────────────────────────────────────────────────────┤
│  Footer (bg-card/50 border-t border-white/10)                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 网格布局参数

| 类名 | 说明 |
|------|------|
| `grid grid-cols-12 gap-3 p-3` | 主区域12列网格，间距p-3 |
| `col-span-4` | 生成面板（4列） |
| `col-span-5` | 任务详情面板（5列） |
| `col-span-3` | 历史/资产面板（3列） |
| `min-h-0` | 允许面板内部滚动 |
| `flex-1` | 占满剩余空间 |

### 1.3 Flex 布局规范

```tsx
// 垂直布局（页面级）
<div className="flex flex-col h-screen">
  <Header />
  <main className="flex-1 ...">...</main>
  <Footer />
</div>

// 水平布局（面板内）
<div className="flex items-center gap-3">

// 面板容器
<div className="flex flex-col h-full">
```

---

## 2. 毛玻璃效果规范（Frosted Glass）

### 2.1 核心样式组合

```css
/* 深层毛玻璃（Header、大面板） */
bg-card/80 backdrop-blur-xl border-b border-white/10

/* 中层毛玻璃（内容面板） */
bg-card/60 border border-white/10 backdrop-blur-xl rounded-xl

/* 浅层毛玻璃（Footer、次要区域） */
bg-card/50 border-t border-white/10

/* Tab 容器 */
bg-card/60 border border-white/10 backdrop-blur-xl rounded-t-xl
```

### 2.2 透明度和模糊等级

| 背景透明度 | 使用场景 |
|-----------|---------|
| `bg-card/80` | Header、主要导航 |
| `bg-card/60` | 内容面板、卡片 |
| `bg-card/50` | Footer、低优先级区域 |
| `bg-card/30` | 悬浮元素（hover状态） |

| 模糊等级 | 使用场景 |
|---------|---------|
| `backdrop-blur-xl` | 主面板（20px模糊） |
| `backdrop-blur-md` | 中等模糊 |
| `backdrop-blur-sm` | 轻微模糊 |

### 2.3 边框风格

```css
// 统一边框：1px 白色 10%透明度
border-white/10

// 仅底边框（分隔线效果）
border-b border-white/10

// 仅顶边框
border-t border-white/10

// 4边边框
border border-white/10

// 无边框
border-0
```

---

## 3. 色彩系统

### 3.1 主题色彩

| 变量 | 值 | 用途 |
|------|-----|------|
| `primary` | `#3ecf8e` | 主操作按钮、强调元素 |
| `primary/10` | 10%透明 | 背景高亮 |
| `primary/20` | 20%透明 | 次要强调 |
| `foreground` | 白色 | 主要文字 |

### 3.2 背景色彩层级

```tsx
// 页面背景
bg-background

// 卡片/面板背景
bg-card/80     // Header级别
bg-card/60     // 内容面板
bg-card/50     // Footer级别

// Muted 背景
bg-muted       // 按钮、输入框
bg-muted/80    // hover状态
```

### 3.3 文字色彩

```tsx
// 主要文字
text-foreground

// 次要文字
text-muted-foreground

// 弱化文字
text-muted-foreground/60

// 标签文字
text-xs text-muted-foreground
```

### 3.4 图标色彩

```tsx
// 默认图标
text-muted-foreground

// 激活图标
text-foreground

// 主题图标
text-primary

// 禁用图标
text-muted-foreground/50
```

---

## 4. 圆角系统

### 4.1 圆角等级

| 类名 | 圆角 | 用途 |
|------|------|------|
| `rounded-none` | 0px | 无圆角 |
| `rounded-sm` | 4px | 小元素 |
| `rounded-md` | 6px | Tab trigger、按钮 |
| `rounded-lg` | 8px | 输入框、卡片 |
| `rounded-xl` | 12px | 大面板、对话框 |
| `rounded-2xl` | 16px | 超大容器 |
| `rounded-full` | 全圆 | 胶囊按钮、头像 |

### 4.2 圆角使用规范

```tsx
// 页面主面板
rounded-xl

// Header
rounded-none (border分隔)

// Tab容器
rounded-t-xl (仅顶部)

// Tab Trigger
rounded-md

// 按钮
rounded-full (胶囊按钮)
rounded-md (普通按钮)

// 输入框
rounded-lg

// 小标签
rounded-full (胶囊标签)
```

---

## 5. 间距系统

### 5.1 间距规范

| 类名 | 值 | 用途 |
|------|-----|------|
| `p-1` / `py-1` / `px-1` | 4px | 紧凑间距 |
| `p-2` / `py-2` / `px-2` | 8px | 小间距 |
| `p-3` / `py-3` / `px-3` | 12px | 标准间距（主区域） |
| `p-4` / `py-4` / `px-4` | 16px | 大间距 |
| `gap-1` | 4px | 紧凑gap |
| `gap-2` | 8px | 小gap |
| `gap-3` | 12px | 标准gap（面板内） |
| `gap-4` | 16px | 大gap |

### 5.2 典型间距组合

```tsx
// 面板内间距
<div className="p-3 space-y-3">

// Header 间距
<div className="px-4 py-3">

// 按钮组间距
<div className="flex items-center gap-2">

// Tab 间距
<div className="gap-1 px-3 py-2">
```

---

## 6. 组件规范

### 6.1 按钮样式

```tsx
// 胶囊按钮（主要导航）
<button className="px-3 py-1.5 rounded-full text-sm bg-primary text-white">
  主操作
</button>

// 次要胶囊按钮
<button className="px-3 py-1.5 rounded-full text-sm bg-muted text-foreground hover:bg-muted/80">
  次要操作
</button>

// 禁用胶囊按钮
<button className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary/50 cursor-not-allowed opacity-50" disabled>
  禁用
</button>

// 图标按钮
<button className="p-2 rounded-lg hover:bg-white/10">
  <Icon className="w-4 h-4" />
</button>
```

### 6.2 Tabs 组件样式

```tsx
// Tab 容器
<div className="flex items-center gap-1 px-3 py-2 bg-card/60 border border-white/10 backdrop-blur-xl rounded-t-xl shrink-0">
  <TabsList className="bg-transparent gap-1 p-0 h-auto">
    <TabsTrigger
      value="tabValue"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm
                 data-[active]:bg-white/10 data-[active]:text-foreground
                 text-muted-foreground transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span>标签名</span>
    </TabsTrigger>
  </TabsList>
</div>
```

**关键样式说明**：
- `data-[active]:bg-white/10` - 选中态背景
- `data-[active]:text-foreground` - 选中态文字
- `text-muted-foreground` - 未选中态文字
- `transition-colors` - 平滑过渡

### 6.3 面板容器样式

```tsx
// 主内容面板
<div className="bg-card/60 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl h-full flex flex-col">
  {/* 内容 */}
</div>

// 带Tab的面板
<div className="bg-card/60 border border-white/10 backdrop-blur-xl rounded-b-xl overflow-hidden border border-t-0">
  {/* Tab内容 */}
</div>

// 分栏布局
<div className="flex items-start gap-2">
  <span className="text-muted-foreground/60 shrink-0 min-w-[40px]">{label}:</span>
  <span className="text-foreground/80">{value}</span>
</div>
```

### 6.4 滚动区域规范

```tsx
// 可滚动面板
<div className="min-h-0 flex-1 overflow-hidden">
  <ScrollArea className="h-full">
    {/* 内容 */}
  </ScrollArea>
</div>

// Tab内容区
<div className="flex-1 min-h-0 overflow-hidden">
  <div className="h-full p-3">
    {/* 内容 */}
  </div>
</div>
```

---

## 7. 交互规范

### 7.1 状态样式

```tsx
// 禁用状态
disabled
cursor-not-allowed
opacity-50

// Hover 状态
hover:bg-white/10
hover:bg-muted/80
hover:scale-105

// Active 状态
data-[active]:bg-white/10

// 过渡效果
transition-colors
transition-all duration-200
```

### 7.2 事件驱动通信

使用 `CustomEvent` 进行组件间通信：

```tsx
// 发送事件
window.dispatchEvent(new CustomEvent('history:switchToTasks'))

// 监听事件
useEffect(() => {
  const handleSwitchToTasks = () => {
    setActiveTab('tasks')
  }
  window.addEventListener('history:switchToTasks', handleSwitchToTasks)
  return () => window.removeEventListener('history:switchToTasks', handleSwitchToTasks)
}, [])
```

**事件列表**：
| 事件名 | 用途 |
|--------|------|
| `history:switchToTasks` | 切换到任务队列Tab |
| `history:viewDetail` | 查看会话详情 |
| `history:previewImage` | 预览图片 |
| `banana:promptGenerated` | 香蕉哥哥生成提示词 |
| `taskQueue:copyAndExecute` | 复制并执行任务 |

---

## 8. 阴影系统

```tsx
// 标准面板阴影
shadow-2xl

// 悬浮按钮阴影
shadow-lg hover:shadow-xl

// 输入框阴影
shadow-sm

// 无阴影
shadow-none
```

---

## 9. 响应式策略

当前 nano2 页面未使用响应式断点，采用固定 12 列布局。

如需响应式，可参考：

```tsx
// 移动端（< 768px）
grid-cols-1 gap-2

// 平板（768px - 1024px）
grid-cols-6 gap-3

// 桌面（> 1024px）
grid-cols-12 gap-3
```

---

## 10. 参考代码

### 10.1 完整页面布局

```tsx
<div className="flex flex-col h-screen">
  {/* Header */}
  <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-white/10">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-foreground">标题</h1>
        <p className="text-xs text-muted-foreground">副标题</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button className="px-3 py-1.5 rounded-full text-sm bg-muted text-foreground hover:bg-muted/80">
        操作
      </button>
    </div>
  </header>

  {/* Main Content */}
  <main className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
    {/* Left Panel - 4列 */}
    <div className="col-span-4 min-h-0">
      <Panel />
    </div>
    {/* Center Panel - 5列 */}
    <div className="col-span-5 min-h-0">
      <Panel />
    </div>
    {/* Right Panel - 3列 */}
    <div className="col-span-3 min-h-0 flex flex-col">
      <Tabs>
        <TabsList>...</TabsList>
        <TabsContent>...</TabsContent>
      </Tabs>
    </div>
  </main>

  {/* Footer */}
  <footer className="flex items-center justify-center px-4 py-2 bg-card/50 border-t border-white/10 text-xs text-muted-foreground">
    Footer Text
  </footer>
</div>
```

### 10.2 Tab 容器完整样式

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
  {/* Tab Header */}
  <div className="flex items-center gap-1 px-3 py-2 bg-card/60 border border-white/10 backdrop-blur-xl rounded-t-xl shrink-0">
    <TabsList className="bg-transparent gap-1 p-0 h-auto">
      <TabsTrigger
        value="tab1"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm
                   data-[active]:bg-white/10 data-[active]:text-foreground
                   text-muted-foreground transition-colors"
      >
        <Icon className="h-4 w-4" />
        <span>标签</span>
      </TabsTrigger>
    </TabsList>
  </div>
  {/* Tab Content */}
  <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden border border-t-0 border-white/10">
    <TabsContent value="tab1" className="h-full p-3">
      {/* Content */}
    </TabsContent>
  </div>
</Tabs>
```

---

## 附录：设计 token 速查表

| Token | 值 | 用途 |
|-------|-----|------|
| `--primary` | `#3ecf8e` | 主色调 |
| `--card` | 半透明黑 | 面板背景 |
| `--muted` | 灰色系 | 次要背景 |
| `--border` | `rgba(255,255,255,0.1)` | 边框色 |
| `--foreground` | 白色 | 主文字 |
| `--muted-foreground` | 灰色 | 次要文字 |
| `--radius-sm` | 4px | 小圆角 |
| `--radius-md` | 6px | 中圆角 |
| `--radius-lg` | 8px | 大圆角 |
| `--radius-xl` | 12px | 超大圆角 |
| `--radius-full` | 全圆 | 胶囊 |

---

**文档生成时间**：2026-05-05
**来源组件**：Nano2Header, Nano2Footer, GenerationPanel, TaskDetailPanel, HistoryPanel