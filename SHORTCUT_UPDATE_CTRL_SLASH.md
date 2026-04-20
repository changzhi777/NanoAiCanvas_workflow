# 快捷键更新：Ctrl+/ 代替 ?

> **更新日期**: 2026-04-15
> **版本**: v2.2.0
> **更新类型**: 快捷键调整

---

## 🔄 更新内容

将快捷键帮助的快捷键从 `?` 改为 `Ctrl+/` (Mac 上是 `⌘+/`)。

### 更新原因

1. **更符合行业标准**
   - 很多应用使用 `Ctrl+/` 或 `⌘+/` 作为快捷键帮助
   - 如：GitHub、VS Code、Figma 等

2. **避免单键冲突**
   - `?` 是单键，容易误触
   - `Ctrl+/` 是组合键，更安全

3. **更好的可发现性**
   - 斜杠 `/` 在键盘右下角，易于记忆
   - 组合键提示"帮助"功能（"求助"= "/"）

---

## 📝 修改详情

### 1. 快捷键处理逻辑

**文件**: `src/hooks/useShortcuts.ts`

```typescript
// 修改前：
if (e.key === '?' && !cmdOrCtrl && !e.shiftKey) {
  e.preventDefault()
  dispatch(toggleShortcutPanel())
}

// 修改后：
if (cmdOrCtrl && e.key === '/') {
  e.preventDefault()
  dispatch(toggleShortcutPanel())
}
```

---

### 2. 默认快捷键配置

**文件**: `src/config/shortcuts.ts`

```typescript
// 修改前：
{
  id: 'toggle-shortcuts',
  defaultKeys: ['?'],
  currentKeys: ['?'],
  description: '显示/隐藏快捷键面板',
}

// 修改后：
{
  id: 'toggle-shortcuts',
  defaultKeys: ['⌘', '/'],
  currentKeys: ['⌘', '/'],
  description: '显示/隐藏快捷键面板',
}
```

---

### 3. 首次引导弹窗

**文件**: `src/components/canvas/FirstTimeGuide.tsx`

```typescript
// 修改前：
shortcut: {
  key: ['?'],
  description: '显示/隐藏快捷键面板',
},
tips: [
  '随时按 ? 键查看所有快捷键',
  // ...
]

// 修改后：
shortcut: {
  key: ['⌘', '/'],
  description: '显示/隐藏快捷键面板',
},
tips: [
  '随时按 ⌘/ (Mac) 或 Ctrl+/ (Windows) 查看所有快捷键',
  // ...
]
```

---

### 4. 底部提示

**文件**: `src/components/canvas/ShortcutHintPanel.tsx`

```typescript
// 修改前：
<kbd>?</kbd>
<span>切换</span>

// 修改后：
<kbd>⌘/</kbd>
<span>切换</span>
```

---

## 🎯 使用方法

### Mac 用户
```
按 ⌘ + / 键
```

### Windows/Linux 用户
```
按 Ctrl + / 键
```

---

## ✅ 测试验证

### 测试步骤

1. **Mac 平台**
   ```
   按 ⌘ + / 键
   → 快捷键面板应该打开
   ```

2. **Windows 平台**
   ```
   按 Ctrl + / 键
   → 快捷键面板应该打开
   ```

3. **面板内部**
   ```
   - 底部提示显示 "⌘/ 切换"
   - 引导弹窗显示 "⌘ + /" 快捷键
   ```

### 测试状态

- ✅ 类型检查通过
- ✅ 生产构建成功
- ✅ 功能正常工作

---

## 📊 兼容性

### 平台支持

| 平台 | 快捷键 | 显示 | 状态 |
|------|--------|------|------|
| macOS | ⌘ + / | ⌘/ | ✅ 支持 |
| Windows | Ctrl + / | ⌘/ | ✅ 支持 |
| Linux | Ctrl + / | ⌘/ | ✅ 支持 |

### 键盘布局

- **QWERTY**: `/` 在右下角，Shift 键旁边
- **AZERTY**: `/` 需要按下 Shift 键
- **QWERTZ**: `/` 在右下角

---

## 🎉 总结

### 修改的文件

1. ✅ `src/hooks/useShortcuts.ts` - 快捷键处理逻辑
2. ✅ `src/config/shortcuts.ts` - 默认配置
3. ✅ `src/components/canvas/FirstTimeGuide.tsx` - 引导弹窗
4. ✅ `src/components/canvas/ShortcutHintPanel.tsx` - 底部提示

### 改进效果

- ✅ 更符合行业标准
- ✅ 避免单键冲突
- ✅ 更好的可发现性
- ✅ 跨平台一致体验

---

**🎊 快捷键帮助现在使用 Ctrl+/ (⌘/)，更符合行业标准！**
