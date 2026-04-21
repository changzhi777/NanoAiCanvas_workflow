import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

/**
 * 场景设计工作流模板
 * 快速创建场景设计图
 */
export const sceneWorkflowTemplate: {
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
  id: 'scene-workflow',
  name: '场景设计工作流',
  description: '快速创建场景设计图',
  category: 'scene',
  nodes: [
    {
      id: 'node-text-input-2',
      type: 'input_text',
      position: { x: 100, y: 200 },
      data: {
        label: '场景描述',
        params: {
          inputType: 'multiline',
          placeholder: '请输入场景描述...',
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
      id: 'node-scene-design-1',
      type: 'scene_designer',
      position: { x: 400, y: 200 },
      data: {
        label: '场景设计',
        params: {
          sceneInfo: '根据场景描述生成',
          style: 'realistic',
          aspectRatio: '16:9',
          quality: 'hd',
          count: 4
        },
        inputs: [
          { id: 'text-in', name: '场景描述', type: 'text', required: true }
        ],
        outputs: [
          { id: 'scene-out', name: '场景图', type: 'image', required: false }
        ],
        status: 'idle' as any
      }
    },
    {
      id: 'node-scene-preview-1',
      type: 'output_preview',
      position: { x: 700, y: 200 },
      data: {
        label: '场景预览',
        params: {
          previewType: 'image',
          autoPlay: false,
          showControls: true,
        },
        inputs: [
          { id: 'image-in', name: '场景图', type: 'image', required: true }
        ],
        outputs: [],
        status: 'idle' as any
      }
    }
  ],
  edges: [
    {
      id: 'edge-scene-1',
      source: 'node-text-input-2',
      target: 'node-scene-design-1',
      sourceHandle: 'text-out',
      targetHandle: 'text-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    },
    {
      id: 'edge-scene-2',
      source: 'node-scene-design-1',
      target: 'node-scene-preview-1',
      sourceHandle: 'scene-out',
      targetHandle: 'image-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    }
  ],
  tags: ['场景', '快速', '3步流程', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
