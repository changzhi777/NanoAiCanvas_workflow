# NanoAiCanvas - 快速开始指南

> **版本**: v2.0.4
> **最后更新**: 2026-04-15
> **开发环境**: http://localhost:3002

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

服务器将启动在 http://localhost:3000 （或下一个可用端口）

### 3. 打开浏览器

访问 http://localhost:3002 开始使用

---

## 🎯 核心功能

### 全屏布局

**浮动菜单栏（左上角）**
- ➕ 添加节点
- 🔍 视图控制（放大/缩小/适应）
- ⚙️ 扩展菜单（撤销/重做/面板/工具栏）

**边缘触发器**
- 左边缘：悬停200ms → 模板面板
- 右边缘：悬停200ms → 属性面板

**快捷键面板**
- 按 `?` 键打开
- 显示26个快捷键，分5个分类

### 节点系统

**7种节点类型**
- 📋 任务（Task）
- 📅 事件（Event）
- 🏁 里程碑（Milestone）
- 🔀 决策（Decision）
- 💾 数据（Data）
- 🚀 开始（Start）
- ✅ 结束（End）

**节点状态**
- ⚪ 未开始
- ⏳ 进行中
- ✅ 已完成
- 🚫 已阻塞

### 快捷键大全

#### 基础操作
| 快捷键 | 功能 |
|--------|------|
| `N` | 添加节点 |
| `⌘S` / `Ctrl+S` | 保存 |
| `⌘Z` / `Ctrl+Z` | 撤销 |
| `⌘⇧Z` / `Ctrl+Shift+Z` | 重做 |
| `⌫` / `Delete` | 删除选中 |
| `?` | 快捷键面板 |

#### 视图控制
| 快捷键 | 功能 |
|--------|------|
| `⌘+` / `Ctrl++` | 放大 |
| `⌘-` / `Ctrl+-` | 缩小 |
| `⌘0` / `Ctrl+0` | 适应视图 |
| `空格+拖拽` | 平移画布 |
| `⇧+滚轮` | 水平缩放 |
| `滚轮` | 垂直缩放 |

#### 编辑操作
| 快捷键 | 功能 |
|--------|------|
| `Enter` | 编辑节点 |
| `⌘C` / `Ctrl+C` | 复制 |
| `⌘V` / `Ctrl+V` | 粘贴 |
| `⌘D` / `Ctrl+D` | 快速复制 |
| `⇧+拖拽` | 多选 |
| `⌘A` / `Ctrl+A` | 全选 |

#### 面板控制
| 快捷键 | 功能 |
|--------|------|
| `F1` | 属性面板 |
| `F2` | 模板面板 |
| `⌘B` / `Ctrl+B` | 工具栏 |
| `⌘/` | 侧边栏 |

#### 导航操作
| 快捷键 | 功能 |
|--------|------|
| `⌘F` / `Ctrl+F` | 搜索节点 |
| `Tab` | 下一个节点 |
| `⇧Tab` | 上一个节点 |
| `Esc` | 取消选择 |

---

## 📝 开发命令

### 开发
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
```

### 代码质量
```bash
npm run lint         # ESLint检查
npm run lint:fix     # ESLint修复
npm run format       # Prettier格式化
npm run type-check   # TypeScript类型检查
```

### 测试
```bash
npm run test         # 运行单元测试
npm run test:ui      # 测试UI模式
npm run test:e2e     # E2E测试
```

---

## 🎨 自定义配置

### 主题配置

项目使用 **Base Nova 暗色主题**，配色基于 **OKLCH 颜色空间**。

修改主题：编辑 `src/styles/globals.css`

```css
:root {
  --primary: 168 70% 45%;      /* 主色调（青绿色） */
  --accent: 168 80% 55%;       /* 强调色（亮青绿） */
  --background: 0 0% 7%;       /* 背景色 */
  --foreground: 0 0% 98%;      /* 前景色 */
}
```

### 节点样式

修改节点样式：编辑 `src/styles/globals.css`

```css
.card-node {
  transform: scale(0.5);  /* 默认50%显示比例 */
  transition: all 0.3s ease-out;
}
```

### 快捷键配置

修改快捷键：编辑 `src/hooks/useShortcuts.ts`

```typescript
if (e.key === '?') {
  dispatch(toggleShortcutPanel())
}
```

---

## 📊 项目结构

```
NanoAiCanvas/
├── src/
│   ├── components/
│   │   ├── canvas/          # 画布组件
│   │   │   ├── Canvas.tsx
│   │   │   ├── FloatingMenuBar.tsx
│   │   │   ├── EdgeHoverTrigger.tsx
│   │   │   └── ShortcutHintPanel.tsx
│   │   ├── panels/          # 侧边面板
│   │   │   ├── PropertiesPanel.tsx
│   │   │   └── NodeTemplatesPanel.tsx
│   │   └── ui/              # shadcn/ui组件
│   ├── store/               # Redux状态管理
│   │   ├── slices/
│   │   │   ├── canvasSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   └── settingsSlice.ts
│   │   └── hooks.ts
│   ├── pages/               # 页面组件
│   │   └── CanvasPage.tsx
│   ├── hooks/               # 自定义Hooks
│   ├── styles/              # 全局样式
│   └── types/               # TypeScript类型
├── VERSION.md               # 版本历史
├── TESTING_CHECKLIST.md     # 测试清单
└── package.json
```

---

## 🐛 常见问题

### Q: 如何添加新的节点类型？

A:
1. 在 `src/types/index.ts` 中添加新的 `NodeType`
2. 创建新的节点组件
3. 在 `Canvas.tsx` 的 `nodeTypes` 中注册

### Q: 如何自定义快捷键？

A: 编辑 `src/hooks/useShortcuts.ts`，添加新的键盘事件监听。

### Q: 如何修改节点显示比例？

A: 编辑 `src/styles/globals.css`，修改 `.card-node` 的 `transform: scale()` 值。

### Q: 如何禁用某个快捷键？

A: 在 `src/hooks/useShortcuts.ts` 中注释掉对应的快捷键代码。

---

## 🔧 故障排除

### 端口被占用

```bash
# Windows
npx kill-port 3000

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### 依赖安装失败

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript错误

```bash
npm run type-check
# 查看具体错误信息
```

---

## 📚 更多资源

- [完整测试清单](./TESTING_CHECKLIST.md)
- [版本历史](./VERSION.md)
- [项目文档](./CLAUDE.md)
- [React Flow文档](https://reactflow.dev/)
- [shadcn/ui文档](https://ui.shadcn.com/)

---

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

---

## 📄 许可证

本项目为专有软件，版权所有。

**作者**: 外星动物（常智）
**组织**: IoTchange
**邮箱**: 14455975@qq.com
**版权**: Copyright (C) 2026 IoTchange - All Rights Reserved

---

**祝您使用愉快！** ✨
