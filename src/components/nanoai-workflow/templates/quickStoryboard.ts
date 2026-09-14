import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

/**
 * 快速分镜工作流模板
 * 3步快速生成分镜图片
 */
export const quickStoryboardTemplate: {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
} = {
  id: 'quick-storyboard',
  name: '快速分镜',
  description: '3步快速生成分镜图片',
  category: 'storyboard',
  nodes: [
    {
      id: 'node-text-input-3',
      type: 'input_text',
      position: { x: 100, y: 200 },
      data: {
        label: '场景描述',
        params: {
          inputType: 'multiline',
          placeholder: '请输入分镜场景描述...',
          maxLength: 1000,
          defaultValue: '',
        },
        inputs: [],
        outputs: [
          { id: 'text-out', name: '文本', type: 'text', required: false }
        ],
        status: 'idle' as any
      }
    },
    {
      id: 'node-storyboard-quick-1',
      type: 'storyboard_generator',
      position: { x: 400, y: 200 },
      data: {
        label: '分镜生成',
        params: {
          dataSource: '来自场景描述',
          style: 'anime',
          aspectRatio: '16:9',
          quality: 'standard',
          count: 6
        },
        inputs: [
          { id: 'text-in', name: '场景描述', type: 'text', required: true }
        ],
        outputs: [
          { id: 'images-out', name: '分镜图', type: 'image', required: false }
        ],
        status: 'idle' as any
      }
    },
    {
      id: 'node-preview-quick-1',
      type: 'output_preview',
      position: { x: 700, y: 200 },
      data: {
        label: '分镜预览',
        params: {
          previewType: 'image',
          autoPlay: true,
          showControls: true,
        },
        inputs: [
          { id: 'images-in', name: '分镜图', type: 'image', required: true }
        ],
        outputs: [],
        status: 'idle' as any
      }
    }
  ],
  edges: [
    {
      id: 'edge-quick-1',
      source: 'node-text-input-3',
      target: 'node-storyboard-quick-1',
      sourceHandle: 'text-out',
      targetHandle: 'text-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    },
    {
      id: 'edge-quick-2',
      source: 'node-storyboard-quick-1',
      target: 'node-preview-quick-1',
      sourceHandle: 'images-out',
      targetHandle: 'images-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    }
  ],
  tags: ['快速', '分镜', '推荐', '3步流程'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
