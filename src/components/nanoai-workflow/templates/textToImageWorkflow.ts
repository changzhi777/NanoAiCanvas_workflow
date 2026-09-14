/**
 * 双线角色设计工作流
 *
 * 工作流结构：
 * 文本输入 → 提示词优化 → 并行分支
 *                        ├── NanoBanana2 → 预览
 *                        └── GPT-Image-2 → 预览
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

export interface TextToImageWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建双线角色设计节点配置
 */
export const createTextToImageNodes = (): WorkflowNode[] => {
  const startX = 100;
  const startY = 300;
  const nodeWidth = 280;
  const horizontalGap = 150;
  const verticalGap = 180;

  return [
    // ==================== 节点1：文本输入 ====================
    {
      id: 'node-text-input',
      type: 'input_text',
      position: { x: startX, y: startY },
      data: {
        label: '角色描述输入',
        params: {
          copywriteText: '三视图+脸部特写：正面、侧面、背面三个角度的完整人物形象，加上脸部微笑特写',
        },
        inputs: [],
        outputs: [
          { id: 'output-text', name: '文本内容', type: 'text', required: false },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点2：提示词优化 ====================
    {
      id: 'node-prompt-optimizer',
      type: 'minimax_text',
      position: { x: startX + nodeWidth + horizontalGap, y: startY },
      data: {
        label: '提示词优化',
        params: {
          inputText: '',
          model: 'MiniMax-Text-01',
          temperature: 0.7,
          maxLength: 1024,
          systemPrompt: '你是一个提示词优化专家，将用户的简短描述扩展成详细的AI绘图提示词，包含人物特征、表情、姿态、服装、背景等细节。保持描述专业、详细，适合图像生成模型使用。输出格式为纯文本提示词。',
        },
        inputs: [
          { id: 'input-text', name: '文本输入', type: 'text', required: true },
        ],
        outputs: [
          { id: 'output-optimized-prompt', name: '优化后提示词', type: 'text', required: false },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点3：NanoBanana2 图片生成 ====================
    {
      id: 'node-nano-banana',
      type: 'nano_banana_2',
      position: { x: startX + (nodeWidth + horizontalGap) * 2, y: startY - verticalGap },
      data: {
        label: 'NanoBanana2 生成',
        params: {
          prompt: '',
          size: '1K',
          aspectRatio: '1:1',
        },
        inputs: [
          { id: 'input-prompt', name: '提示词', type: 'text', required: true },
        ],
        outputs: [
          { id: 'output-image', name: '生成图片', type: 'image', required: false },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点4：GPT-Image-2 图片生成 ====================
    {
      id: 'node-gpt-image',
      type: 'gpt_image_2',
      position: { x: startX + (nodeWidth + horizontalGap) * 2, y: startY + verticalGap },
      data: {
        label: 'GPT-Image-2 生成',
        params: {
          prompt: '',
          size: '1K',
          aspectRatio: '1:1',
          quality: 'standard',
        },
        inputs: [
          { id: 'input-prompt', name: '提示词', type: 'text', required: true },
        ],
        outputs: [
          { id: 'output-image', name: '生成图片', type: 'image', required: false },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点5：NanoBanana2 预览 ====================
    {
      id: 'node-nano-preview',
      type: 'output_preview',
      position: { x: startX + (nodeWidth + horizontalGap) * 3, y: startY - verticalGap },
      data: {
        label: 'NanoBanana2 预览',
        params: {
          sourceType: 'image',
          compareMode: true,
        },
        inputs: [
          { id: 'input-image', name: '图片输入', type: 'image', required: true },
        ],
        outputs: [],
        status: 'idle' as any,
      },
    },

    // ==================== 节点6：GPT-Image-2 预览 ====================
    {
      id: 'node-gpt-preview',
      type: 'output_preview',
      position: { x: startX + (nodeWidth + horizontalGap) * 3, y: startY + verticalGap },
      data: {
        label: 'GPT-Image-2 预览',
        params: {
          sourceType: 'image',
          compareMode: true,
        },
        inputs: [
          { id: 'input-image', name: '图片输入', type: 'image', required: true },
        ],
        outputs: [],
        status: 'idle' as any,
      },
    },
  ];
};

/**
 * 创建连线配置
 */
export const createTextToImageEdges = (): WorkflowEdge[] => {
  return [
    // 文本输入 → 提示词优化
    {
      id: 'edge-text-to-prompt',
      source: 'node-text-input',
      target: 'node-prompt-optimizer',
      sourceHandle: 'output-text',
      targetHandle: 'input-text',
      type: 'bezier',
      animated: true,
      style: { stroke: '#168 70% 45%', strokeWidth: 2 },
    },

    // 提示词优化 → NanoBanana2
    {
      id: 'edge-prompt-to-nano',
      source: 'node-prompt-optimizer',
      target: 'node-nano-banana',
      sourceHandle: 'output-optimized-prompt',
      targetHandle: 'input-prompt',
      type: 'bezier',
      animated: true,
      style: { stroke: '#168 80% 55%', strokeWidth: 2 },
    },

    // 提示词优化 → GPT-Image-2
    {
      id: 'edge-prompt-to-gpt',
      source: 'node-prompt-optimizer',
      target: 'node-gpt-image',
      sourceHandle: 'output-optimized-prompt',
      targetHandle: 'input-prompt',
      type: 'bezier',
      animated: true,
      style: { stroke: '#168 80% 55%', strokeWidth: 2 },
    },

    // NanoBanana2 → 预览
    {
      id: 'edge-nano-to-preview',
      source: 'node-nano-banana',
      target: 'node-nano-preview',
      sourceHandle: 'output-image',
      targetHandle: 'input-image',
      type: 'bezier',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
    },

    // GPT-Image-2 → 预览
    {
      id: 'edge-gpt-to-preview',
      source: 'node-gpt-image',
      target: 'node-gpt-preview',
      sourceHandle: 'output-image',
      targetHandle: 'input-image',
      type: 'bezier',
      animated: true,
      style: { stroke: '#F59E0B', strokeWidth: 2 },
    },
  ];
};

export const textToImageWorkflowTemplate: TextToImageWorkflowTemplate = {
  id: 'dual-line-character-design',
  name: '双线角色设计',
  description: '文本输入+提示词优化，双线并行生图对比预览',
  category: 'image',
  tags: ['文生图', '角色设计', '双线并行', '对比'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: createTextToImageNodes(),
  edges: createTextToImageEdges(),
};

export default textToImageWorkflowTemplate;
