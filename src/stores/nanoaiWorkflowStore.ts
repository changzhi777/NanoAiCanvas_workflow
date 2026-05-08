import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node } from 'reactflow';
import { storyboard01Template } from '@/components/nanoai-workflow/templates/storyboard01';
import { characterWorkflowTemplate } from '@/components/nanoai-workflow/templates/characterWorkflow';
import { sceneWorkflowTemplate } from '@/components/nanoai-workflow/templates/sceneWorkflow';
import { quickStoryboardTemplate } from '@/components/nanoai-workflow/templates/quickStoryboard';
import { textToImageWorkflowTemplate } from '@/components/nanoai-workflow/templates/textToImageWorkflow';
import { skillsWorkflowTemplates } from '@/components/nanoai-workflow/templates/skills';
import { smartAutoLayout, calculateLayoutScore } from '@/lib/smartLayout';
import { generateNanoaiImageWithPolling } from '@/lib/api/suchuang-api';
import { buildPrompt } from '@/lib/prompt-builder';

// ==================== 类型定义 ====================

export enum WorkflowNodeType {
  // 输入节点
  INPUT_TEXT = 'input_text',
  INPUT_IMAGE = 'input_image',

  // Skills 节点
  SKILLS_DATA = 'skills_data',
  SKILLS_TASK = 'skills_task',

  // 故事板分镜节点
  STORYBOARD_SHOT_A = 'storyboard_shot_a',

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

  // 输出节点（结束）
  OUTPUT_NODE = 'output_node',
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
  type: 'text' | 'image' | 'audio' | 'json' | 'array' | 'object';
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
  _stepInfo?: { step: string; progress: number; message: string };
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
  category: string;
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
  autoSaved?: boolean;
  nodeCount?: number;
  edgeCount?: number;
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
  },
  // ==================== 文生图工作流模板 ====================
  {
    id: 'dual-line-character-design',
    name: '双线角色设计',
    description: '文本输入+提示词优化+双模型并行图片生成+预览对比',
    category: 'image',
    tags: ['文生图', '角色设计', '三视图', '并行生成', '提示词优化'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: textToImageWorkflowTemplate.nodes,
    edges: textToImageWorkflowTemplate.edges,
  },
  // 18 个 Skills 工作流模板
  ...skillsWorkflowTemplates,
  // ==================== 故事板分镜V1版 工作流（2节点双面） ====================
  {
    id: 'storyboard-shot-a-workflow',
    name: '故事板分镜V1版',
    description: '输入描述→提示词优化→生成分镜图→预览/保存',
    category: 'storyboard',
    tags: ['分镜', '故事板', '提示词优化', '推荐'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-shot-a-input',
        type: 'storyboard_shot_a',
        position: { x: 100, y: 300 },
        data: {
          label: '故事板分镜V1版',
          params: {
            inputText: '',
            size: '1024x1024',
            quality: 'standard',
            style: 'realistic',
            batchCount: 1,
            temperature: 0.8,
            systemPromptTemplate: 'storyboard',
            model: 'glm-4.5-air',
            aspectRatio: '1:1',
          },
          inputs: [
            { id: 'text-in', name: '文本', type: 'text', required: true },
          ],
          outputs: [
            { id: 'result-out', name: '结果', type: 'image', required: false },
          ],
          status: NodeStatus.IDLE,
        },
      },
      {
        id: 'node-shot-a-preview',
        type: 'image_preview',
        position: { x: 520, y: 280 },
        data: {
          label: '图片预览',
          params: {
            autoConnectSource: true,
            sourceNodeId: 'node-shot-a-input',
            enableAssetSave: true,
            enableDownload: true,
          },
          inputs: [
            { id: 'image-in', name: '图片', type: 'image', required: true },
          ],
          outputs: [
            { id: 'data-out', name: '数据', type: 'image', required: false },
          ],
          status: NodeStatus.IDLE,
        },
      },
    ],
    edges: [
      {
        id: 'edge-shot-a-to-preview',
        source: 'node-shot-a-input',
        target: 'node-shot-a-preview',
        sourceHandle: 'result-out',
        targetHandle: 'image-in',
        type: 'custom',
        animated: true,
        style: { stroke: '#3ecf8e', strokeWidth: 2 },
        data: { type: 'auto' },
      },
    ],
  },
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
  _globalAbortController: AbortController | null;

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
  saveVersion: (description?: string, tags?: string[], autoSaved?: boolean) => void;
  restoreVersion: (versionId: string) => void;
  listVersions: (workflowId?: string) => WorkflowVersion[];
  deleteVersion: (versionId: string) => void;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;

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
      _globalAbortController: null as AbortController | null,
      autoSaveEnabled: false,

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

      saveVersion: (description, tags, autoSaved) => {
        const { nodes, edges } = get();
        const MAX_VERSIONS = 50;
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
          tags,
          autoSaved: !!autoSaved,
          nodeCount: nodes.length,
          edgeCount: edges.length,
        };
        set((state) => {
          const updated = [...state.versions, version];
          if (updated.length > MAX_VERSIONS) updated.splice(0, updated.length - MAX_VERSIONS);
          return { versions: updated };
        });
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

      deleteVersion: (versionId) => {
        set((state) => ({
          versions: state.versions.filter(v => v.id !== versionId)
        }));
      },

      listVersions: (workflowId) => {
        const { versions } = get();
        if (workflowId) {
          return versions.filter(v => v.workflowId === workflowId);
        }
        return versions;
      },

      toggleAutoSave: () => {
        set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled }));
      },

      // ==================== 工作流执行 ====================

      executeNode: async (nodeId) => {
        const { nodes, updateNode } = get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // 更新节点状态为运行中
        updateNode(nodeId, { status: NodeStatus.RUNNING });

        try {
          const nodeType = node.type;
          let result: any = { message: '执行成功' };

          // 根据节点类型执行不同逻辑
          switch (nodeType) {
            case 'input_text': {
              // 文本输入节点：直接返回输入内容
              const inputText = node.data.params?.defaultValue || '';
              result = {
                text: inputText,
                charCount: inputText.length,
                wordCount: inputText.split(/\s+/).filter((w: string) => w.length > 0).length,
              };
              break;
            }

            case 'minimax_text': {
              // MiniMax 文本生成：调用 API
              const { generateText } = await import('@/lib/api/minimax-api');
              const { inputText, model, temperature, maxLength, systemPrompt } = node.data.params || {};
              if (!inputText) throw new Error('请输入文案');

              const messages: Array<{ role: string; content: string }> = [];
              if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
              messages.push({ role: 'user', content: inputText });

              const generatedText = await generateText({
                model: model || 'MiniMax-Text-01',
                messages,
                temperature: temperature ?? 0.7,
                maxTokens: maxLength ?? 1024,
              });

              result = { text: generatedText };
              break;
            }

            case 'nano_banana_2': {
              // NanoBanana2 图片生成
              const { generateNanoaiImageWithPolling } = await import('@/lib/api/suchuang-api');
              const { prompt, size, aspectRatio } = node.data.params || {};
              if (!prompt) throw new Error('请输入图片描述');

              const images = await generateNanoaiImageWithPolling({
                prompt,
                size: size || '1K',
                aspectRatio: aspectRatio || '1:1',
              });

              result = { imageUrl: images[0], images };
              break;
            }

            case 'gpt_image_2': {
              // GPT-Image-2 图片生成（支持文生图和溶图）
              const { generateGPTImageWithPolling } = await import('@/lib/api/gpt-image-api');
              const { prompt, size, aspectRatio, quality, referenceUrls } = node.data.params || {};
              if (!prompt) throw new Error('请输入图片描述');

              const images = await generateGPTImageWithPolling({
                prompt,
                size: size || 'auto',
                aspect_ratio: aspectRatio || '1:1',
                quality: quality || 'standard',
                urls: referenceUrls || [],  // 溶图参考图
              });

              result = { imageUrl: images[0], images };
              break;
            }

            case 'storyboard_generator': {
              // 分镜生成节点：从上游获取脚本数据
              const { edges } = get();
              const incomingEdge = edges.find(e => e.target === nodeId);
              let scriptText = node.data.params?.dataSource || '';

              if (incomingEdge) {
                const sourceNode = nodes.find(n => n.id === incomingEdge.source);
                const sourceResult = sourceNode?.data?.result;
                // 尝试从上游获取脚本文本
                if (sourceResult?.text) {
                  scriptText = sourceResult.text;
                }
              }

              // 构建提示词
              const prompt = buildPrompt(scriptText || 'storyboard scene', node.data.params?.style || 'realistic', {
                mood: 'cinematic',
                lighting: 'professional',
              });

              // 调用速创API生成
              const images = await generateNanoaiImageWithPolling({
                prompt,
                size: node.data.params?.quality === 'hd' ? '2K' : '1K',
                aspectRatio: node.data.params?.aspectRatio || '16:9',
              });

              result = { images, count: images.length, prompt };
              break;
            }

            case 'output_preview': {
              // 预览节点：从前置节点获取数据
              // 通过 edges 找到前驱节点的输出
              const { edges } = get();
              const incomingEdge = edges.find(e => e.target === nodeId);
              if (incomingEdge) {
                const sourceNode = nodes.find(n => n.id === incomingEdge.source);
                result = sourceNode?.data?.result || { message: '暂无数据' };
              }
              break;
            }

            case 'video_generator': {
              // 视频生成节点：从 storyboard_generator 获取图片
              const { edges } = get();
              const incomingEdge = edges.find(e => e.target === nodeId);
              if (incomingEdge) {
                const sourceNode = nodes.find(n => n.id === incomingEdge.source);
                const sourceResult = sourceNode?.data?.result;
                if (sourceResult?.images?.length) {
                  result = {
                    videoUrl: `blob:${Date.now()}`,
                    frameCount: sourceResult.images.length,
                    duration: node.data.params?.duration || 10,
                  };
                } else {
                  throw new Error('请先执行分镜生成节点');
                }
              } else {
                throw new Error('请连接分镜图片来源');
              }
              break;
            }

            case 'background_music': {
              // 背景音乐节点：模拟获取音乐
              result = {
                musicUrl: `https://example.com/music/${Date.now()}.mp3`,
                duration: node.data.params?.duration || 60,
                mood: node.data.params?.mood || 'calm',
              };
              break;
            }

            case 'transition': {
              // 转场节点：直接标记成功
              result = {
                transitionType: node.data.params?.transitionType || 'fade',
                duration: node.data.params?.duration || 500,
                easing: node.data.params?.easing || 'ease-in-out',
              };
              break;
            }

            case 'skills_data': {
              // Skills 数据输入节点：收集模板和表单数据
              const { templateCategory, templateId, templateName, dynamicParams } = node.data.params || {};
              if (!templateId) throw new Error('请先选择模板');

              result = {
                templateCategory,
                templateId,
                templateName,
                formData: dynamicParams || {},
              };
              break;
            }

            case 'skills_task': {
              // Skills 生成节点：从上游获取数据 → 调 API 生成图片 → 轮询结果
              const { edges: skillEdges } = get();
              const incomingSkillEdge = skillEdges.find(e => e.target === nodeId);
              if (!incomingSkillEdge) throw new Error('请连接数据输入节点');

              const dataSourceNode = nodes.find(n => n.id === incomingSkillEdge.source);
              const sourceData = dataSourceNode?.data?.result;
              if (!sourceData?.templateId) throw new Error('上游数据节点未执行或未选择模板');

              const rawPrompt = Object.entries(sourceData.formData || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');

              const { generateImage, getTaskStatus } = await import('@/lib/api/ai-skill');

              // 提交生成任务
              const genResp = await generateImage({
                template_id: sourceData.templateId,
                form_data: sourceData.formData || {},
                skill_id: 'gpt_image_2',
                size: node.data.params?.size || '1024x1024',
                quality: node.data.params?.quality || 'standard',
              });

              // 轮询任务状态（间隔 2s，超时 120s）
              const maxAttempts = 60;
              for (let i = 0; i < maxAttempts; i++) {
                if (get()._globalAbortController?.signal.aborted) break;
                await new Promise(r => setTimeout(r, 2000));
                if (get()._globalAbortController?.signal.aborted) break;
                const task = await getTaskStatus(genResp.task_id);

                if (task.status === 'completed' && task.result?.url) {
                  result = {
                    imageUrl: task.result.url,
                    images: [task.result.url],
                    prompt: rawPrompt || sourceData.templateName || '',
                    rawPrompt: rawPrompt || '',
                  };
                  break;
                }
                if (task.status === 'failed') {
                  throw new Error(task.error || '图片生成失败');
                }
                // 更新节点进度
                updateNode(nodeId, { status: NodeStatus.RUNNING, result: { progress: task.progress } });
              }
              if (get()._globalAbortController?.signal.aborted) break;
              if (!result?.imageUrl) throw new Error('生成超时，请重试');
              break;
            }

            case 'storyboard_shot_a': {
              // 故事板分镜V1版节点：从上游或自身获取文本 → 直接生图
              const { edges: shotEdges } = get();
              const incomingShotEdge = shotEdges.find(e => e.target === nodeId);
              let shotPrompt = node.data.params?.inputText || '';

              if (incomingShotEdge) {
                const shotSource = nodes.find(n => n.id === incomingShotEdge.source);
                const shotSourceResult = shotSource?.data?.result;
                if (shotSourceResult?.text) shotPrompt = shotSourceResult.text;
                else if (shotSourceResult?.copywriteText) shotPrompt = shotSourceResult.copywriteText;
              }

              if (!shotPrompt) throw new Error('请输入故事描述');

              const { generateImage: shotGenImage, getTaskStatus: shotGetStatus } = await import('@/lib/api/ai-skill');
              const shotResp = await shotGenImage({
                template_id: 'storyboards-cinematic',
                form_data: { story_logline: shotPrompt, grid_size: '3x4', cinematic_style: 'drama' },
                skill_id: 'gpt_image_2',
                size: node.data.params?.size || '1024x1024',
                quality: node.data.params?.quality || 'standard',
              });

              const shotMaxAttempts = 60;
              for (let i = 0; i < shotMaxAttempts; i++) {
                if (get()._globalAbortController?.signal.aborted) break;
                await new Promise(r => setTimeout(r, 2000));
                if (get()._globalAbortController?.signal.aborted) break;
                const shotTask = await shotGetStatus(shotResp.task_id);
                if (shotTask.status === 'completed' && (shotTask.result?.url || shotTask.result?.images?.length)) {
                  const images = shotTask.result?.images || (shotTask.result?.url ? [shotTask.result.url] : []);
                  result = {
                    imageUrl: images[0],
                    images,
                    prompt: shotPrompt,
                    rawPrompt: shotPrompt,
                  };
                  break;
                }
                if (shotTask.status === 'failed') throw new Error(shotTask.error || '分镜生成失败');
                updateNode(nodeId, { status: NodeStatus.RUNNING, result: { progress: shotTask.progress } });
              }
              if (get()._globalAbortController?.signal.aborted) break;
              if (!result?.imageUrl) throw new Error('生成超时，请重试');
              break;
            }

            case 'image_preview': {
              // 图片预览+输出节点（融合 output_node）：透传上游数据
              const { edges: previewEdges } = get();
              const incomingPreviewEdge = previewEdges.find(e => e.target === nodeId);
              const startedAt = new Date().toISOString();
              if (incomingPreviewEdge) {
                const srcNode = nodes.find(n => n.id === incomingPreviewEdge.source);
                result = srcNode?.data?.result || { message: '暂无数据' };
              } else {
                result = { message: '暂无数据' };
              }
              result = { ...result, startedAt, completedAt: new Date().toISOString() };
              break;
            }

            case 'output_node': {
              // 输出节点：透传上游数据，不执行保存/下载（由组件手动触发）
              const { edges: outputEdges } = get();
              const incomingOutputEdge = outputEdges.find(e => e.target === nodeId);
              if (incomingOutputEdge) {
                const srcNode = nodes.find(n => n.id === incomingOutputEdge.source);
                result = srcNode?.data?.result || { message: '暂无数据' };
              } else {
                result = { message: '暂无数据' };
              }
              break;
            }

            default:
              result = { message: `节点类型 ${nodeType} 暂未实现` };
          }

          // 被中止的节点跳过结果更新（stopExecution 已统一重置状态）
          if (!get()._globalAbortController?.signal.aborted) {
            updateNode(nodeId, {
              status: NodeStatus.SUCCESS,
              result,
            });
          }
        } catch (error) {
          // 中止不标记为错误
          if (get()._globalAbortController?.signal.aborted) return;
          updateNode(nodeId, {
            status: NodeStatus.ERROR,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      },

      executeWorkflow: async () => {
        const { nodes, edges } = get();
        const abortController = new AbortController();
        set({ isExecuting: true, executionLog: [], _globalAbortController: abortController });

        // 构建邻接表和入度
        const adjacency = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        nodes.forEach(node => {
          adjacency.set(node.id, []);
          inDegree.set(node.id, 0);
        });

        edges.forEach(edge => {
          if (adjacency.has(edge.source)) {
            adjacency.get(edge.source)!.push(edge.target);
          }
          inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        });

        const executeInParallel = async (nodeIds: string[]) => {
          await Promise.allSettled(nodeIds.map(nodeId => get().executeNode(nodeId)));
        };

        const queue: string[] = [];
        nodes.forEach(node => {
          if (inDegree.get(node.id) === 0) {
            queue.push(node.id);
          }
        });

        while (queue.length > 0) {
          if (abortController.signal.aborted) break;

          const currentBatch = [...queue];
          queue.length = 0;

          await executeInParallel(currentBatch);

          if (abortController.signal.aborted) break;

          currentBatch.forEach(nodeId => {
            const neighbors = adjacency.get(nodeId) || [];
            neighbors.forEach(neighborId => {
              const newDegree = (inDegree.get(neighborId) || 1) - 1;
              inDegree.set(neighborId, newDegree);
              if (newDegree === 0) {
                queue.push(neighborId);
              }
            });
          });
        }

        set({ isExecuting: false, _globalAbortController: null });
      },

      stopExecution: () => {
        const { _globalAbortController } = get();
        if (_globalAbortController) {
          _globalAbortController.abort();
        }
        // 通知所有节点组件终止任务
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workflow:abort-all'));
        }
        // 将所有 running 节点重置为 idle
        const { nodes: currentNodes } = get();
        const updatedNodes = currentNodes.map(n => {
          if (n.data.status !== 'running') return n
          const newData = { ...n.data, status: 'idle' as const, _stepInfo: undefined }
          return { ...n, data: newData }
        }) as typeof currentNodes;
        set({ isExecuting: false, nodes: updatedNodes, _globalAbortController: null });
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
        versions: state.versions,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
      merge: (persistedState, currentState) => {
        const stored = persistedState as Partial<typeof currentState>
        const storedTemplates: WorkflowTemplate[] = (stored as any)?.templates || []
        const userTemplates = storedTemplates.filter(
          (t) => !BUILT_IN_TEMPLATES.some((bt) => bt.id === t.id)
        )
        return {
          ...currentState,
          ...(stored as any),
          templates: [...BUILT_IN_TEMPLATES, ...userTemplates],
        }
      }
    }
  )
);
