[根目录](../../CLAUDE.md) > [src](../) > **hooks**

---

# Hooks 模块 - 自定义 React Hooks

> 可复用的自定义 Hooks 集合

**最后更新**: 2026-04-15
**维护者**: NanoAiCanvas Team

---

## 模块职责

Hooks 模块负责：

- 封装可复用的逻辑
- 处理自动保存
- 管理快捷键
- 国际化支持

---

## 入口与启动

### useAutosave

**文件**: `useAutosave.ts`

```typescript
export function useAutosave() {
  // 自动保存逻辑
}
```

**使用方式**:

```tsx
import { useAutosave } from '@/hooks/useAutosave'

function CanvasPage() {
  useAutosave()
  // ...
}
```

### useShortcuts

**文件**: `useShortcuts.ts`

```typescript
export function useShortcuts() {
  // 快捷键逻辑
}
```

**使用方式**:

```tsx
import { useShortcuts } from '@/hooks/useShortcuts'

function CanvasPage() {
  useShortcuts()
  // ...
}
```

### useI18n

**文件**: `useI18n.ts`

```typescript
export function useI18n() {
  const { t } = useTranslation('common')
  return { t }
}
```

**使用方式**:

```tsx
import { useI18n } from '@/hooks/useI18n'

function Component() {
  const { t } = useI18n()
  return <div>{t('common.save')}</div>
}
```

---

## 对外接口

### useAutosave

**功能**:
- 定时自动保存数据到 localStorage
- 可配置保存间隔
- 显示保存成功提示

**依赖**:
- `selectAutosave`: 自动保存开关
- `selectAutosaveInterval`: 保存间隔（ms）

### useShortcuts

**快捷键列表**:
- `Ctrl/Cmd + S`: 保存
- `Ctrl/Cmd + Z`: 撤销
- `Ctrl/Cmd + Shift + Z`: 重做
- `Ctrl/Cmd + Y`: 重做
- `Delete/Backspace`: 删除选中
- `Ctrl/Cmd + D`: 复制
- `Ctrl/Cmd + +`: 放大
- `Ctrl/Cmd + -`: 缩小
- `Ctrl/Cmd + 0`: 适应屏幕
- `F1`: 切换属性面板
- `F2`: 切换模板面板

### useI18n

**返回值**:
```typescript
{
  t: (key: string) => string
}
```

**使用示例**:
```tsx
const { t } = useI18n()
<button>{t('common.save')}</button>
```

---

## 关键依赖与配置

### 依赖项

- `react-redux`: Redux 集成
- `react-i18next`: 国际化
- `sonner`: Toast 通知

---

## 测试与质量

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] 自动保存触发
- [ ] 快捷键响应
- [ ] 国际化切换

---

## 常见问题 (FAQ)

### Q: 如何添加新的快捷键？

A: 在 `useShortcuts.ts` 的 `handleKeyDown` 函数中添加新的条件判断。

### Q: 如何修改自动保存间隔？

A: 通过 Redux Store 修改 `settingsSlice` 中的 `autosaveInterval`。

---

## 相关文件清单

```
src/hooks/
├── useAutosave.ts           # 自动保存
├── useShortcuts.ts          # 快捷键
└── useI18n.ts               # 国际化
```

---

## 变更记录 (Changelog)

### 2026-04-15
- 初始化模块文档
- 实现自动保存 Hook
- 实现快捷键 Hook
- 实现国际化 Hook
