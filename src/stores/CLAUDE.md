[根目录](../../../CLAUDE.md) > [src](../) > **stores**

---

# Stores 模块 - Zustand 状态管理

> 24 个 Zustand Store + 24 测试文件，覆盖 Workflow、图片生成、故事板、TVC、应用管理等全部业务域

**最后更新**: 2026-08-28
**维护者**: NanoAiCanvas Team

---

## 模块职责

Stores 模块使用 Zustand 管理前端全部业务状态，按功能域划分为 4 组：

| 分组 | Store 数量 | 测试覆盖 | 职责 |
|------|-----------|---------|------|
| **核心 (Core)** | 4 | 4/4 | Workflow 引擎、插件系统、协作、通知 |
| **业务 (Business)** | 6 | 6/6 | 聊天、通知中心、提示词模板、远程配置、应用可见性、应用配置 |
| **图片生成 (Image Gen)** | 10 | 10/10 | 架构图、香蕉兄弟、角色设计、图片聊天、电商产品、知识卡片、故事板系列、任务队列 |
| **图片辅助 (Image Support)** | 2 | 2/2 | 实时语音、故事板语音 |
| **TVC** | 1 | 1/1 | TVC 广告视频制作状态 |

**总覆盖率**：24/24 = 100%（2026-08-28 实测：全部 Store 均有对应 .test.ts）

---

## Store 全览

### 核心组 (Core)

| # | Store | 文件 | 行数 | 测试 | 描述 |
|---|-------|------|------|------|------|
| 1 | `useNanoaiWorkflowStore` | `nanoaiWorkflowStore.ts` | 1459 | `nanoaiWorkflowStore.test.ts` | Workflow 核心状态：节点/连线/模板/执行引擎/拓扑排序 |
| 2 | `usePluginStore` | `pluginStore.ts` | 164 | `pluginStore.test.ts` | 插件注册/启用/禁用管理 |
| 3 | `useCollaborationStore` | `collaborationStore.ts` | 219 | `collaborationStore.test.ts` | 多人协作：光标位置、在线用户、实时同步 |
| 4 | `useToastStore` | `toastStore.ts` | 32 | `toastStore.test.ts` | 前端 Toast 通知 |

### 业务组 (Business)

| # | Store | 文件 | 行数 | 测试 | 描述 |
|---|-------|------|------|------|------|
| 5 | `useChatStore` | `chatStore.ts` | 121 | `chatStore.test.ts` | 即时聊天：会话列表、消息收发 |
| 6 | `useNotificationStore` | `notificationStore.ts` | 123 | `notificationStore.test.ts` | 通知中心：系统/积分/团队通知 |
| 7 | `usePromptTemplateStore` | `promptTemplateStore.ts` | 154 | `promptTemplateStore.test.ts` | 提示词模板：分类 CRUD、收藏 |
| 8 | `useSyncStore` / `useAuthStore` | `remoteStore.ts` | 149 | `remoteStore.test.ts` | 远程配置：数据同步状态、用户认证、用户设置 |
| 9 | `useAppVisibilityStore` | `appVisibilityStore.ts` | 353 | `appVisibilityStore.test.ts` | 应用可见性控制：active/disabled/hidden 三态 |
| 10 | `APPS_LIST` (常量) | `appsConfigStore.ts` | 138 | `appsConfigStore.test.ts` | 应用配置管理：类型定义、应用列表常量 |

### 图片生成组 (Image Generation)

| # | Store | 文件 | 行数 | 测试 | 描述 |
|---|-------|------|------|------|------|
| 11 | `useArchitectureStore` | `nanoImageArchitectureStore.ts` | 41 | `nanoImageArchitectureStore.test.ts` | 架构图生成：参考图 + 提示词 |
| 12 | `useBananaBrotherStore` | `nanoImageBananaBrotherStore.ts` | 134 | `nanoImageBananaBrotherStore.test.ts` | 香蕉兄弟：对话式图片生成 |
| 13 | `useCharacterDesignStore` | `nanoImageCharacterDesignStore.ts` | 41 | `nanoImageCharacterDesignStore.test.ts` | 角色设计：参考图 + 风格选择 |
| 14 | `useNanoImageChatStore` | `nanoImageChatStore.ts` | 290 | `nanoImageChatStore.test.ts` | 图片聊天：多轮对话 + 生成模式 |
| 15 | `useEcommerceProductStore` | `nanoImageEcommerceProductStore.ts` | 125 | `nanoImageEcommerceProductStore.test.ts` | 电商产品图：上传→分析→生成 |
| 16 | `useKnowledgeCardStore` | `nanoImageKnowledgeCardStore.ts` | 37 | `nanoImageKnowledgeCardStore.test.ts` | 知识卡片：分类 + 卡片样式 |
| 17 | `useStoryboardStore` | `nanoImageStoryboardStore.ts` | 349 | `nanoImageStoryboardStore.test.ts` | 故事板核心：角色/场景/对白/分镜 |
| 18 | `useStoryboardTaskStore` | `nanoImageStoryboardTaskStore.ts` | 375 | `nanoImageStoryboardTaskStore.test.ts` | 故事板任务队列：子任务状态管理 |
| 19 | `useStoryboardWizardStore` | `nanoImageStoryboardWizardStore.ts` | 431 | `nanoImageStoryboardWizardStore.test.ts` | 故事板向导：四步流程（剧本→角色→场景→生成） |
| 20 | `useTaskQueueStore` | `nanoImageTaskQueueStore.ts` | 258 | `nanoImageTaskQueueStore.test.ts` | 图片任务队列：单任务/批量任务管理 |
| 21 | `useAgentStore` | `agentStore.ts` | - | `agentStore.test.ts` | Agent Team8 前端状态：会话/任务/Skills |

### 图片辅助组 (Image Support)

| # | Store | 文件 | 行数 | 测试 | 描述 |
|---|-------|------|------|------|------|
| 22 | `useRealtimeVoiceStore` | `nanoImageRealtimeVoiceStore.ts` | 117 | `nanoImageRealtimeVoiceStore.test.ts` | 实时语音：录音状态、语音消息 |
| 23 | `useStoryboardVoiceStore` | `nanoImageStoryboardVoiceStore.ts` | 341 | `nanoImageStoryboardVoiceStore.test.ts` | 故事板语音：角色配音、TTS 状态 |

### TVC 组

| # | Store | 文件 | 行数 | 测试 | 描述 |
|---|-------|------|------|------|------|
| 24 | `useTvcStore` | `tvcStore.ts` | - | `tvcStore.test.ts` | TVC 广告视频制作：任务状态管理 |

---

## 关键接口

### nanoaiWorkflowStore（主 Store）

**文件**: `src/stores/nanoaiWorkflowStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useNanoaiWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // 状态和方法...
    }),
    {
      name: 'nanoai-workflow-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        templates: state.templates,
        versions: state.versions
      })
    }
  )
)
```

#### State

```typescript
interface WorkflowState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  templates: WorkflowTemplate[]
  versions: WorkflowVersion[]
  selectedNodeId: string | null
  isExecuting: boolean
  executionLog: string[]
}
```

#### Actions

| Action | 描述 |
|--------|------|
| `addNode(node)` | 添加节点 |
| `removeNode(nodeId)` | 删除节点 |
| `updateNode(nodeId, data)` | 更新节点数据 |
| `updateNodePosition(nodeId, position)` | 更新节点位置 |
| `addEdge(edge)` | 添加连线 |
| `removeEdge(edgeId)` | 删除连线 |
| `saveTemplate(name, description, category)` | 保存模板 |
| `loadTemplate(templateId)` | 加载模板 |
| `executeNode(nodeId)` | 执行单个节点 |
| `executeWorkflow()` | 执行整个工作流 |
| `stopExecution()` | 停止执行 |
| `exportWorkflow()` | 导出工作流 JSON |
| `importWorkflow(json)` | 导入工作流 |
| `clearWorkflow()` | 清空工作流 |

### 使用方式

```tsx
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore'

function WorkflowComponent() {
  const nodes = useNanoaiWorkflowStore(state => state.nodes)
  const executeWorkflow = useNanoaiWorkflowStore(state => state.executeWorkflow)

  return <div>{nodes.length} 节点</div>
}
```

---

## appVisibilityStore

**文件**: `src/stores/appVisibilityStore.ts`

管理应用模块的三态可见性：

```typescript
type VisibilityState = 'active' | 'disabled' | 'hidden'

interface VisibilityItemMeta {
  nodeId: WorkflowNodeType
  moduleName: string
  defaultState: VisibilityState
}
```

- `active` — 正常展示和可用
- `disabled` — 展示但禁用（灰色）
- `hidden` — 完全隐藏

---

## appsConfigStore

**文件**: `src/stores/appsConfigStore.ts`

定义应用类型和配置常量：

```typescript
type AppType = 'storyboard' | 'image' | 'voice' | 'dialogue' | 'text' | 'realtime' | 'prompt_optimize'

interface AppConfig {
  type: AppType
  name: string
  // ...
}

export const APPS_LIST: AppConfig[]
```

---

## 故事板 Store 系列

四个 Store 协作构成故事板系统：

```
useStoryboardWizardStore (四步向导)
  → useStoryboardStore (角色/场景/对白数据)
    → useStoryboardTaskStore (任务队列+子任务)
      → useStoryboardVoiceStore (角色配音)
```

### useStoryboardWizardStore

四步流程状态管理：
1. **Step 1** — 剧本输入/生成
2. **Step 2** — 角色设定
3. **Step 3** — 场景分镜
4. **Step 4** — 批量生成

### useStoryboardTaskStore

```typescript
interface StoryboardTaskState {
  tasks: StoryboardTask[]
  // 单任务状态: pending | running | paused | completed | failed | cancelled
}
```

---

## 图片任务队列

### useTaskQueueStore

**文件**: `src/stores/nanoImageTaskQueueStore.ts`

```typescript
type SingleTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

interface SingleTask {
  id: string
  status: SingleTaskStatus
  params: FullGenerationParams
  result?: string  // 生成的图片 URL
}

interface BatchTask {
  id: string
  status: BatchTaskStatus
  items: BatchTaskItem[]
}
```

支持单任务和批量任务两种模式，包含暂停/恢复/取消控制。

---

## agentStore（Agent Team8 前端状态）

**文件**: `src/stores/agentStore.ts`

配合 `src/lib/api/agent-api.ts` 管理 Agent Team8 V0.3.0 前端状态：会话、任务、Skills、记忆。

---

## remoteStore

**文件**: `src/stores/remoteStore.ts`

一个文件导出三个 Store：
- `useSyncStore` — 离线数据同步状态（基于 SyncEngine）
- `useAuthStore` — 用户认证（登录/注册/Token 管理）
- `useUserSettingsStore` — 用户偏好设置

---

## 数据模型

### WorkflowNodeData

```typescript
export interface WorkflowNodeData {
  label: string
  params: Record<string, any>
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: any
  error?: string
}

export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  DISABLED = 'disabled',
}
```

### WorkflowTemplate

```typescript
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  thumbnail?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  category: 'script' | 'character' | 'scene' | 'custom' | 'storyboard' | 'story' | 'image'
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

---

## WorkflowNodeType（49 节点类型）

```typescript
export enum WorkflowNodeType {
  // 输入节点
  INPUT_TEXT = 'input_text',
  INPUT_IMAGE = 'input_image',

  // AI 生成节点
  SCRIPT_GENERATOR = 'script_generator',
  STORYBOARD_GENERATOR = 'storyboard_generator',
  DIALOGUE_GENERATOR = 'dialogue_generator',
  CHARACTER_DESIGNER = 'character_designer',
  SCENE_DESIGNER = 'scene_designer',

  // 决策/逻辑处理节点
  DIRECTOR_AGENT = 'director_agent',
  SCREENWRITER_AGENT = 'screenwriter_agent',

  // 处理节点
  TEXT_PROCESSOR = 'text_processor',
  IMAGE_PROCESSOR = 'image_processor',
  DATA_TRANSFORMER = 'data_transformer',

  // 里程碑节点
  MILESTONE = 'milestone',

  // 输出节点
  OUTPUT_PREVIEW = 'output_preview',
  OUTPUT_EXPORT = 'output_export',
  OUTPUT_SAVE = 'output_save',

  // MiniMax 节点
  MINIMAX_TEXT = 'minimax_text',
  MINIMAX_SPEECH = 'minimax_speech',
  MINIMAX_VIDEO = 'minimax_video',
  MINIMAX_MUSIC = 'minimax_music',
  MINIMAX_IMAGE = 'minimax_image',
  MINIMAX_CODING = 'minimax_coding',

  // 图片生成节点
  NANO_BANANA_2 = 'nano_banana_2',
  NANO_BANANA_PRO = 'nano_banana_pro',
  GPT_IMAGE_2 = 'gpt_image_2',

  // 即梦（字节AI）节点
  JIMENG_IMAGE = 'jimeng_image',
  JIMENG_VIDEO = 'jimeng_video',

  // 智谱 GLM 节点
  GLM_TEXT = 'glm_text',
  GLM_VIDEO = 'glm_video',
  GLM_TTS = 'glm_tts',
  GLM_MULTIMODAL = 'glm_multimodal',

  // 通义千问（阿里）节点
  QWEN_TEXT = 'qwen_text',
  QWEN_CODING = 'qwen_coding',

  // Kimi（Moonshot）节点
  KIMI_TEXT = 'kimi_text',

  // 预览节点
  IMAGE_PREVIEW = 'image_preview',
  VIDEO_PREVIEW = 'video_preview',
  AUDIO_PREVIEW = 'audio_preview',
  TEXT_PREVIEW = 'text_preview',
}
```

---

## 关键依赖与配置

### 依赖项

- `zustand` — 状态管理
- `zustand/middleware` — 中间件（persist）
- `reactflow` — React Flow 类型

### 持久化配置

```typescript
{
  name: 'nanoai-workflow-storage',
  partialize: (state) => ({
    nodes: state.nodes,
    edges: state.edges,
    templates: state.templates,
    versions: state.versions
  })
}
```

---

## 测试与质量

### 测试覆盖率（22 个测试文件）

**总覆盖率**：22/23 Store = 95.6%（仅 `toastStore` 无独立测试，因仅 32 行）

每个 Store 配套同名 `.test.ts` 文件，使用 Vitest 编写。测试依赖：

- **持久化测试**：通过 mock localStorage 验证 `persist` 中间件序列化（见 `src/test/setup.ts`）
- **异步 action 测试**：mock fetch / EventSource 验证 API 调用与状态更新
- **状态机测试**：覆盖 pending / running / completed / failed / cancelled 等状态流转

### 运行测试

```bash
pnpm test src/stores/                 # 仅 Stores 测试
pnpm test:coverage                    # 全量覆盖率报告
pnpm test src/stores/nanoaiWorkflowStore.test.ts   # 单个 Store
```

---

## 相关文件清单

```
src/stores/                                           # 23 Store + 22 测试，约 5,600 行
├── nanoaiWorkflowStore.ts + .test.ts                 # 1,459 行 — Workflow 核心引擎 + 测试
├── nanoImageStoryboardWizardStore.ts + .test.ts      #   431 行 — 故事板向导（四步流程） + 测试
├── nanoImageStoryboardTaskStore.ts + .test.ts        #   375 行 — 故事板任务队列 + 测试
├── appVisibilityStore.ts + .test.ts                  #   353 行 — 应用可见性三态管理 + 测试
├── nanoImageStoryboardStore.ts + .test.ts            #   349 行 — 故事板核心数据 + 测试
├── nanoImageStoryboardVoiceStore.ts + .test.ts       #   341 行 — 故事板角色配音 + 测试
├── nanoImageChatStore.ts + .test.ts                  #   290 行 — 图片多轮对话 + 测试
├── nanoImageTaskQueueStore.ts + .test.ts             #   258 行 — 图片任务队列 + 测试
├── collaborationStore.ts + .test.ts                  #   219 行 — 多人协作 + 测试
├── pluginStore.ts + .test.ts                         #   164 行 — 插件注册/启用 + 测试
├── promptTemplateStore.ts + .test.ts                 #   154 行 — 提示词模板 + 测试
├── remoteStore.ts + .test.ts                         #   149 行 — 同步/认证/设置 + 测试
├── appsConfigStore.ts + .test.ts                     #   138 行 — 应用配置常量 + 测试
├── nanoImageBananaBrotherStore.ts + .test.ts         #   134 行 — 香蕉兄弟对话 + 测试
├── nanoImageEcommerceProductStore.ts + .test.ts      #   125 行 — 电商产品图 + 测试
├── notificationStore.ts + .test.ts                   #   123 行 — 通知中心 + 测试
├── chatStore.ts + .test.ts                           #   121 行 — 即时聊天 + 测试
├── nanoImageRealtimeVoiceStore.ts + .test.ts         #   117 行 — 实时语音 + 测试
├── agentStore.ts + .test.ts                          #   Agent Team8 前端状态 + 测试
├── tvcStore.ts + .test.ts                            #   TVC 广告视频任务状态 + 测试
├── toastStore.ts + .test.ts                           #    32 行 — Toast 通知 + 测试
├── nanoImageKnowledgeCardStore.ts + .test.ts         #    37 行 — 知识卡片 + 测试
├── nanoImageArchitectureStore.ts + .test.ts          #    41 行 — 架构图生成 + 测试
└── nanoImageCharacterDesignStore.ts + .test.ts       #    41 行 — 角色设计 + 测试
```

---

## 变更记录 (Changelog)

### 2026-08-11
- 增量更新：新增 22 个测试文件，Store 测试覆盖率从 0% → 95.6%
- 新增 `agentStore`（Agent Team8 前端状态），总 Store 数 22 → 23
- 新增"测试与质量"章节，记录覆盖率矩阵和测试运行命令
- 文件清单每项标注测试配套

### 2026-05-14
- 全面更新：从 4 个 Store 扩展到 22 个 Store
- 新增业务组：chatStore、notificationStore、promptTemplateStore、remoteStore
- 新增应用管理组：appVisibilityStore、appsConfigStore
- 新增图片生成组：10 个 nanoImage* Store（架构图、香蕉兄弟、角色设计、图片聊天、电商、知识卡片、故事板系列、任务队列）
- 新增图片辅助组：realtimeVoiceStore、storyboardVoiceStore
- 按功能分组重新组织文档结构
- 添加故事板 Store 协作关系图

### 2026-05-05
- 初始化模块文档
- 识别 40+ 节点类型
- 识别 8 个内置模板
- 完成工作流执行逻辑说明

### 2026-04-22
- 初始版本（部分完成）
