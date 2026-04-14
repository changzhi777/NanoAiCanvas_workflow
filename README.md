# NanoAiCanvas

<div align="center">

![NanoAiCanvas Logo](./public/favicon.svg)

**现代化的无限画布应用 - 基于 React Flow 的节点编辑器**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.4-cyan)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2.11-purple)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [开发指南](#-开发指南) • [贡献指南](#-贡献指南)

</div>

---

## ✨ 功能特性

### 🎨 核心功能
- **无限画布**: 基于 React Flow，支持平滑缩放、平移、小地图导航
- **卡片节点**: 7 种预定义节点类型（任务、事件、里程碑、决策、数据、开始、结束）
- **自由连线**: 多种颜色、线型、动画效果，支持智能路由
- **拖拽交互**: 流畅的节点拖拽、缩放、对齐和吸附

### 🎯 高级特性
- **状态管理**: Redux Toolkit + IndexedDB 持久化
- **自动保存**: 可配置的自动保存间隔
- **撤销/重做**: 完整的历史记录管理
- **快捷键**: 全套键盘快捷键支持

### 🌐 国际化与主题
- **多语言**: 完整的中英文切换
- **主题系统**: Base Nova 暗色主题 + OKLCH 颜色空间
- **自定义主题**: 支持自定义节点颜色和样式

### 📦 导入/导出
- **JSON 格式**: 完整的导入/导出功能
- **图片导出**: 导出为 PNG/SVG
- **云端同步**: 预留云端 API 接口

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/nanoai-canvas.git
cd nanoai-canvas

# 安装依赖
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

---

## 🛠️ 开发指南

### 项目结构

```
nanoai-canvas/
├── src/
│   ├── components/      # UI 组件
│   ├── store/           # Redux 状态管理
│   ├── hooks/           # 自定义 Hooks
│   ├── lib/             # 工具库
│   ├── types/           # TypeScript 类型
│   └── styles/          # 全局样式
├── public/              # 静态资源
└── e2e/                 # E2E 测试
```

### 开发工具

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run type-check

# 运行测试
npm run test
```

### 添加新功能

1. **添加新的节点类型**:
   - 在 `src/types/index.ts` 中定义类型
   - 在 `src/components/canvas/nodes/` 中创建组件
   - 在 `src/components/panels/NodeTemplatesPanel.tsx` 中注册

2. **添加新的快捷键**:
   - 在 `src/hooks/useShortcuts.ts` 中添加键盘事件处理

3. **修改主题**:
   - 在 `src/styles/globals.css` 中修改 CSS 变量

---

## 🧪 测试

### 单元测试

```bash
# 运行测试
npm run test

# 测试 UI 模式
npm run test:ui
```

### E2E 测试

```bash
# 安装浏览器
npx playwright install

# 运行 E2E 测试
npm run test:e2e
```

---

## 📦 部署

### Vercel 部署

项目配置了 Vercel 自动部署。推送到 `main` 分支将自动触发部署。

### Docker 部署

```bash
# 构建镜像
docker build -t nanoai-canvas .

# 运行容器
docker run -p 80:80 nanoai-canvas
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 TypeScript 严格模式
- 使用 ESLint + Prettier 格式化代码
- 为新功能添加测试
- 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [React Flow](https://reactflow.dev/) - 强大的流程图库
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Redux Toolkit](https://redux-toolkit.js.org/) - 状态管理
- [Vite](https://vitejs.dev/) - 快速的构建工具

---

## 📮 联系方式

- 项目主页: [https://github.com/yourusername/nanoai-canvas](https://github.com/yourusername/nanoai-canvas)
- 问题反馈: [Issues](https://github.com/yourusername/nanoai-canvas/issues)
- 邮箱: your-email@example.com

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！**

Made with ❤️ by NanoAiCanvas Team

</div>
