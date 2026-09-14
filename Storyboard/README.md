# Storyboard 设计参考文档

> **NanoAI 故事板功能的完整设计参考和代码文档**

---

## 📁 目录结构

```
Storyboard/
├── README.md                           # 本文档 - Storyboard目录说明
├── 故事板设计参考.md                    # 主文档 - 系统概述、用户流程、样式参数等
├── frontend/                           # 前端代码
│   ├── components/                     # UI组件（8个）
│   │   ├── StoryboardWizard.tsx       # 故事板向导主组件
│   │   ├── StoryboardPanel.tsx        # 场景卡片组件
│   │   ├── StoryboardAssetCard.tsx    # 资产卡片组件
│   │   ├── StoryboardAssetPreview.tsx # 资产预览组件
│   │   ├── StoryboardChartTab.tsx     # 故事板图表标签页
│   │   ├── StoryboardPreviewAnimation.tsx # 预览动画组件
│   │   ├── StoryboardTaskAnimation.tsx     # 任务动画组件
│   │   └── StoryboardTaskQueue.tsx         # 任务队列组件
│   ├── stores/                         # 状态管理（4个Store）
│   │   ├── storyboardStore.ts         # 故事板状态
│   │   ├── storyboardTaskStore.ts     # 任务队列状态
│   │   ├── storyboardVoiceStore.ts    # 语音合成状态
│   │   └── storyboardWizardStore.ts   # 向导状态
│   ├── api/                            # API客户端（1个）
│   │   └── storyboard.ts              # 故事板API客户端（15个端点）
│   └── constants/                      # 常量定义（1个）
│       └── storyboard-categories.ts   # 故事板分类常量
├── backend/                            # 后端代码
│   ├── routers/                        # API路由（1个）
│   │   └── storyboard.py              # 故事板API路由（15个端点）
│   ├── services/                       # 业务逻辑（2个）
│   │   ├── storyboard.py              # 故事板业务逻辑
│   │   └── storyboard_pipeline.py     # Pipeline工作流
│   ├── schemas/                        # 数据模型（1个）
│   │   └── storyboard.py              # 故事板数据模型
│   └── workers/                        # 后台任务（1个）
│       └── storyboard_worker.py       # 故事板后台任务处理
├── pipeline/                           # CLI Pipeline（1个）
│   └── storyboard.ts                  # 4步工作流Pipeline实现
└── assets/                             # 样式资源
    ├── screenshots/                    # 界面截图（待添加）
    └── styles/                         # 样式参数文档
        └── storyboard-ui-style-reference.md # UI样式参数参考
```

---

## 📚 文档导航

> 💡 **首次使用？** 推荐阅读：[完整使用指南.md](完整使用指南.md) - 一站式导航文档

### 核心文档（6个）

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| **[完整使用指南.md](完整使用指南.md)** | 🧭 一站式导航 - 按角色/需求快速查找 | 5分钟 |
| **[快速开始指南.md](快速开始指南.md)** | 🚀 5分钟快速上手 - 新手必读 | 10分钟 |
| **[故事板设计参考.md](故事板设计参考.md)** | 📖 完整系统设计 - 架构和流程 | 30分钟 |
| **[代码快速参考.md](代码快速参考.md)** | 💻 代码说明和示例 - 开发者必读 | 20分钟 |
| **[UI样式参考.md](assets/styles/storyboard-ui-style-reference.md)** | 🎨 样式参数完整参考 | 5分钟 |
| **README.md** | 📁 目录结构说明 | 3分钟 |

### 按角色阅读

**👨‍💼 产品经理/设计师**：
1. [快速开始指南.md](快速开始指南.md) - 5分钟上手
2. [故事板设计参考.md - 第2章](故事板设计参考.md#2-用户流程) - 用户流程
3. [UI样式参考.md](assets/styles/storyboard-ui-style-reference.md) - 设计规范

**💻 前端开发者**：
1. [故事板设计参考.md - 第1章](故事板设计参考.md#1-系统概述) - 系统架构
2. [代码快速参考.md - 前端部分](代码快速参考.md#-前端组件代码说明) - 组件说明
3. [frontend/components/](frontend/components/) - 组件代码

**⚙️ 后端开发者**：
1. [故事板设计参考.md - 第4章](故事板设计参考.md#4-数据结构) - 数据结构
2. [代码快速参考.md - 后端部分](代码快速参考.md#-后端代码说明) - API说明
3. [backend/routers/storyboard.py](backend/routers/storyboard.py) - API路由

### 样式参考

**[UI样式参数参考.md](assets/styles/storyboard-ui-style-reference.md)** - 完整的UI样式参数文档，包含：

- 颜色系统（紫粉渐变、状态颜色、背景颜色）
- 字体系统（字体大小、字体粗细）
- 间距系统（内边距、外边距、圆角）
- 尺寸系统（按钮尺寸、图片尺寸、对话框尺寸）
- 动画系统（旋转动画、渐变动画、过渡效果）
- 响应式断点（网格列数）
- 组件特定样式（每个组件的详细样式类名）

---

## 🎯 使用指南

### 快速上手

1. **了解系统架构**
   - 阅读 [故事板设计参考.md](故事板设计参考.md) 的第1章"系统概述"

2. **理解用户流程**
   - 阅读 [故事板设计参考.md](故事板设计参考.md) 的第2章"用户流程"
   - 了解4步工作流：脚本生成→分镜头创建→图片生成→角色设计

3. **查看UI样式**
   - 阅读 [UI样式参数参考.md](assets/styles/storyboard-ui-style-reference.md)
   - 了解颜色、字体、间距等样式参数

4. **参考代码实现**
   - 查看 `frontend/components/` 了解UI组件实现
   - 查看 `backend/` 了解后端API实现
   - 查看 `pipeline/storyboard.ts` 了解CLI Pipeline

### 开发场景

#### 场景1：新增UI组件

1. 参考 `frontend/components/` 中现有组件的代码结构
2. 使用 [UI样式参数参考.md](assets/styles/storyboard-ui-style-reference.md) 中的样式类名
3. 遵循紫粉渐变主题（`from-purple-400 to-pink-400`）

#### 场景2：扩展API端点

1. 查看 `backend/routers/storyboard.py` 了解现有端点
2. 查看 `backend/schemas/storyboard.py` 了解数据模型
3. 在 `backend/services/storyboard.py` 中实现业务逻辑

#### 场景3：自定义工作流

1. 查看 `pipeline/storyboard.ts` 了解4步工作流实现
2. 参考 `backend/services/storyboard_pipeline.py` 了解Pipeline逻辑
3. 使用断点续传、自动重试、错误分析等特性

#### 场景4：样式调整

1. 查看 [UI样式参数参考.md](assets/styles/storyboard-ui-style-reference.md)
2. 查找需要修改的样式类名
3. 在对应组件中替换Tailwind类名

---

## 🔑 核心概念

### 4步工作流

故事板功能采用4步骤向导式工作流：

```
步骤1：脚本生成（0-30%）
  ├─ 输入：文案 + 风格
  ├─ 处理：GLM-5生成脚本
  └─ 输出：场景列表 + 角色列表

步骤2：分镜头创建（30-50%）
  ├─ 输入：脚本数据 + 风格
  ├─ 处理：NanoBanana Pro生成图片
  └─ 输出：场景图片URL数组

步骤3：图片生成/对白编辑（50-80%）
  ├─ 输入：对白文本
  ├─ 处理：GLM TTS生成音频
  └─ 输出：音频URL数组

步骤4：角色设计（80-100%）
  ├─ 输入：角色信息
  ├─ 处理：生成角色设计提示词 + 图片生成
  └─ 输出：角色设计图URL数组
```

### 状态管理

使用Zustand进行状态管理，包含4个Store：

1. **storyboardStore** - 故事板资产状态
2. **storyboardTaskStore** - 任务队列状态
3. **storyboardVoiceStore** - 语音合成状态
4. **storyboardWizardStore** - 向导状态（4步工作流）

### 样式主题

**主色调**：紫粉渐变
- 文字渐变：`from-purple-400 to-pink-400`
- 按钮渐变：`from-purple-500 to-pink-500`
- 进度条渐变：`from-purple-500 to-pink-500`

**状态颜色**：
- 成功：`green-400/500`
- 错误：`red-400/500`
- 进行中：`purple-400/500`
- 等待中：`slate-500`

**背景**：
- 深色背景：`bg-slate-900`
- 半透明：`bg-black/20`
- 卡片：`bg-white/5`

---

## 🛠️ 技术栈

### 前端

- **框架**：Next.js 16 + React 19
- **状态管理**：Zustand 5
- **样式**：Tailwind CSS 4 + shadcn/ui
- **动画**：CSS动画 + React Hooks

### 后端

- **框架**：FastAPI + Python 3.11
- **数据库**：SQLite + Redis
- **任务队列**：Redis + RQ
- **实时通信**：MQTT + WebSocket

### CLI

- **运行时**：Node.js + TypeScript
- **队列**：Redis + BullMQ
- **通信**：MQTT + Redis Pub/Sub

### AI服务

- **脚本生成**：GLM-5（智谱AI）
- **图像生成**：NanoBanana Pro（速创）
- **语音合成**：GLM TTS（智谱AI）

---

## 📊 文件统计

| 类别 | 文件数 | 总行数（约） |
|------|--------|-------------|
| 前端组件 | 8 | 2,200 |
| 状态管理 | 4 | 1,300 |
| API客户端 | 1 | 420 |
| 后端路由 | 1 | 850 |
| 后端服务 | 2 | 1,620 |
| 数据模型 | 1 | 400 |
| 后台任务 | 1 | 200 |
| CLI Pipeline | 1 | 260 |
| **总计** | **19** | **7,250** |

---

## 📝 维护说明

### 文档更新

- **主文档**：在添加新功能或修改流程时更新
- **样式参考**：在修改UI样式时更新
- **代码注释**：在代码文件中添加说明注释

### 代码规范

- **前端**：遵循React Hooks规范，使用TypeScript类型
- **后端**：遵循FastAPI规范，使用Pydantic数据验证
- **样式**：使用Tailwind CSS，避免内联样式

### 版本控制

- 文档版本号与项目版本号保持一致
- 重大变更时更新文档版本号
- 在文档头部标注最后更新时间

---

## 🔗 相关链接

- **项目根目录**：[CLAUDE.md](../CLAUDE.md)
- **前端应用**：[根目录前端应用](../CLAUDE.md#根目录前端应用)
- **后端API**：[nano-api/CLAUDE.md](../nano-api/CLAUDE.md)
- **CLI工具**：[cli-agent/CLAUDE.md](../cli-agent/CLAUDE.md)

---

**文档维护**：BB小子 🤙
**创建时间**：2026-04-20 21:36
**最后更新**：2026-04-20 21:36
**版本**：V1.0
