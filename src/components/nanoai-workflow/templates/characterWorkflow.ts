import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

/**
 * 角色设计工作流模板
 * 从文案到角色设计的完整流程
 */
export const characterWorkflowTemplate: {
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
  id: 'character-workflow',
  name: '角色设计工作流',
  description: '从文案到角色设计的完整流程',
  category: 'character',
  nodes: [
    {
      id: 'node-text-input-1',
      type: 'input_text',
      position: { x: 100, y: 200 },
      data: {
        label: '文案输入',
        params: {
          inputType: 'multiline',
          placeholder: '请输入角色背景描述...',
          maxLength: 2000,
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
      id: 'node-character-bg-1',
      type: 'script_generator',
      position: { x: 400, y: 200 },
      data: {
        label: '角色背景生成',
        params: {
          dataSource: '来自文本输入',
          style: 'character',
          length: 'short',
        },
        inputs: [
          { id: 'text-in', name: '文本', type: 'text', required: true }
        ],
        outputs: [
          { id: 'script-out', name: '角色背景', type: 'text', required: false }
        ],
        status: 'idle' as any
      }
    },
    {
      id: 'node-character-design-1',
      type: 'character_designer',
      position: { x: 700, y: 200 },
      data: {
        label: '角色设计',
        params: {
          characterInfo: '根据角色背景生成',
          style: 'anime',
          aspectRatio: '9:16',
          quality: 'hd',
          count: 4
        },
        inputs: [
          { id: 'script-in', name: '角色背景', type: 'text', required: true }
        ],
        outputs: [
          { id: 'character-out', name: '角色图', type: 'image', required: false }
        ],
        status: 'idle' as any
      }
    },
    {
      id: 'node-character-preview-1',
      type: 'output_preview',
      position: { x: 1000, y: 200 },
      data: {
        label: '角色预览',
        params: {
          previewType: 'image',
          autoPlay: false,
          showControls: true,
        },
        inputs: [
          { id: 'image-in', name: '角色图', type: 'image', required: true }
        ],
        outputs: [],
        status: 'idle' as any
      }
    }
  ],
  edges: [
    {
      id: 'edge-char-1',
      source: 'node-text-input-1',
      target: 'node-character-bg-1',
      sourceHandle: 'text-out',
      targetHandle: 'text-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    },
    {
      id: 'edge-char-2',
      source: 'node-character-bg-1',
      target: 'node-character-design-1',
      sourceHandle: 'script-out',
      targetHandle: 'script-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    },
    {
      id: 'edge-char-3',
      source: 'node-character-design-1',
      target: 'node-character-preview-1',
      sourceHandle: 'character-out',
      targetHandle: 'image-in',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      data: { type: 'auto' }
    }
  ],
  tags: ['角色', '设计', '完整流程', '4步流程', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
