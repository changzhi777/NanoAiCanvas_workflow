[根目录](../../../../CLAUDE.md) > [src](../) > **stores**

---

# Stores 模块 - Zustand 状态管理

> Workflow 状态管理（Zustand）+ 本地持久化

**最后更新**: 2026-05-05
**维护者**: NanoAiCanvas Team

---

## 模块职责

Stores 模块负责：
- **Workflow 状态管理**: 使用 Zustand 管理 NanoAI Workflow 的状态
- **插件状态**: 管理插件注册和启用状态
- **协作状态**: 管理多人协作时的状态（如光标位置）
- **Toast 通知**: 管理前端通知

---

## 入口与启动

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

## 对外接口

### nanoaiWorkflowStore

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

### pluginStore

**文件**: `src/stores/pluginStore.ts`

```typescript
interface PluginState {
  plugins: Plugin[]
  enabledPlugins: string[]
  // actions...
}
```

### collaborationStore

**文件**: `src/stores/collaborationStore.ts`

```typescript
interface CollaborationState {
  cursors: Map<string, CursorPosition>
  activeUsers: User[]
  // actions...
}
```

### toastStore

**文件**: `src/stores/toastStore.ts`

```typescript
interface ToastState {
  toasts: Toast[]
  addToast(toast: Toast): void
  removeToast(id: string): void
}
```

---

## 关键依赖与配置

### 依赖项

- `zustand`: 状态管理
- `zustand/middleware`: 中间件（persist）
- `reactflow`: React Flow 类型

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

## WorkflowNodeType（40+ 节点类型）

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

## 内置模板（8 个）

```typescript
const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'storyboard-01',
    name: '故事板01',
    description: '完整的故事板生成工作流：文案→剧本→角色→场景→分镜→视频→编辑→合成',
    category: 'story',
    nodes: [...],
    edges: [...]
  },
  {
    id: 'character-workflow',
    name: '角色设计工作流',
    category: 'character',
    nodes: [...],
    edges: [...]
  },
  {
    id: 'scene-workflow',
    name: '场景设计工作流',
    category: 'scene',
    nodes: [...],
    edges: [...]
  },
  // ... 更多模板
]
```

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

## 工作流执行

### 拓扑排序 + 并行执行

```typescript
executeWorkflow: async () => {
  // 1. 构建邻接表和入度
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  // 2. Kahn 算法分层
  const queue: string[] = []  // 入度为 0 的节点

  // 3. 按层并行执行
  while (queue.length > 0) {
    const currentBatch = [...queue]
    await executeInParallel(currentBatch)  // 同层节点并行
    // 更新依赖节点的入度
  }
}
```

---

## 测试与质量

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] Store 状态更新
- [ ] 节点添加/删除
- [ ] 模板保存/加载
- [ ] 工作流执行逻辑
- [ ] 状态持久化

### 集成测试

**状态**: 未实现

**建议测试场景**:
- [ ] Workflow 执行流程
- [ ] 模板加载和应用
- [ ] 状态恢复

---

## 常见问题 (FAQ)

### Q: 如何添加新的节点类型？

A:
1. 在 `WorkflowNodeType` 枚举中添加新的类型
2. 在节点组件目录创建新的节点组件
3. 在 `nodes/index.ts` 中注册节点类型
4. 在 `executeNode` 方法中添加对应的执行逻辑

### Q: 如何添加新的内置模板？

A:
1. 定义模板的 nodes 和 edges
2. 在 `BUILT_IN_TEMPLATES` 数组中添加新模板
3. 在国际化文件中添加翻译

### Q: 如何自定义节点执行逻辑？

A: 在 `executeNode` 方法的 switch 语句中添加新的 case：

```typescript
case 'my_custom_node': {
  const result = await myCustomLogic(node.data.params)
  updateNode(nodeId, { status: NodeStatus.SUCCESS, result })
  break
}
```

---

## 相关文件清单

```
src/stores/
├── nanoaiWorkflowStore.ts    # 主 Workflow Store（Zustand + Persist）
├── pluginStore.ts            # 插件状态管理
├── collaborationStore.ts     # 协作状态管理
└── toastStore.ts             # Toast 通知管理
```

---

## 变更记录 (Changelog)

### 2026-05-05
- 初始化模块文档
- 识别 40+ 节点类型
- 识别 8 个内置模板
- 完成工作流执行逻辑说明
- 添加测试建议

### 2026-04-22
- 初始版本（部分完成）