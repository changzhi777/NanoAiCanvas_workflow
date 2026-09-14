# 快捷键更新：⌘F1 查看快捷键帮助

> **更新日期**: 2026-04-15
> **版本**: v2.2.0
> **更新类型**: 快捷键调整

---

## 🔄 更新内容

将快捷键帮助的快捷键改为 `⌘F1` (Mac) 或 `Ctrl+F1` (Windows/Linux)。

### 设计理由

1. **功能键专用**
   - F1 传统上用于"帮助"功能
   - ⌘F1 组合键明确表示"快捷键帮助"

2. **避免冲突**
   - 单独 F1：切换属性面板
   - ⌘F1：显示快捷键面板
   - 两个功能互不干扰

3. **易于记忆**
   - F1 = 帮助
   - ⌘F1 = 快捷键帮助
   - 符合用户直觉

---

## 📝 修改详情

### 1. 快捷键处理逻辑

**文件**: `src/hooks/useShortcuts.ts`

```typescript
// 最终版本：
// Ctrl/Cmd + F1: 显示快捷键面板
if (cmdOrCtrl && e.key === 'F1') {
  e.preventDefault()
  dispatch(toggleShortcutPanel())
  AchievementStorage.recordShortcutUsage('toggle-shortcuts')
}

// 单独 F1: 切换属性面板（保持不变）
if (e.key === 'F1' && !cmdOrCtrl) {
  e.preventDefault()
  dispatch(togglePanel('properties'))
  AchievementStorage.recordShortcutUsage('toggle-properties')
}
```

**关键点**：
- `e.key === 'F1' && !cmdOrCtrl` → 单独按 F1，切换属性面板
- `cmdOrCtrl && e.key === 'F1'` → ⌘F1 或 Ctrl+F1，显示快捷键面板

---

### 2. 默认快捷键配置

**文件**: `src/config/shortcuts.ts`

```typescript
{
  id: 'toggle-shortcuts',
  defaultKeys: ['⌘', 'F1'],
  currentKeys: ['⌘', 'F1'],
  description: '显示/隐藏快捷键面板',
  category: 'basic',
  important: true,
}
```

---

### 3. 首次引导弹窗

**文件**: `src/components/canvas/FirstTimeGuide.tsx`

```typescript
shortcut: {
  key: ['⌘', 'F1'],
  description: '显示/隐藏快捷键面板',
},
tips: [
  '随时按 ⌘F1 (Mac) 或 Ctrl+F1 (Windows) 查看所有快捷键',
  '快捷键面板支持搜索功能',
  '常用快捷键会有高亮标记',
]
```

---

### 4. 底部提示

**文件**: `src/components/canvas/ShortcutHintPanel.tsx`

```typescript
<kbd>⌘F1</kbd>
<span>切换</span>
```

---

## 🎯 使用方法

### Mac 用户
```
按 ⌘ + F1 键
```

### Windows/Linux 用户
```
按 Ctrl + F1 键
```

---

## ⚠️ 重要说明：F1 键的双重用途

| 快捷键 | 功能 | 状态 |
|--------|------|------|
| `F1` (单独) | 切换属性面板 | ✅ 保持 |
| `⌘F1` / `Ctrl+F1` | 显示快捷键面板 | ✅ 新增 |

**使用提示**：
- 单独按 F1 → 右侧属性面板展开/收起
- 按 ⌘F1 → 快捷键帮助面板打开/关闭

---

## ✅ 测试验证

### 测试步骤

1. **测试 ⌘F1 打开快捷键面板**
   ```
   按 ⌘ + F1
   → 快捷键面板应该打开
   ```

2. **测试 F1 单独按键**
   ```
   单独按 F1
   → 属性面板应该切换
   ```

3. **面板底部提示**
   ```
   打开快捷键面板
   → 底部显示 "⌘F1 切换"
   ```

4. **首次引导**
   ```
   清除 localStorage，刷新页面
   按 ⌘F1
   → 显示引导弹窗，第一步显示 "⌘ + F1"
   ```

### 测试状态

- ✅ 类型检查通过
- ✅ 生产构建成功
- ✅ 功能正常工作

---

## 🎨 快捷键布局

```
功能键区：
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Esc │ F1  │ F2  │ F3  │ F4  │ F5  │ F6  │ F7  │ F8  │ F9  │ F10 │ F11 │ F12 │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
        │     │
        │     └─ ⌘F2: 模板面板
        │
        └─ ⌘F1: 快捷键帮助 (新增)
           F1: 属性面板 (保持)

修饰键：
┌──────┬──────┬──────┐
│  ⌃   │  ⌥   │  ⌘   │
│ Ctrl │ Option│ Cmd  │
└──────┴──────┴──────┘
```

---

## 📊 快捷键对照表

| 功能 | Mac | Windows/Linux | 说明 |
|------|-----|---------------|------|
| 快捷键帮助 | ⌘F1 | Ctrl+F1 | 打开/关闭快捷键面板 |
| 属性面板 | F1 | F1 | 展开/收起属性面板 |
| 模板面板 | F2 | F2 | 展开/收起模板面板 |
| 工具栏 | ⌘B | Ctrl+B | 显示/隐藏工具栏 |

---

## 🎉 总结

### 修改的文件

1. ✅ `src/hooks/useShortcuts.ts` - 快捷键处理逻辑
2. ✅ `src/config/shortcuts.ts` - 默认配置
3. ✅ `src/components/canvas/FirstTimeGuide.tsx` - 引导弹窗
4. ✅ `src/components/canvas/ShortcutHintPanel.tsx` - 底部提示

### 改进效果

- ✅ F1 键专用于帮助功能
- ✅ ⌘F1 组合键明确表示快捷键帮助
- ✅ 与单独 F1 切换属性面板互不冲突
- ✅ 符合用户对 F1 = 帮助的认知

### 快捷键演变历史

```
v2.1.2 及之前:  ? 键
v2.2.0 初版:    Ctrl+/ (⌘/)
v2.2.0 最终:    ⌘F1 (Ctrl+F1) ← 当前版本
```

---

**🎊 快捷键帮助现在使用 ⌘F1 (Ctrl+F1)，更符合 F1=帮助的行业惯例！**
