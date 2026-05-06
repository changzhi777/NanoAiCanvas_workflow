[根目录](../../../../CLAUDE.md) > [src](../) > [components](../) > **nanoai-workflow**

---

# NanoAI Workflow 模块 - AI 工作流核心系统

> 基于 React Flow 的可视化工作流编辑器，支持 40+ 节点类型和 8 个内置模板

**最后更新**: 2026-05-05
**维护者**: NanoAiCanvas Team

---

## 模块职责

NanoAI Workflow 模块是整个应用的核心，负责：
- **可视化工作流编辑**: 基于 React Flow 的无限画布
- **40+ 节点类型**: 输入、AI 生成、决策、处理、输出、各类 AI 服务集成
- **工作流执行**: Kahn 算法拓扑排序 + 并行执行
- **模板管理**: 8 个内置模板 + 自定义模板
- **状态持久化**: Zustand + Persist (localStorage)

---

## 入口与启动

### 主组件

**文件**: `src/components/nanoai-workflow/NanoaiWorkflowCanvas.tsx`

```tsx
import { NanoaiWorkflowCanvas } from '@/components/nanoai-workflow'
// 或
import { NanoaiWorkflowCanvas } from '@/components/nanoai-workflow/NanoaiWorkflowCanvas'

// 使用
<NanoaiWorkflowCanvas />
```

### 页面入口

**文件**: `src/pages/NanoaiWorkflowPage.tsx`

```tsx
export default function NanoaiWorkflowPage() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="h-screen w-screen overflow-hidden">
        <WorkflowContent />
      </div>
    </ThemeProvider>
  )
}
```

---

## 对外接口

### 导出组件

```typescript
export { NanoaiWorkflowCanvas } from './NanoaiWorkflowCanvas'
export { NanoaiWorkflowSidebar } from './NanoaiWorkflowSidebar'
export { NanoaiWorkflowToolbar } from './NanoaiWorkflowToolbar'
export * from './nodes'  // 所有节点组件
```

### 节点类型（40+）

| 类别 | 类型 | 描述 |
|------|------|------|
| **输入** | `input_text`, `input_image` | 文本/图片输入节点 |
| **AI 生成** | `script_generator`, `storyboard_generator`, `dialogue_generator`, `character_designer`, `scene_designer` | 故事板相关生成 |
| **MiniMax** | `minimax_text`, `minimax_speech`, `minimax_video`, `minimax_music`, `minimax_image`, `minimax_coding` | MiniMax 全套 AI |
| **图片生成** | `nano_banana_2`, `nano_banana_pro`, `gpt_image_2` | NanoBanana / GPT-Image |
| **即梦** | `jimeng_image`, `jimeng_video` | 字节 AI |
| **智谱 GLM** | `glm_text`, `glm_video`, `glm_tts`, `glm_multimodal` | 智谱 AI |
| **通义千问** | `qwen_text`, `qwen_coding` | 阿里 AI |
| **Kimi** | `kimi_text` | Moonshot AI |
| **预览** | `image_preview`, `video_preview`, `audio_preview`, `text_preview` | 结果预览 |
| **其他** | `director_agent`, `screenwriter_agent`, `milestone`, `background_music`, `transition` | 代理/工具节点 |

---

## 内置模板（8 个）

### 1. storyboard-01
**完整的故事板生成工作流**: 文案 → 剧本 → 角色 → 场景 → 分镜 → 视频 → 编辑 → 合成

### 2. character-workflow
**角色设计工作流**: 描述 → 角色设计 → 预览

### 3. scene-workflow
**场景设计工作流**: 描述 → 场景设计 → 预览

### 4. quick-storyboard-v2
**快速分镜**: 3 步快速生成分镜图片

### 5. dual-line-character-design
**双线角色设计**: 文本输入 + 提示词优化 + 双模型并行图片生成 + 预览对比

### 6. storyboard-complete
**完整故事板生成**: 4 步流程（文案 → 脚本 → 分镜头 → 预览）

### 7. character-design
**角色设计**: 快速生成角色设计图

### 8. scene-design
**场景设计**: 快速生成场景设计图

---

## 关键组件

### NanoaiWorkflowCanvas

主画布组件，包含：
- React Flow 画布
- 侧边栏（NanoaiWorkflowSidebar）
- 工具栏（NanoaiWorkflowToolbar）
- 各种 UI 组件（进度、动画、搜索等）

### 节点组件

| 组件 | 文件 | 描述 |
|------|------|------|
| BaseNode | `nodes/BaseNode.tsx` | 基础节点组件 |
| TextInputNode | `nodes/TextInputNode.tsx` | 文本输入 |
| ScriptGeneratorNode | `nodes/ScriptGeneratorNode.tsx` | 脚本生成 |
| StoryboardGeneratorNode | `nodes/StoryboardGeneratorNode.tsx` | 分镜生成 |
| CharacterDesignerNode | `nodes/CharacterDesignerNode.tsx` | 角色设计 |
| SceneDesignerNode | `nodes/SceneDesignerNode.tsx` | 场景设计 |
| DirectorAgentNode | `nodes/DirectorAgentNode.tsx` | 导演代理 |
| ScreenwriterAgentNode | `nodes/ScreenwriterAgentNode.tsx` | 编剧代理 |
| MilestoneNode | `nodes/MilestoneNode.tsx` | 里程碑 |
| PreviewNode | `nodes/PreviewNode.tsx` | 预览输出 |
| MiniMaxTextNode | `nodes/MiniMaxTextNode.tsx` | MiniMax 文本 |
| MiniMaxImageNode | `nodes/MiniMaxImageNode.tsx` | MiniMax 图片 |
| GPTImage2Node | `nodes/GPTImage2Node.tsx` | GPT 图片 |
| CustomEdge | `nodes/CustomEdge.tsx` | 自定义连线 |
| ConnectorNode | `nodes/ConnectorNode.tsx` | 连接器 |

### UI 组件

| 组件 | 文件 | 描述 |
|------|------|------|
| WorkflowProgress | `ui/WorkflowProgress.tsx` | 执行进度 |
| WorkflowTemplates | `ui/WorkflowTemplates.tsx` | 模板选择 |
| WorkflowPropertiesPanel | `ui/WorkflowPropertiesPanel.tsx` | 属性面板 |
| KeyboardShortcuts | `ui/KeyboardShortcuts.tsx` | 快捷键帮助 |
| EmptyState | `ui/EmptyState.tsx` | 空状态 |
| CompletionAnimation | `ui/CompletionAnimation.tsx` | 完成动画 |
| NodeSearchFilter | `ui/NodeSearchFilter.tsx` | 节点搜索 |
| ExportDialog | `ui/ExportDialog.tsx` | 导出对话框 |
| ImportConfirmDialog | `ui/ImportConfirmDialog.tsx` | 导入确认 |
| Theme | `ui/Theme.tsx` | 主题提供商 |
| Toast | `ui/Toast.tsx` | Toast 通知 |
| HelpDialog | `ui/HelpDialog.tsx` | 帮助对话框 |
| PluginManagerDialog | `ui/PluginManagerDialog.tsx` | 插件管理 |
| CollaborationPanel | `ui/CollaborationPanel.tsx` | 协作面板 |
| OnlineUsersIndicator | `ui/OnlineUsersIndicator.tsx` | 在线用户 |
| LanguageSwitcher | `ui/LanguageSwitcher.tsx` | 语言切换 |

---

## 工作流执行

### Kahn 算法拓扑排序

```typescript
executeWorkflow: async () => {
  // 1. 构建邻接表和入度
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  nodes.forEach(node => {
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  })

  edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  // 2. 初始化队列（入度为 0 的节点）
  const queue: string[] = []
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id)
    }
  })

  // 3. 按层并行执行
  while (queue.length > 0) {
    const currentBatch = [...queue]
    queue.length = 0

    // 同层节点并行执行
    await Promise.all(currentBatch.map(nodeId => executeNode(nodeId)))

    // 更新依赖节点入度
    currentBatch.forEach(nodeId => {
      const neighbors = adjacency.get(nodeId) || []
      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 1) - 1
        inDegree.set(neighborId, newDegree)
        if (newDegree === 0) {
          queue.push(neighborId)
        }
      })
    })
  }
}
```

---

## 状态管理

### nanoaiWorkflowStore

```typescript
interface WorkflowState {
  // 核心数据
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  templates: WorkflowTemplate[]
  versions: WorkflowVersion[]

  // UI 状态
  selectedNodeId: string | null
  isExecuting: boolean
  executionLog: string[]

  // Actions
  addNode(node: WorkflowNode): void
  removeNode(nodeId: string): void
  updateNode(nodeId: string, data: Partial<WorkflowNodeData>): void
  addEdge(edge: WorkflowEdge): void
  executeWorkflow(): Promise<void>
  exportWorkflow(): string
  importWorkflow(json: string): void
  // ...
}
```

### 持久化

使用 Zustand Persist 中间件，自动保存到 localStorage：

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

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] 节点渲染
- [ ] 连线创建
- [ ] 工作流执行逻辑
- [ ] 模板加载
- [ ] 状态持久化

### 集成测试

**状态**: 未实现

**建议测试场景**:
- [ ] 创建节点流程
- [ ] 删除节点流程
- [ ] 连接节点流程
- [ ] 工作流执行流程
- [ ] 模板导入导出

---

## 常见问题 (FAQ)

### Q: 如何添加新的节点类型？

A:
1. 在 `src/stores/nanoaiWorkflowStore.ts` 的 `WorkflowNodeType` 枚举中添加新类型
2. 在 `nodes/` 目录创建新节点组件（如 `MyCustomNode.tsx`）
3. 在 `nodes/index.ts` 或 `nodes.ts` 中注册节点
4. 在 `executeNode` 方法中添加对应的执行逻辑

### Q: 如何添加新的内置模板？

A:
1. 定义模板的 nodes 和 edges 结构
2. 在 `BUILT_IN_TEMPLATES` 数组中添加新模板
3. 在国际化文件中添加翻译

### Q: 如何自定义节点执行逻辑？

A: 在 `executeNode` 方法中添加新的 case：

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
src/components/nanoai-workflow/
├── NanoaiWorkflowCanvas.tsx    # 主画布组件
├── NanoaiWorkflowToolbar.tsx   # 工具栏
├── NanoaiWorkflowSidebar.tsx   # 侧边栏
├── index.ts                    # 导出
├── nodes/
│   ├── index.ts                # 节点导出
│   ├── BaseNode.tsx            # 基础节点
│   ├── CustomEdge.tsx          # 自定义连线
│   ├── TextInputNode.tsx       # 文本输入
│   ├── ScriptGeneratorNode.tsx # 脚本生成
│   ├── StoryboardGeneratorNode.tsx
│   ├── CharacterDesignerNode.tsx
│   ├── SceneDesignerNode.tsx
│   ├── DirectorAgentNode.tsx
│   ├── ScreenwriterAgentNode.tsx
│   ├── MilestoneNode.tsx
│   ├── PreviewNode.tsx
│   ├── MiniMaxTextNode.tsx
│   ├── MiniMaxImageNode.tsx
│   ├── GPTImage2Node.tsx
│   └── ...（更多节点）
├── templates/
│   ├── storyboard01.ts         # 故事板01模板
│   ├── characterWorkflow.ts
│   ├── sceneWorkflow.ts
│   ├── quickStoryboard.ts
│   └── textToImageWorkflow.ts
└── ui/
    ├── WorkflowProgress.tsx
    ├── WorkflowTemplates.tsx
    ├── WorkflowPropertiesPanel.tsx
    ├── KeyboardShortcuts.tsx
    ├── EmptyState.tsx
    ├── CompletionAnimation.tsx
    ├── ExportDialog.tsx
    ├── HelpDialog.tsx
    ├── PluginManagerDialog.tsx
    ├── CollaborationPanel.tsx
    ├── Theme.tsx
    ├── Toast.tsx
    └── ...（更多 UI 组件）
```

---

## 变更记录 (Changelog)

### 2026-05-05
- 初始化完整模块文档
- 识别 40+ 节点类型
- 识别 8 个内置模板
- 完成 Kahn 算法执行流程说明
- 添加完整组件和文件清单

### 2026-04-22
- 初始版本