[根目录](../../../../CLAUDE.md) > [src](../) > [components](../) > **nanoai-workflow**

---

# NanoAI Workflow 模块 - AI 工作流核心系统

> 基于 React Flow 的可视化工作流编辑器，支持 50+ 节点类型和 28+ 内置模板

**最后更新**: 2026-05-17
**维护者**: NanoAiCanvas Team

---

## 模块职责

NanoAI Workflow 模块是整个应用的核心，负责：
- **可视化工作流编辑**: 基于 React Flow 的无限画布
- **50+ 节点类型**: 输入、AI 生成、决策、处理、输出、各类 AI 服务集成
- **工作流执行**: Kahn 算法拓扑排序 + 并行执行
- **模板管理**: 6 个基础模板 + 20 个 Skills 模板 + 自定义模板
- **28 个 UI 组件**: 属性面板、模板面板、进度条、快捷键、主题等
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

### 节点类型（55+）

| 类别 | 类型 | 描述 |
|------|------|------|
| **输入** | `input_text`, `input_image` | 文本/图片输入节点 |
| **AI 生成** | `script_generator`, `storyboard_generator`, `dialogue_generator`, `character_designer`, `scene_designer` | 故事板相关生成 |
| **TVC/分镜** | `tvc_script`, `storyboard_v2`, `storyboard_shot_a`, `storyboard_script_table`, `shot_ref_image`, `storyboard_video` | TVC 广告 + 分镜精细化 |
| **Skills** | `skills_data`, `skills_task` | Skills 工作流数据/任务节点 |
| **MiniMax** | `minimax_text`, `minimax_speech`, `minimax_video`, `minimax_music`, `minimax_image`, `minimax_coding` | MiniMax 全套 AI |
| **图片生成** | `nano_banana_2`, `nano_banana_pro`, `gpt_image_2`, `character_design_image`, `scene_design_image` | NanoBanana / GPT-Image / 角色场景图 |
| **视频生成** | `video_generator` | 通用视频生成 |
| **即梦** | `jimeng_image`, `jimeng_video` | 字节 AI |
| **智谱 GLM** | `glm_text`, `glm_video`, `glm_tts`, `glm_multimodal` | 智谱 AI |
| **通义千问** | `qwen_text`, `qwen_coding` | 阿里 AI |
| **Kimi** | `kimi_text` | Moonshot AI |
| **预览/输出** | `image_preview`, `video_preview`, `audio_preview`, `text_preview`, `output` | 结果预览 + 输出终结节点 |
| **其他** | `director_agent`, `screenwriter_agent`, `milestone`, `background_music`, `transition`, `connector` | 代理/工具/连线节点 |

---

## 内置模板

### 基础模板（8 个）

| # | 模板 ID | 名称 | 描述 |
|---|---------|------|------|
| 1 | `storyboard-01` | 故事板01 | 完整的故事板生成工作流 |
| 2 | `character-workflow` | 角色设计工作流 | 描述 → 角色设计 → 预览 |
| 3 | `scene-workflow` | 场景设计工作流 | 描述 → 场景设计 → 预览 |
| 4 | `quick-storyboard-v2` | 快速分镜 | 3 步快速生成分镜图片 |
| 5 | `dual-line-character-design` | 双线角色设计 | 文本输入 + 双模型并行图片生成 + 预览对比 |
| 6 | `storyboard-complete` | 完整故事板生成 | 4 步流程（文案 → 脚本 → 分镜头 → 预览） |
| 7 | `character-design` | 角色设计 | 快速生成角色设计图 |
| 8 | `scene-design` | 场景设计 | 快速生成场景设计图 |
| 9 | `tvc-video-01` | TVC 视频 V1 | 3 节点专业 TVC 广告视频生成（GLM + Seedance + MiniMax Music） |

### Skills 模板（18 个）

模板目录: `templates/skills/`

| 模板 | 描述 |
|------|------|
| `ui-mockups` | UI 模型设计 |
| `product-visuals` | 产品视觉 |
| `maps` | 地图设计 |
| `slides` | 幻灯片设计 |
| `poster` | 海报设计 |
| `portraits` | 肖像设计 |
| `scenes` | 场景设计 |
| `editing` | 图片编辑 |
| `avatars` | 头像生成 |
| `storyboards` | 故事板生成 |
| `grids` | 网格布局 |
| `branding` | 品牌设计 |
| `typography` | 排版设计 |
| `assets` | 资产生成 |
| `academic` | 学术图表 |
| `infographics` | 信息图表 |
| `technical` | 技术图表 |
| `complete` | 完整工作流 |

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
| **基础/通用** | | |
| BaseNode | `nodes/BaseNode.tsx` | 基础节点组件 |
| TaskNodeBase | `nodes/TaskNodeBase.tsx` | 任务节点基类 |
| CustomEdge | `nodes/CustomEdge.tsx` | 自定义连线 |
| ConnectorNode | `nodes/ConnectorNode.tsx` | 连接器 |
| **输入** | | |
| TextInputNode | `nodes/TextInputNode.tsx` | 文本输入 |
| **故事板/分镜** | | |
| ScriptGeneratorNode | `nodes/ScriptGeneratorNode.tsx` | 脚本生成 |
| StoryboardGeneratorNode | `nodes/StoryboardGeneratorNode.tsx` | 分镜生成 |
| StoryboardV2Node | `nodes/StoryboardV2Node.tsx` | 分镜 V2 |
| StoryboardShotANode | `nodes/StoryboardShotANode.tsx` | 分镜 A 卡片 |
| StoryboardScriptTableNode | `nodes/StoryboardScriptTableNode.tsx` | 剧本表格 |
| StoryboardVideoNode | `nodes/StoryboardVideoNode.tsx` | 分镜视频 |
| TvcScriptNode | `nodes/TvcScriptNode.tsx` | TVC 剧本 |
| ShotRefImageNode | `nodes/ShotRefImageNode.tsx` | 参考图节点 |
| **角色/场景设计** | | |
| CharacterDesignerNode | `nodes/CharacterDesignerNode.tsx` | 角色设计 |
| CharacterDesignImageNode | `nodes/CharacterDesignImageNode.tsx` | 角色设计图生成 |
| SceneDesignerNode | `nodes/SceneDesignerNode.tsx` | 场景设计 |
| SceneDesignImageNode | `nodes/SceneDesignImageNode.tsx` | 场景设计图生成 |
| **AI 服务集成** | | |
| DirectorAgentNode | `nodes/DirectorAgentNode.tsx` | 导演代理 |
| ScreenwriterAgentNode | `nodes/ScreenwriterAgentNode.tsx` | 编剧代理 |
| MiniMaxTextNode | `nodes/MiniMaxTextNode.tsx` | MiniMax 文本 |
| MiniMaxImageNode | `nodes/MiniMaxImageNode.tsx` | MiniMax 图片 |
| MiniMaxVideoNode | `nodes/MiniMaxVideoNode.tsx` | MiniMax 视频 |
| MiniMaxSpeechNode | `nodes/MiniMaxSpeechNode.tsx` | MiniMax 语音 |
| MiniMaxMusicNode | `nodes/MiniMaxMusicNode.tsx` | MiniMax 音乐 |
| MiniMaxCodingNode | `nodes/MiniMaxCodingNode.tsx` | MiniMax 编程 |
| GPTImage2Node | `nodes/GPTImage2Node.tsx` | GPT 图片 |
| NanoBanana2Node | `nodes/NanoBanana2Node.tsx` | NanoBanana2 图片 |
| NanoBananaProNode | `nodes/NanoBananaProNode.tsx` | NanoBanana Pro 图片 |
| JimengImageNode | `nodes/JimengImageNode.tsx` | 即梦图片 |
| JimengVideoNode | `nodes/JimengVideoNode.tsx` | 即梦视频 |
| GlmTextNode | `nodes/GlmTextNode.tsx` | GLM 文本 |
| GlmVideoNode | `nodes/GlmVideoNode.tsx` | GLM 视频 |
| GlmTtsNode | `nodes/GlmTtsNode.tsx` | GLM 语音 |
| GlmMultimodalNode | `nodes/GlmMultimodalNode.tsx` | GLM 多模态 |
| QwenTextNode | `nodes/QwenTextNode.tsx` | 千问文本 |
| QwenCodingNode | `nodes/QwenCodingNode.tsx` | 千问编程 |
| KimiTextNode | `nodes/KimiTextNode.tsx` | Kimi 文本 |
| **视频生成** | | |
| VideoGeneratorNode | `nodes/VideoGeneratorNode.tsx` | 通用视频生成 |
| **预览/输出** | | |
| PreviewNode | `nodes/PreviewNode.tsx` | 预览输出 |
| ImagePreviewNode | `nodes/ImagePreviewNode.tsx` | 图片预览 |
| VideoPreviewNode | `nodes/VideoPreviewNode.tsx` | 视频预览 |
| AudioPreviewNode | `nodes/AudioPreviewNode.tsx` | 音频预览 |
| TextPreviewNode | `nodes/TextPreviewNode.tsx` | 文本预览 |
| OutputNode | `nodes/OutputNode.tsx` | 输出终结节点 |
| **Skills** | | |
| SkillsDataNode | `nodes/SkillsDataNode.tsx` | Skills 数据节点 |
| SkillsTaskNode | `nodes/SkillsTaskNode.tsx` | Skills 任务节点 |
| **其他** | | |
| MilestoneNode | `nodes/MilestoneNode.tsx` | 里程碑 |
| DialogueGeneratorNode | `nodes/DialogueGeneratorNode.tsx` | 对话生成 |
| BackgroundMusicNode | `nodes/BackgroundMusicNode.tsx` | 背景音乐 |
| TransitionNode | `nodes/TransitionNode.tsx` | 转场 |

### 共享逻辑

| 文件 | 描述 |
|------|------|
| `nodes/StoryboardShotA.shared.ts` | 分镜 A 共享逻辑 |
| `nodes/StoryboardV2.shared.ts` | 分镜 V2 共享逻辑 |
| `nodes/promptBuilder.ts` | 提示词构建器 |
| `nodes/useImageGeneration.ts` | 图片生成 Hook |
| `nodes/nodeColors.ts` | 节点颜色配置 |
| `nodes/nodeStatusConfig.ts` | 节点状态配置 |

### UI 组件

| 组件 | 文件 | 描述 |
|------|------|------|
| WorkflowProgress | `ui/WorkflowProgress.tsx` | 执行进度 |
| WorkflowTemplates | `ui/WorkflowTemplates.tsx` | 模板选择 |
| WorkflowPropertiesPanel | `ui/WorkflowPropertiesPanel.tsx` | 属性面板 |
| TvcExecutionPanel | `ui/TvcExecutionPanel.tsx` | TVC 执行面板 |
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
| VersionHistoryDialog | `ui/VersionHistoryDialog.tsx` | 版本历史 |
| PerformanceMonitor | `ui/PerformanceMonitor.tsx` | 性能监控 |
| DeveloperTools | `ui/DeveloperTools.tsx` | 开发者工具 |
| MobileToolbar | `ui/MobileToolbar.tsx` | 移动端工具栏 |
| VoiceInput | `ui/VoiceInput.tsx` | 语音输入 |
| IMEInput | `ui/IMEInput.tsx` | IME 输入组件 |
| AutoLayoutButton | `ui/AutoLayoutButton.tsx` | 自动布局 |
| LayoutProgress | `ui/LayoutProgress.tsx` | 布局进度 |
| Progress | `ui/Progress.tsx` | 通用进度条 |
| A11y | `ui/A11y.tsx` | 无障碍 |
| UIComponents | `ui/UIComponents.tsx` | UI 组件集 |

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

- `nodes/StoryboardShotANode.test.tsx` - 分镜 A 节点测试

### E2E 测试

- `e2e/workflow-display.spec.ts` - 工作流展示测试
- `e2e/workflow-visual.spec.ts` - 工作流视觉测试

---

## 常见问题 (FAQ)

### Q: 如何添加新的节点类型？

A:
1. 在 `src/stores/nanoaiWorkflowStore.ts` 的 `WorkflowNodeType` 枚举中添加新类型
2. 在 `nodes/` 目录创建新节点组件（如 `MyCustomNode.tsx`）
3. 在 `nodes/index.ts` 中注册节点
4. 在 `executeNode` 方法中添加对应的执行逻辑

### Q: 如何添加新的 Skills 模板？

A:
1. 在 `templates/skills/` 目录创建新模板文件
2. 使用 `createSkillsWorkflow()` 工厂函数构建模板
3. 在 `templates/skills/index.ts` 中注册并导出

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
├── NanoaiWorkflowCanvas.tsx         # 主画布组件
├── NanoaiWorkflowToolbar.tsx        # 工具栏
├── NanoaiWorkflowSidebar.tsx        # 侧边栏
├── OnboardingTour.tsx               # 新手引导
├── index.ts                         # 导出
├── nodes/                           # 节点组件（55+）
│   ├── index.ts                     # 节点导出
│   ├── BaseNode.tsx                 # 基础节点
│   ├── TaskNodeBase.tsx             # 任务节点基类
│   ├── CustomEdge.tsx               # 自定义连线
│   ├── ConnectorNode.tsx            # 连接器
│   ├── TextInputNode.tsx            # 文本输入
│   ├── TvcScriptNode.tsx            # TVC 剧本
│   ├── StoryboardV2Node.tsx         # 分镜 V2
│   ├── StoryboardShotANode.tsx      # 分镜 A 卡片
│   ├── StoryboardScriptTableNode.tsx # 剧本表格
│   ├── StoryboardVideoNode.tsx      # 分镜视频
│   ├── ShotRefImageNode.tsx         # 参考图
│   ├── VideoGeneratorNode.tsx       # 视频生成
│   ├── OutputNode.tsx               # 输出终结
│   ├── SkillsDataNode.tsx           # Skills 数据
│   ├── SkillsTaskNode.tsx           # Skills 任务
│   ├── CharacterDesignImageNode.tsx # 角色设计图
│   ├── SceneDesignImageNode.tsx     # 场景设计图
│   ├── ...                          # 更多 AI 服务节点
│   ├── StoryboardShotA.shared.ts    # 分镜 A 共享逻辑
│   ├── StoryboardV2.shared.ts       # 分镜 V2 共享逻辑
│   ├── promptBuilder.ts             # 提示词构建器
│   ├── useImageGeneration.ts        # 图片生成 Hook
│   ├── nodeColors.ts                # 节点颜色配置
│   └── nodeStatusConfig.ts          # 节点状态配置
├── templates/                       # 工作流模板
│   ├── storyboard01.ts              # 故事板01
│   ├── characterWorkflow.ts         # 角色设计
│   ├── sceneWorkflow.ts             # 场景设计
│   ├── quickStoryboard.ts           # 快速分镜
│   ├── textToImageWorkflow.ts       # 双线角色设计
│   ├── tvcVideo01.ts                # TVC 视频 V1
│   └── skills/                      # Skills 模板（18 个）
│       ├── index.ts
│       ├── createSkillsWorkflow.ts  # 工厂函数
│       └── ...（ui-mockups, poster, branding 等）
└── ui/                              # UI 组件（28 个）
    ├── WorkflowProgress.tsx
    ├── WorkflowTemplates.tsx
    ├── WorkflowPropertiesPanel.tsx
    ├── TvcExecutionPanel.tsx
    ├── ...（更多 UI 组件）
```

---

## 变更记录 (Changelog)

### 2026-05-15
- TVC V1 节点重构：脚本生成切换 MiniMax M2.7 模型
- TVC 视频默认模型改为 MiniMax Hailuo
- 后端 TVC 模块拆分为 tvc_engine + tvc_polling + tvc_providers

### 2026-05-14
- 更新节点数量：40+ → 55+
- 更新模板数量：8 → 26+（含 18 个 Skills 模板）
- 新增节点：TvcScriptNode, StoryboardScriptTableNode, StoryboardV2Node, StoryboardShotANode, ShotRefImageNode, VideoGeneratorNode, OutputNode, SkillsDataNode, SkillsTaskNode, CharacterDesignImageNode, SceneDesignImageNode
- 新增共享逻辑：StoryboardShotA.shared.ts, StoryboardV2.shared.ts, promptBuilder.ts, useImageGeneration.ts, nodeColors.ts, nodeStatusConfig.ts
- 新增模板目录：templates/skills/（18 个 Skills 工作流模板）
- 新增 UI 组件：TvcExecutionPanel, VoiceInput, IMEInput, PerformanceMonitor, DeveloperTools 等
- 新增 OnboardingTour 新手引导组件

### 2026-05-05
- 初始化完整模块文档
- 识别 40+ 节点类型
- 识别 8 个内置模板
- 完成 Kahn 算法执行流程说明
- 添加完整组件和文件清单

### 2026-04-22
- 初始版本
