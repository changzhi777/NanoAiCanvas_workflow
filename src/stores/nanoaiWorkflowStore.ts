import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node } from 'reactflow';
import { storyboard01Template } from '@/components/nanoai-workflow/templates/storyboard01';
import { characterWorkflowTemplate } from '@/components/nanoai-workflow/templates/characterWorkflow';
import { sceneWorkflowTemplate } from '@/components/nanoai-workflow/templates/sceneWorkflow';
import { quickStoryboardTemplate } from '@/components/nanoai-workflow/templates/quickStoryboard';
import { smartAutoLayout, calculateLayoutScore } from '@/lib/smartLayout';

// ==================== 类型定义 ====================

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

  // 里程碑节点（预览展示）
  MILESTONE = 'milestone',

  // 输出节点
  OUTPUT_PREVIEW = 'output_preview',
  OUTPUT_EXPORT = 'output_export',
  OUTPUT_SAVE = 'output_save',
}

export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  DISABLED = 'disabled',
}

export interface NodePort {
  id: string;
  name: string;
  type: 'text' | 'image' | 'audio' | 'json' | 'array';
  required: boolean;
  description?: string;
}

export interface WorkflowNodeData {
  label: string;
  params: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
  status: NodeStatus;
  result?: any;
  error?: string;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    type?: 'auto' | 'manual';
    transform?: string;
    status?: 'idle' | 'running' | 'completed' | 'error';
    sourceType?: string;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  category: 'script' | 'character' | 'scene' | 'custom' | 'storyboard' | 'story';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  snapshot: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  createdAt: string;
  description?: string;
  tags?: string[];
}

// ==================== 预设模板 ====================

const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'storyboard-complete',
    name: '完整故事板生成',
    description: '从文案到完整故事板的4步流程',
    category: 'script',
    tags: ['完整流程', '故事板', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-script-1',
        type: 'script_generator',
        position: { x: 100, y: 100 },
        data: {
          label: '脚本生成',
          params: {
            dataSource: '一个关于勇气和友谊的冒险故事',
            style: 'story',
            length: 'medium',
          },
          inputs: [],
          outputs: [
            { id: 'script-out', name: '脚本', type: 'text', required: false }
          ],
          status: NodeStatus.IDLE
        }
      },
      {
        id: 'node-storyboard-1',
        type: 'storyboard_generator',
        position: { x: 500, y: 100 },
        data: {
          label: '分镜头生成',
          params: {
            dataSource: '冒险故事场景',
            style: 'realistic',
            aspectRatio: '16:9',
            quality: 'hd',
            count: 4
          },
          inputs: [
            { id: 'script-in', name: '脚本', type: 'text', required: true }
          ],
          outputs: [
            { id: 'images-out', name: '图片', type: 'image', required: false }
          ],
          status: NodeStatus.IDLE
        }
      },
      {
        id: 'node-character-1',
        type: 'character_designer',
        position: { x: 500, y: 300 },
        data: {
          label: '角色设计',
          params: {
            characterInfo: '勇敢的冒险者',
            style: 'anime',
            aspectRatio: '9:16',
            quality: 'hd',
            count: 2
          },
          inputs: [
            { id: 'script-in', name: '脚本', type: 'text', required: true }
          ],
          outputs: [
            { id: 'character-out', name: '角色图', type: 'image', required: false }
          ],
          status: NodeStatus.IDLE
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-script-1',
        target: 'node-storyboard-1',
        sourceHandle: 'script-out',
        targetHandle: 'script-in',
        type: 'custom', // 使用 CustomEdge 组件
        animated: false,
        style: { strokeWidth: 3 },
        data: { status: 'idle', sourceType: 'script_generator' }
      },
      {
        id: 'edge-2',
        source: 'node-script-1',
        target: 'node-character-1',
        sourceHandle: 'script-out',
        targetHandle: 'script-in',
        type: 'custom', // 使用 CustomEdge 组件
        animated: false,
        style: { strokeWidth: 3 },
        data: { status: 'idle', sourceType: 'script_generator' }
      }
    ]
  },
  {
    id: 'character-design',
    name: '角色设计工作流',
    description: '快速生成角色设计图',
    category: 'character',
    tags: ['角色', '快速', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-character-single',
        type: 'character_designer',
        position: { x: 250, y: 200 },
        data: {
          label: '角色设计',
          params: {
            characterInfo: '年轻勇敢的冒险者，穿着轻甲',
            style: 'anime',
            aspectRatio: '9:16',
            quality: 'hd',
            count: 3
          },
          inputs: [],
          outputs: [
            { id: 'character-out', name: '角色图', type: 'image', required: false }
          ],
          status: NodeStatus.IDLE
        }
      }
    ],
    edges: []
  },
  {
    id: 'scene-design',
    name: '场景设计工作流',
    description: '快速生成场景设计图',
    category: 'scene',
    tags: ['场景', '快速', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-scene-single',
        type: 'scene_designer',
        position: { x: 250, y: 200 },
        data: {
          label: '场景设计',
          params: {
            sceneInfo: '神秘的森林，阳光透过树叶',
            style: 'realistic',
            aspectRatio: '16:9',
            quality: 'hd',
            count: 4
          },
          inputs: [],
          outputs: [
            { id: 'scene-out', name: '场景图', type: 'image', required: false }
          ],
          status: NodeStatus.IDLE
        }
      }
    ],
    edges: []
  },
  // ==================== 故事板01 - 完整工作流模板 ====================
  {
    id: 'storyboard-01',
    name: '故事板01',
    description: '完整的故事板生成工作流：文案→剧本→角色→场景→分镜→视频→编辑→合成',
    category: 'story',
    tags: ['完整流程', '故事板', '专业', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: storyboard01Template.nodes,
    edges: storyboard01Template.edges,
  },
  // ==================== 角色设计工作流模板 ====================
  {
    id: 'character-workflow',
    name: '角色设计工作流',
    description: '从文案到角色设计的完整流程',
    category: 'character',
    tags: ['角色', '设计', '完整流程', '4步流程'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: characterWorkflowTemplate.nodes,
    edges: characterWorkflowTemplate.edges,
  },
  // ==================== 场景设计工作流模板 ====================
  {
    id: 'scene-workflow',
    name: '场景设计工作流',
    description: '快速创建场景设计图',
    category: 'scene',
    tags: ['场景', '快速', '3步流程', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: sceneWorkflowTemplate.nodes,
    edges: sceneWorkflowTemplate.edges,
  },
  // ==================== 快速分镜工作流模板 ====================
  {
    id: 'quick-storyboard-v2',
    name: '快速分镜',
    description: '3步快速生成分镜图片',
    category: 'storyboard',
    tags: ['快速', '分镜', '推荐', '3步流程'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: quickStoryboardTemplate.nodes,
    edges: quickStoryboardTemplate.edges,
  }
];

// ==================== Store 定义 ====================

interface WorkflowState {
  // 核心数据
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  templates: WorkflowTemplate[];
  versions: WorkflowVersion[];

  // UI 状态
  selectedNodeId: string | null;
  isExecuting: boolean;
  executionLog: string[];

  // Actions - 节点管理
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeParams: (nodeId: string, params: Record<string, any>) => void;

  // Actions - 连线管理
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;

  // Actions - 模板管理
  saveTemplate: (name: string, description: string, category: WorkflowTemplate['category']) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  resetTemplates: () => void;

  // Actions - 版本管理
  saveVersion: (description?: string, tags?: string[]) => void;
  restoreVersion: (versionId: string) => void;
  listVersions: (workflowId?: string) => WorkflowVersion[];

  // Actions - 工作流执行
  executeNode: (nodeId: string) => Promise<void>;
  executeWorkflow: () => Promise<void>;
  stopExecution: () => void;

  // Actions - 工作流导入导出
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  clearWorkflow: () => void;

  // Actions - 选择
  selectNode: (nodeId: string | null) => void;

  // Actions - 批量更新
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
}

export const useNanoaiWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // ==================== 初始状态 ====================

      nodes: [],
      edges: [],
      templates: BUILT_IN_TEMPLATES,
      versions: [],
      selectedNodeId: null,
      isExecuting: false,
      executionLog: [],

      // ==================== 节点管理 ====================

      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node]
      })),

      removeNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(n => n.id !== nodeId),
        edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
      })),

      updateNode: (nodeId, data) => set((state) => ({
        nodes: state.nodes.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      })),

      updateNodePosition: (nodeId, position) => set((state) => ({
        nodes: state.nodes.map(n =>
          n.id === nodeId ? { ...n, position } : n
        )
      })),

      updateNodeParams: (nodeId, params) => set((state) => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            const updatedParams = { ...n.data.params, ...params };
            return {
              ...n,
              data: {
                ...n.data,
                params: updatedParams
              }
            };
          }
          return n;
        })
      })),

      // ==================== 连线管理 ====================

      addEdge: (edge) => set((state) => ({
        edges: [...state.edges, edge]
      })),

      removeEdge: (edgeId) => set((state) => ({
        edges: state.edges.filter(e => e.id !== edgeId)
      })),

      // ==================== 模板管理 ====================

      saveTemplate: (name, description, category) => {
        const { nodes, edges } = get();
        const template: WorkflowTemplate = {
          id: `template-${Date.now()}`,
          name,
          description,
          category,
          tags: [],
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          templates: [...state.templates, template]
        }));
      },

      loadTemplate: (templateId) => {
        const { templates } = get();
        const template = templates.find(t => t.id === templateId);
        if (template) {
          // 深拷贝模板节点
          let layoutedNodes = JSON.parse(JSON.stringify(template.nodes));
          const layoutedEdges = JSON.parse(JSON.stringify(template.edges));

          // 应用智能自动布局
          const { score, issues } = calculateLayoutScore(layoutedNodes, layoutedEdges);

          // 如果布局质量分数低于 70 分，应用自动布局
          if (score < 70) {
            console.log('布局质量分数:', score, '问题:', issues);
            layoutedNodes = smartAutoLayout(layoutedNodes, layoutedEdges, {
              animate: true, // 启用布局动画
            });
          }

          set({
            nodes: layoutedNodes,
            edges: layoutedEdges
          });
        }
      },

      deleteTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(t => t.id !== templateId)
      })),

      resetTemplates: () => set({
        templates: BUILT_IN_TEMPLATES
      }),

      // ==================== 版本管理 ====================

      saveVersion: (description, tags) => {
        const { nodes, edges } = get();
        const version: WorkflowVersion = {
          id: `version-${Date.now()}`,
          workflowId: 'current',
          version: get().versions.length + 1,
          snapshot: {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
          },
          createdAt: new Date().toISOString(),
          description,
          tags
        };
        set((state) => ({
          versions: [...state.versions, version]
        }));
      },

      restoreVersion: (versionId) => {
        const { versions } = get();
        const version = versions.find(v => v.id === versionId);
        if (version) {
          set({
            nodes: JSON.parse(JSON.stringify(version.snapshot.nodes)),
            edges: JSON.parse(JSON.stringify(version.snapshot.edges))
          });
        }
      },

      listVersions: (workflowId) => {
        const { versions } = get();
        if (workflowId) {
          return versions.filter(v => v.workflowId === workflowId);
        }
        return versions;
      },

      // ==================== 工作流执行 ====================

      executeNode: async (nodeId) => {
        const { nodes, updateNode } = get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // 更新节点状态为运行中
        updateNode(nodeId, { status: NodeStatus.RUNNING });

        try {
          // TODO: 根据节点类型执行不同的逻辑
          // 这里暂时模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 更新节点状态为成功
          updateNode(nodeId, {
            status: NodeStatus.SUCCESS,
            result: { message: '执行成功' }
          });
        } catch (error) {
          // 更新节点状态为错误
          updateNode(nodeId, {
            status: NodeStatus.ERROR,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      },

      executeWorkflow: async () => {
        const { nodes } = get();
        set({ isExecuting: true, executionLog: [] });

        // TODO: 实现拓扑排序和依赖执行
        for (const node of nodes) {
          await get().executeNode(node.id);
        }

        set({ isExecuting: false });
      },

      stopExecution: () => {
        set({ isExecuting: false });
      },

      // ==================== 工作流导入导出 ====================

      exportWorkflow: () => {
        const { nodes, edges } = get();
        return JSON.stringify({ nodes, edges }, null, 2);
      },

      importWorkflow: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            nodes: data.nodes || [],
            edges: data.edges || []
          });
        } catch (error) {
          console.error('导入工作流失败:', error);
        }
      },

      clearWorkflow: () => {
        set({ nodes: [], edges: [] });
      },

      // ==================== 选择管理 ====================

      selectNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      // ==================== 批量更新 ====================

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges })
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
);
