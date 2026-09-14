# 动画组件使用指南

> 基于 Framer Motion 的高级动画组件库

---

## 📦 可用组件

### 1. PageTransition - 页面过渡

页面切换时的淡入淡出动画。

**使用方法**：
```tsx
import { PageTransition } from '@/components/animations'

function MyPage() {
  return (
    <PageTransition duration={0.2}>
      <YourPageContent />
    </PageTransition>
  )
}
```

**Props**：
- `children` - React.ReactNode（必需）
- `duration` - number（可选，默认 0.2s）

---

### 2. StaggeredList - 列表交错动画

列表项逐个进入的交错动画效果。

**使用方法**：
```tsx
import { StaggeredList } from '@/components/animations'

function MyList() {
  const items = [1, 2, 3, 4, 5]

  return (
    <StaggeredList staggerDelay={0.05} className="grid grid-cols-1 gap-3">
      {items.map((item) => (
        <div key={item}>Item {item}</div>
      ))}
    </StaggeredList>
  )
}
```

**Props**：
- `children` - ReactNode（必需）
- `staggerDelay` - number（可选，默认 0.05s）
- `className` - string（可选）

**适用场景**：
- 节点模板列表 ✅
- 历史记录列表
- 设置项列表
- 任何需要逐项显示的列表

---

### 3. HoverScale - Hover 缩放效果

Hover 时轻微缩放和阴影增强。

**使用方法**：
```tsx
import { HoverScale } from '@/components/animations'

function MyCard() {
  return (
    <HoverScale scale={1.02} className="card">
      <CardContent />
    </HoverScale>
  )
}
```

**Props**：
- `children` - ReactNode（必需）
- `scale` - number（可选，默认 1.02）
- `className` - string（可选）

**适用场景**：
- 卡片 hover 效果
- 按钮 hover 效果
- 任何需要反馈的交互元素

---

### 4. FadeIn - 淡入动画

组件挂载时的淡入效果。

**使用方法**：
```tsx
import { FadeIn } from '@/components/animations'

function MyComponent() {
  return (
    <FadeIn delay={0.1} duration={0.2}>
      <Content />
    </FadeIn>
  )
}
```

**Props**：
- `children` - ReactNode（必需）
- `delay` - number（可选，默认 0s）
- `duration` - number（可选，默认 0.2s）
- `className` - string（可选）

**适用场景**：
- 延迟显示的内容
- 加载后的内容显示
- 次要内容的渐进式显示

---

### 5. SlideIn - 滑入动画

从指定方向滑入并淡入。

**使用方法**：
```tsx
import { SlideIn } from '@/components/animations'

function MyComponent() {
  return (
    <SlideIn direction="left" distance={20} duration={0.2}>
      <Content />
    </SlideIn>
  )
}
```

**Props**：
- `children` - ReactNode（必需）
- `direction` - 'left' | 'right' | 'up' | 'down'（可选，默认 'up'）
- `distance` - number（可选，默认 20px）
- `duration` - number（可选，默认 0.2s）
- `className` - string（可选）

**适用场景**：
- 面板滑入效果
- 侧边栏显示
- 模态框显示

---

## ⚡ 性能优化建议

### 1. 避免过度使用

❌ **不好的做法**：
```tsx
{items.map((item) => (
  <FadeIn key={item.id}>  // 每个项都单独淡入
    <Item content={item} />
  </FadeIn>
))}
```

✅ **好的做法**：
```tsx
<StaggeredList staggerDelay={0.05}>  // 使用交错动画
  {items.map((item) => (
    <Item key={item.id} content={item} />
  ))}
</StaggeredList>
```

### 2. 使用 prefers-reduced-motion

所有动画组件都自动遵循 `prefers-reduced-motion` 设置。

### 3. 合理的动画时长

- 微交互：150-200ms
- 列表动画：50-100ms stagger
- 页面过渡：200-300ms

---

## 🎨 动画设计原则

### 1. 保持一致性

所有动画使用统一的缓动函数：`cubic-bezier(0.4, 0, 0.2, 1)`

### 2. 提供反馈

动画应该提供有意义的反馈，而不是为了动而动。

### 3. 尊重用户偏好

自动检测并尊重 `prefers-reduced-motion` 设置。

---

## 📚 实际应用示例

### 节点模板列表（已实现）

```tsx
<StaggeredList staggerDelay={0.03} className="grid grid-cols-1 gap-3">
  {nodeTemplates.map((template) => (
    <Card key={template.type}>
      <NodeTemplateContent template={template} />
    </Card>
  ))}
</StaggeredList>
```

### 自定义节点按钮（已实现）

```tsx
<FadeIn delay={0.3}>
  <Card className="cursor-pointer">
    <Plus className="h-4 w-4" />
    <span>自定义节点类型</span>
  </Card>
</FadeIn>
```

---

## 🐛 故障排除

### 动画不流畅

**问题**：动画卡顿或掉帧

**解决方案**：
1. 减少同时动画的元素数量
2. 使用 CSS transforms 而非 width/height
3. 检查是否有昂贵的计算

### 动画延迟

**问题**：动画触发有延迟

**解决方案**：
1. 减少 stagger 延迟时间
2. 减少动画元素数量
3. 优化组件渲染性能

---

## 📖 参考资料

- [Framer Motion 官方文档](https://www.framer.com/motion/)
- [动画最佳实践](https://www.framer.com/motion/guide-reduce-bundle-size/)
- [性能优化指南](https://www.framer.com/motion/guide-improve-perf/)
