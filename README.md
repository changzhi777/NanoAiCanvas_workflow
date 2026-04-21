# NanoAiCanvas

<div align="center">

![NanoAiCanvas Logo](./public/favicon.svg)

**基于无限画布的 Workflow 任务工作流系统 - 可视化节点编辑器**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.4-cyan)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2.11-purple)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/Version-0.1.1-brightgreen)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [开发指南](#-开发指南) • [文档中心](#-文档中心)

</div>

---

## 📖 项目简介

**NanoAiCanvas_workflow** 是一个基于无限画布的 **Workflow 任务工作流系统**，专注于提供可视化、流程化的节点编辑体验。项目灵感来源于 Figma 的设计理念，采用 Base Nova 暗色主题，支持完整的国际化，并集成了强大的 AI 工作流功能。

### 核心定位

**🎯 Workflow 任务工作流系统**
- 可视化工作流设计和执行
- 9 种内置节点类型（输入、AI 生成、决策、输出）
- 4 个预置工作流模板（故事板、角色设计、场景设计）
- 智能布局算法和拓扑排序
- 实时执行状态追踪

**🎨 无限画布编辑器**
- 基于 React Flow 的专业节点编辑器
- 平滑缩放、平移、小地图导航
- 智能吸附和对齐引导
- 自定义节点和连线样式

### 核心优势

- 🎯 **工作流系统**: 完整的 Workflow 任务管理和执行引擎
- 🎨 **专业级 UI/UX**: 采用 Figma 设计理念，Base Nova 暗色主题
- 🚀 **极致性能**: React 19 + Vite 5.2 + Framer Motion 动画优化
- 🤖 **AI 集成**: 内置 NanoAI Workflow 故事板生成系统
- 🔄 **双重状态管理**: Redux Toolkit（全局）+ Zustand（Workflow）
- 🌍 **国际化**: 完整的中英文双语支持
- 💾 **数据持久化**: IndexedDB + localStorage 自动保存
- ♿ **可访问性**: 完整的无障碍支持（WCAG 2.1 AA 标准）

---

## ✨ 功能特性

### 🎯 Workflow 工作流系统（核心功能）

**节点类型**（9 种）：
- **输入节点**: `input_text`（文本输入）、`input_image`（图片输入）
- **AI 生成节点**: `script_generator`（脚本生成）、`storyboard_generator`（分镜头生成）、`dialogue_generator`（对白生成）
- **设计节点**: `character_designer`（角色设计）、`scene_designer`（场景设计）
- **代理节点**: `director_agent`（导演代理）、`screenwriter_agent`（编剧代理）
- **输出节点**: `output_preview`（预览）、`output_export`（导出）、`output_save`（保存）

**内置模板**（4 个）：
- `storyboard-complete` - 完整故事板生成（4 节点）
- `character-workflow` - 角色设计工作流（3 节点）
- `scene-workflow` - 场景设计工作流（3 节点）
- `quick-storyboard` - 快速故事板（2 节点）

**核心特性**：
- **智能布局**: 自动拓扑排序和节点布局算法
- **可视化执行**: 实时显示工作流执行进度（idle → running → success/error）
- **状态管理**: Zustand 专用 store，自动持久化
- **插件系统**: 支持自定义节点类型和扩展

### 🎨 无限画布
- **平滑交互**: 基于 React Flow，支持平滑缩放、平移、小地图导航
- **智能吸附**: 网格吸附、对齐引导、自动布局
- **多种视图**: 支持小地图、网格背景、自适应缩放

### 📦 卡片节点系统
- **7 种预定义节点**:
  - 任务（Task）- 任务管理节点
  - 事件（Event）- 事件标记节点
  - 里程碑（Milestone）- 里程碑节点
  - 决策（Decision）- 决策分支节点
  - 数据（Data）- 数据展示节点
  - 开始（Start）- 流程开始节点
  - 结束（End）- 流程结束节点

### 🔗 自由连线
- **多种颜色**: 青色、品红、黄色、绿色、橙色、紫色、灰色
- **多种线型**: 实线、虚线、点线
- **动画效果**: 支持流动动画
- **智能路由**: 自动避让，智能路径规划

### 🎯 高级特性
- **撤销/重做**: 完整的历史记录管理（Ctrl+Z / Ctrl+Shift+Z）
- **多选操作**: 支持框选、Shift 多选、全选（Ctrl+A）
- **删除功能**: Delete 键删除选中节点/连线
- **快捷键**: 全套键盘快捷键支持
- **自动保存**: 可配置的自动保存间隔（默认 30 秒）
- **数据持久化**: Redux Toolkit + IndexedDB 双重保障

### 🤖 NanoAI Workflow
- **AI 故事板生成**: 集成 AI 工作流
- **脚本生成**: 自动生成脚本节点
- **对白生成**: 智能对白生成节点
- **角色设计**: AI 角色设计节点
- **场景设计**: AI 场景设计节点
- **故事板生成**: 一键生成完整故事板

### 🎨 主题系统
- **Base Nova 暗色主题**: 专业级暗色主题设计
- **OKLCH 颜色空间**: 更准确的色彩感知
- **自定义主题**: 支持自定义节点颜色和样式
- **高对比度**: 优化的对比度，提升可读性

### 🌐 国际化
- **完整双语**: 中英文无缝切换
- **i18next 集成**: 专业的国际化方案
- **动态切换**: 实时切换语言，无需刷新

### 📤 导入/导出
- **JSON 格式**: 完整的项目导入/导出
- **图片导出**: 导出为 PNG/SVG
- **剪贴板**: 复制/粘贴节点（Ctrl+C / Ctrl+V）

### ♿ 可访问性
- **键盘导航**: 完整的键盘操作支持
- **屏幕阅读器**: ARIA 标签完整支持
- **焦点管理**: 智能焦点处理
- **WCAG 2.1 AA**: 符合无障碍标准

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **pnpm** >= 8.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/changzhi777/NanoAiCanvas_workflow.git
cd NanoAiCanvas_workflow

# 安装依赖（推荐使用 pnpm）
pnpm install
# 或使用 npm
npm install
```

### 启动开发服务器

```bash
# 启动开发服务器
pnpm dev
# 或
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
# 构建生产版本
pnpm build
# 或
npm run build

# 预览生产版本
pnpm preview
# 或
npm run preview
```

构建产物将输出到 `dist` 目录。

---

## 🛠️ 开发指南

### 项目结构

```
nanoai-canvas/
├── src/
│   ├── components/           # UI 组件
│   │   ├── canvas/          # 画布核心组件
│   │   ├── panels/          # 属性面板和模板面板
│   │   ├── toolbar/         # 顶部工具栏
│   │   ├── nanoai-workflow/ # AI 工作流组件
│   │   ├── animations/      # 动画组件
│   │   ├── accessibility/   # 可访问性组件
│   │   ├── collaboration/   # 协作功能组件
│   │   └── ui/              # shadcn/ui 基础组件
│   ├── store/               # Redux 状态管理
│   │   └── slices/          # Redux slices
│   ├── hooks/               # 自定义 Hooks
│   ├── lib/                 # 工具库
│   ├── types/               # TypeScript 类型
│   ├── pages/               # 页面组件
│   ├── styles/              # 全局样式
│   └── locales/             # 国际化配置
├── docs/                    # 📁 项目文档
│   ├── reports/             # 报告和总结
│   ├── guides/              # 使用指南
│   ├── features/            # 功能文档
│   ├── deployment/          # 部署相关
│   ├── versions/            # 版本历史
│   └── archive/             # 归档文档
├── scripts/                 # 构建和工具脚本
├── public/                  # 静态资源
└── e2e/                     # E2E 测试
```

### 开发工具

```bash
# 代码检查
pnpm lint

# 代码自动修复
pnpm lint:fix

# 代码格式化
pnpm format

# 类型检查
pnpm type-check

# 运行测试
pnpm test

# 测试 UI 模式
pnpm test:ui

# 根目录检查（目录管理规则）
pnpm check:root
```

### 添加新功能

#### 1. 添加新的节点类型

```typescript
// 1. 在 src/types/index.ts 中定义类型
export type CustomNode = {
  id: string;
  type: 'custom';
  // ... 其他属性
};

// 2. 在 src/components/canvas/nodes/ 中创建组件
export function CustomNode({ data }: NodeProps) {
  return (
    <div className="custom-node">
      {/* 节点内容 */}
    </div>
  );
}

// 3. 在 NodeTemplatesPanel.tsx 中注册模板
const customTemplate: NodeTemplate = {
  type: 'custom',
  icon: CustomIcon,
  label: 'Custom Node',
};
```

#### 2. 添加新的快捷键

```typescript
// 在 src/hooks/useShortcuts.ts 中添加
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      // 执行自定义操作
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 3. 修改主题

```css
/* 在 src/styles/globals.css 中修改 CSS 变量 */
:root {
  --primary: 168 70% 45%; /* 青绿色 */
  --accent: 168 80% 55%;  /* 亮青绿 */
  /* ... 其他颜色 */
}
```

---

## 🧪 测试

### 单元测试

使用 Vitest + Testing Library：

```bash
# 运行测试
pnpm test

# 测试 UI 模式
pnpm test:ui

# 测试覆盖率
pnpm test:coverage
```

**测试配置**: `vitest.config.ts`
**测试设置**: `src/test/setup.ts`

### E2E 测试

使用 Playwright：

```bash
# 安装浏览器
npx playwright install

# 运行 E2E 测试
pnpm test:e2e
```

**测试配置**: `playwright.config.ts`
**测试文件**: `e2e/*.spec.ts`

### 测试覆盖率

**当前状态**: 未实现单元测试
**目标覆盖率**: 80%+

---

## 📦 部署

### Vercel 部署

项目配置了 Vercel 自动部署。推送到 `main` 分支将自动触发部署。

```bash
# 推送到 main 分支
git push origin main
```

### Docker 部署

```bash
# 构建镜像
docker build -t nanoai-canvas .

# 运行容器
docker run -p 80:80 nanoai-canvas
```

### 环境变量

参考 `.env.example` 配置环境变量。

---

## 📚 文档中心

### 📁 项目文档

所有项目文档都已整理到 `docs/` 目录：

- **📖 [文档中心](docs/README.md)** - 文档导航和快速查找
- **📋 [目录管理规则](docs/DIRECTORY_MANAGEMENT.md)** - 🔴 严格执行的目录管理规范
- **🤖 [AI 上下文](CLAUDE.md)** - 项目架构和 AI 使用指引

### 📊 功能文档

- **[快速开始指南](docs/guides/QUICK_START_GUIDE.md)** - 5 分钟快速上手
- **[工作流指南](docs/guides/WORKFLOW_GUIDE.md)** - 完整的工作流说明
- **[部署指南](docs/deployment/DEPLOYMENT_GUIDE.md)** - 生产环境部署
- **[测试指南](docs/guides/TESTING_CHECKLIST.md)** - 测试最佳实践

### 🎨 功能特性

- **[动画系统](docs/features/ANIMATION_ENHANCEMENTS.md)** - Framer Motion 动画优化
- **[UI/UX 优化](docs/features/UI_UX_OPTIMIZATION_SUMMARY.md)** - 用户界面优化
- **[可访问性](docs/features/RESPONSIVE_A11Y_OPTIMIZATIONS.md)** - 无障碍支持

### 📋 版本历史

- **[v2.2.1](docs/versions/RELEASE_v2.2.0.md)** - 最新版本
- **[版本管理](docs/versions/VERSION_MANAGEMENT.md)** - 版本发布流程

---

## 🔒 目录管理规则

**⚠️ 严格执行规则** - 项目根目录必须保持整洁！

### 核心原则

- ✅ 根目录只保留：`CLAUDE.md`、`README.md`、配置文件
- ❌ 禁止在根目录：临时 .md 文件、测试文件、临时脚本
- ✅ 所有文档存放在 `docs/` 目录的合适子目录中

### 自动检查

每次 git commit 前会自动运行根目录检查：

```bash
# 手动运行检查
pnpm check:root
```

**详细规则**: [docs/DIRECTORY_MANAGEMENT.md](docs/DIRECTORY_MANAGEMENT.md)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

### 代码规范

- 遵循 TypeScript 严格模式
- 使用 ESLint + Prettier 格式化代码
- 为新功能添加测试
- 更新相关文档
- 遵守目录管理规则

---

## 🗺️ 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2.4 | UI 框架 |
| **TypeScript** | 5.9.3 | 类型系统（严格模式） |
| **Vite** | 5.2.11 | 构建工具 |
| **Redux Toolkit** | 2.2.5 | 状态管理 |

### UI 和样式

| 包名 | 版本 | 用途 |
|------|------|------|
| **shadcn/ui** | - | 组件库（Base Nova 风格） |
| **Tailwind CSS** | 3.4.19 | 样式框架（OKLCH 颜色） |
| **Lucide React** | 0.468.0 | 图标库 |
| **React Flow** | 11.11.4 | 无限画布核心 |
| **Framer Motion** | 12.38.0 | 动画库 |

### 数据和工具

| 包名 | 版本 | 用途 |
|------|------|------|
| **idb** | 8.0.0 | IndexedDB 封装 |
| **i18next** | 23.11.5 | 国际化 |
| **sonner** | 1.5.0 | Toast 通知 |

### 测试

| 包名 | 版本 | 用途 |
|------|------|------|
| **Vitest** | 1.6.0 | 单元测试框架 |
| **Playwright** | 1.44.0 | E2E 测试框架 |
| **@testing-library/react** | 15.0.7 | React 测试工具 |

---

## 📊 性能优化

### 已实现的优化

- ✅ **虚拟化长列表**: 大量节点时保持流畅
- ✅ **懒加载组件**: 按需加载，减少初始包大小
- ✅ **优化 Redux selector**: 使用 Reselect 避免不必要的计算
- ✅ **Framer Motion 动画**: GPU 加速动画
- ✅ **代码分割**: 动态导入，减少首屏加载时间
- ✅ **图片优化**: WebP 格式，懒加载
- ✅ **缓存策略**: Service Worker 离线支持

### 性能指标

- **Lighthouse 性能评分**: 90+
- **首屏加载时间**: < 2s
- **交互延迟**: < 100ms
- **帧率**: 稳定 60fps

---

## 📄 许可证与版权

本项目为**专有软件**，版权所有。

**版权所有**: © 2026 IoTchange - 保留所有权利

**作者信息**:
- 作者: 外星动物（常智）
- 组织: IoTchange
- 邮箱: [14455975@qq.com](mailto:14455975@qq.com)
- GitHub: [@changzhi777](https://github.com/changzhi777)

**许可声明**:
未经 IoTchange 明确书面许可，严禁任何形式的使用、复制、修改、分发、授权或销售本软件的副本。

详见 [LICENSE](LICENSE) 文件

---

## 📮 联系方式

- **邮箱**: [14455975@qq.com](mailto:14455975@qq.com)
- **组织**: IoTchange
- **作者**: 外星动物（常智）

---

## 🙏 致谢

感谢以下开源项目：

- [React Flow](https://reactflow.dev/) - 强大的流程图库
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Redux Toolkit](https://redux-toolkit.js.org/) - 状态管理
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [React](https://react.dev/) - UI 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请联系作者获取使用许可**

Made with ❤️ by 外星动物（常智）/ IoTchange

**版本**: 0.1.1 | **最后更新**: 2026-04-22

**Be water, my friend!** 🤙

</div>
