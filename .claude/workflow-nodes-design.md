# 节点式工作流架构设计

> 将 Storyboard 4步向导改造为自由组合的拖拽式节点工作流

**设计时间**: 2026-04-20
**架构模式**: React Flow + 实时响应引擎 + Zustand 状态管理

---

## 核心概念

### 节点类型定义

```typescript
enum WorkflowNodeType {
  // 输入节点
  INPUT_TEXT = 'input_text',           // 文本输入
  INPUT_IMAGE = 'input_image',         // 图片上传

  // AI 生成节点
  SCRIPT_GENERATOR = 'script_generator',         // GLM-5 脚本生成
  STORYBOARD_GENERATOR = 'storyboard_generator', // NanoBanana 分镜头
  DIALOGUE_GENERATOR = 'dialogue_generator',     // GLM TTS 对白生成
  CHARACTER_DESIGNER = 'character_designer',     // 角色设计（生图API）
  SCENE_DESIGNER = 'scene_designer',             // 场景设计（生图API）

  // 处理节点
  TEXT_PROCESSOR = 'text_processor',     // 文本处理
  IMAGE_PROCESSOR = 'image_processor',   // 图片处理
  DATA_TRANSFORMER = 'data_transformer', // 数据转换

  // 输出节点
  OUTPUT_PREVIEW = 'output_preview',     // 预览输出
  OUTPUT_EXPORT = 'output_export',       // 导出结果
  OUTPUT_SAVE = 'output_save',           // 保存到资产库
}
```

### 节点数据结构

```typescript
interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    params: Record<string, any>;    // 节点参数
    inputs: NodePort[];             // 输入端口定义
    outputs: NodePort[];            // 输出端口定义
    status: NodeStatus;             // 节点状态
    result?: any;                   // 执行结果
    error?: string;                 // 错误信息
  };
}

interface NodePort {
  id: string;
  name: string;
  type: 'text' | 'image' | 'audio' | 'json' | 'array';
  required: boolean;
  description?: string;
}

enum NodeStatus {
  IDLE = 'idle',           // 空闲
  RUNNING = 'running',     // 运行中
  SUCCESS = 'success',     // 成功
  ERROR = 'error',         // 错误
  DISABLED = 'disabled',   // 禁用
}
```

### 连线数据结构

```typescript
interface WorkflowEdge {
  id: string;
  source: string;          // 源节点ID
  target: string;          // 目标节点ID
  sourceHandle: string;    // 源端口ID
  targetHandle: string;    // 目标端口ID
  data?: {
    type?: 'auto' | 'manual';  // 连线类型：自动/手动
    transform?: string;        // 数据转换函数
  };
}
```

---

## 5种AI节点详细设计

### 1. 脚本生成节点（SCRIPT_GENERATOR）

```typescript
interface ScriptGeneratorNodeData {
  params: {
    inputText: string;           // 输入文案
    style: string;               // 风格选择
    model: 'glm-5' | 'glm-4';    // 模型选择
    temperature: number;         // 温度参数
    maxLength: number;           // 最大长度
  };
  outputs: [{
    id: 'script',
    name: '脚本内容',
    type: 'json',
  }, {
    id: 'scenes',
    name: '场景列表',
    type: 'array',
  }, {
    id: 'characters',
    name: '角色列表',
    type: 'array',
  }];
}
```

**UI设计**：
```
┌─────────────────────────────────┐
│  📝 脚本生成                     │
├─────────────────────────────────┤
│  输入文案: [_______________]     │
│  风格: [下拉选择▼]              │
│  模型: [GLM-5 ▼]                │
│  温度: [0.7] 长度: [2000]       │
│                                  │
│  [生成脚本]                      │
├─────────────────────────────────┤
│  ◉ 脚本内容  ◉ 场景列表         │
│  ◉ 角色列表                      │
└─────────────────────────────────┘
```

### 2. 分镜头生成节点（STORYBOARD_GENERATOR）

```typescript
interface StoryboardGeneratorNodeData {
  params: {
    scriptData: any;              // 脚本数据（来自上游）
    style: string;                // 风格
    aspectRatio: string;          // 宽高比
    quality: 'standard' | 'hd';   // 质量
    count: number;                // 生成数量
  };
  outputs: [{
    id: 'images',
    name: '分镜图片',
    type: 'array',
  }, {
    id: 'urls',
    name: '图片URLs',
    type: 'array',
  }];
}
```

**UI设计**：
```
┌─────────────────────────────────┐
│  🎬 分镜头生成                   │
├─────────────────────────────────┤
│  数据源: [选择▼] 或 [连线]      │
│  风格: [下拉选择▼]              │
│  宽高比: [16:9 ▼]               │
│  质量: [高清 ▼] 数量: [5]       │
│                                  │
│  [生成分镜]                      │
├─────────────────────────────────┤
│  ◉ 分镜图片  ◉ 图片URLs         │
└─────────────────────────────────┘
```

### 3. 对白生成节点（DIALOGUE_GENERATOR）

```typescript
interface DialogueGeneratorNodeData {
  params: {
    dialogueText: string;         // 对白文本
    voice: string;                // 音色选择
    speed: number;                // 语速
    pitch: number;                // 音调
    emotion?: string;             // 情感
  };
  outputs: [{
    id: 'audio',
    name: '音频文件',
    type: 'audio',
  }, {
    id: 'url',
    name: '音频URL',
    type: 'text',
  }];
}
```

**UI设计**：
```
┌─────────────────────────────────┐
│  🎙️ 对白生成                     │
├─────────────────────────────────┤
│  对白文本: [_______________]     │
│  音色: [温柔女声 ▼]             │
│  语速: [1.0x] 音调: [1.0]       │
│  情感: [无 ▼]                   │
│                                  │
│  [生成对白]                      │
├─────────────────────────────────┤
│  ◉ 音频文件  ◉ 音频URL          │
└─────────────────────────────────┘
```

### 4. 角色设计节点（CHARACTER_DESIGNER）

```typescript
interface CharacterDesignerNodeData {
  params: {
    characterInfo: string;        // 角色描述
    style: string;                // 风格
    pose: string;                 // 姿势
    expression: string;           // 表情
    background: string;           // 背景
    viewAngle: string;            // 视角
  };
  outputs: [{
    id: 'image',
    name: '角色图',
    type: 'image',
  }, {
    id: 'url',
    name: '图片URL',
    type: 'text',
  }];
}
```

**UI设计**：
```
┌─────────────────────────────────┐
│  👤 角色设计                     │
├─────────────────────────────────┤
│  角色描述: [_______________]     │
│  风格: [日系 ▼] 姿势: [站立▼]   │
│  表情: [微笑 ▼] 视角: [正面▼]   │
│  背景: [简单 ▼]                 │
│                                  │
│  [设计角色]                      │
├─────────────────────────────────┤
│  ◉ 角色图  ◉ 图片URL            │
└─────────────────────────────────┘
```

### 5. 场景设计节点（SCENE_DESIGNER）

```typescript
interface SceneDesignerNodeData {
  params: {
    sceneDescription: string;     // 场景描述
    style: string;                // 风格
    timeOfDay: string;            // 时间
    weather: string;              // 天气
    mood: string;                 // 氛围
    angle: string;                // 角度
  };
  outputs: [{
    id: 'image',
    name: '场景图',
    type: 'image',
  }, {
    id: 'url',
    name: '图片URL',
    type: 'text',
  }];
}
```

**UI设计**：
```
┌─────────────────────────────────┐
│  🌄 场景设计                     │
├─────────────────────────────────┤
│  场景描述: [_______________]     │
│  风格: [写实 ▼] 时间: [白天▼]   │
│  天气: [晴朗 ▼] 氛围: [温馨▼]   │
│  角度: [平视 ▼]                 │
│                                  │
│  [设计场景]                      │
├─────────────────────────────────┤
│  ◉ 场景图  ◉ 图片URL            │
└─────────────────────────────────┘
```

---

## 数据流设计

### 混合模式实现

```typescript
// 自动连线模式
nodeA.outputs[0].connect(nodeB.inputs[0]);
// nodeA 的输出自动传递到 nodeB

// 手动选择模式
nodeB.params.inputSource = 'nodeA.outputs[0]';
// nodeB 从全局状态中选择 nodeA 的输出
```

### 数据传递策略

```typescript
interface DataTransferStrategy {
  // 策略1：直接连线（自动）
  directLink: {
    type: 'auto';
    source: string;  // 'nodeId.outputId'
    target: string;  // 'nodeId.inputId'
  };

  // 策略2：全局引用（手动）
  globalRef: {
    type: 'manual';
    source: string;  // 'nodeId.outputId'
    selector: string; // 选择器表达式
  };

  // 策略3：转换函数
  transform: {
    type: 'transform';
    source: string;
    transformFn: string; // JavaScript 表达式
  };
}
```

---

## 实时响应引擎

### 执行触发器

```typescript
class WorkflowEngine {
  // 监听节点参数变化
  watchNodeParams(nodeId: string, params: any) {
    // 防抖处理
    debounce(() => {
      this.executeNode(nodeId);
    }, 500);
  }

  // 执行单个节点
  async executeNode(nodeId: string) {
    const node = this.getNode(nodeId);

    // 1. 获取输入数据
    const inputs = await this.resolveInputs(node);

    // 2. 执行节点逻辑
    const result = await this.runNodeLogic(node, inputs);

    // 3. 更新节点状态
    node.data.result = result;
    node.data.status = NodeStatus.SUCCESS;

    // 4. 触发下游节点
    this.triggerDownstream(nodeId);
  }

  // 触发下游节点（实时响应）
  triggerDownstream(nodeId: string) {
    const downstream = this.getConnectedNodes(nodeId);
    downstream.forEach(child => {
      this.executeNode(child.id);
    });
  }
}
```

### 依赖管理

```typescript
// 拓扑排序执行
class DependencyGraph {
  topologicalSort(nodes: WorkflowNode[]): WorkflowNode[] {
    const sorted: WorkflowNode[] = [];
    const visited = new Set<string>();

    const visit = (node: WorkflowNode) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      const dependencies = this.getDependencies(node);
      dependencies.forEach(dep => visit(dep));

      sorted.push(node);
    };

    nodes.forEach(node => visit(node));
    return sorted;
  }
}
```

---

## 工作流管理功能

### 1. 模板系统

```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  category: 'script' | 'character' | 'scene' | 'custom';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 预设模板
const BUILT_IN_TEMPLATES = {
  STORYBOARD_COMPLETE: {
    name: '完整故事板生成',
    description: '从文案到完整故事板的4步流程',
    nodes: [
      { type: 'input_text' },
      { type: 'script_generator' },
      { type: 'storyboard_generator' },
      { type: 'output_preview' }
    ]
  },
  CHARACTER_DESIGN: {
    name: '角色设计工作流',
    description: '快速生成角色设计图',
    nodes: [
      { type: 'input_text' },
      { type: 'character_designer' },
      { type: 'output_preview' }
    ]
  },
  SCENE_DESIGN: {
    name: '场景设计工作流',
    description: '快速生成场景设计图',
    nodes: [
      { type: 'input_text' },
      { type: 'scene_designer' },
      { type: 'output_preview' }
    ]
  }
};
```

### 2. 导入导出

```typescript
// 导出工作流
function exportWorkflow(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2);
}

// 导入工作流
function importWorkflow(json: string): Workflow {
  return JSON.parse(json);
}

// 导出为图片
async function exportAsImage(workflow: Workflow): Promise<Blob> {
  const canvas = await renderWorkflowToCanvas(workflow);
  return new Blob([canvas.toDataURL()], { type: 'image/png' });
}
```

### 3. 版本历史

```typescript
interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  snapshot: Workflow;
  createdAt: string;
  description?: string;
  tags?: string[];
}

class VersionHistory {
  async saveVersion(workflow: Workflow, description?: string) {
    const version: WorkflowVersion = {
      id: generateId(),
      workflowId: workflow.id,
      version: this.getNextVersion(workflow.id),
      snapshot: JSON.parse(JSON.stringify(workflow)),
      createdAt: new Date().toISOString(),
      description
    };
    await this.db.versions.add(version);
  }

  async listVersions(workflowId: string): Promise<WorkflowVersion[]> {
    return await this.db.versions
      .where('workflowId')
      .equals(workflowId)
      .reverse()
      .toArray();
  }

  async restoreVersion(versionId: string): Promise<Workflow> {
    const version = await this.db.versions.get(versionId);
    return JSON.parse(JSON.stringify(version.snapshot));
  }
}
```

---

## 技术栈选择

### 状态管理

```typescript
// src/stores/workflowStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  templates: WorkflowTemplate[];
  versions: WorkflowVersion[];

  // Actions
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: any) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;

  // Template actions
  saveTemplate: (name: string, description: string) => void;
  loadTemplate: (templateId: string) => void;

  // Version actions
  saveVersion: (description?: string) => void;
  restoreVersion: (versionId: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      templates: BUILT_IN_TEMPLATES,
      versions: [],

      addNode: (node) => set(state => ({
        nodes: [...state.nodes, node]
      })),

      // ... 其他 actions
    }),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        templates: state.templates,
        versions: state.versions
      })
    }
  )
);
```

### React Flow 集成

```tsx
// src/components/workflow/WorkflowCanvas.tsx
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

import ScriptGeneratorNode from './nodes/ScriptGeneratorNode';
import StoryboardGeneratorNode from './nodes/StoryboardGeneratorNode';
// ... 其他节点组件

const nodeTypes = {
  script_generator: ScriptGeneratorNode,
  storyboard_generator: StoryboardGeneratorNode,
  dialogue_generator: DialogueGeneratorNode,
  character_designer: CharacterDesignerNode,
  scene_designer: SceneDesignerNode,
};

export function WorkflowCanvas() {
  const { nodes, edges, addEdge } = useWorkflowStore();

  const onConnect = (connection: Connection) => {
    addEdge({
      ...connection,
      type: 'default',
      animated: true
    });
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

---

## 实现优先级

### Phase 1: 核心引擎（P0）
- [x] 节点类型定义
- [x] 数据结构设计
- [ ] Zustand Store 实现
- [ ] React Flow 集成
- [ ] 基础节点组件框架

### Phase 2: AI节点实现（P0）
- [ ] 脚本生成节点
- [ ] 分镜头生成节点
- [ ] 对白生成节点
- [ ] 角色设计节点
- [ ] 场景设计节点

### Phase 3: 数据流引擎（P1）
- [ ] 混合数据流实现
- [ ] 实时响应引擎
- [ ] 依赖管理
- [ ] 错误处理

### Phase 4: 工作流管理（P1）
- [ ] 模板系统
- [ ] 导入导出
- [ ] 版本历史
- [ ] 分享功能

### Phase 5: UI/UX优化（P2）
- [ ] 节点样式美化
- [ ] 动画效果
- [ ] 性能优化
- [ ] 可访问性

---

## 示例工作流

### 示例1：快速故事板

```
[文本输入] → [脚本生成] → [分镜头生成] → [预览输出]
```

### 示例2：角色设计流水线

```
[文本输入] → [角色设计] → [图片处理] → [保存资产]
```

### 示例3：复杂场景创作

```
          [脚本生成]
              ↓
        [分镜头生成]
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[角色设计]          [场景设计]
    ↓                   ↓
    └─────────┬─────────┘
              ↓
        [合成输出]
```

---

**文档版本**: 1.0
**最后更新**: 2026-04-20
