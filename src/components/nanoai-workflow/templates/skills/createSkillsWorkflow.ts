import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore'

const NODE_WIDTH = 280
const HORIZONTAL_GAP = 180
const START_X = 100
const START_Y = 300

export interface SkillsWorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export function createSkillsWorkflow(
  id: string,
  name: string,
  description: string,
  category: string,
  tags: string[],
  nodeIds: {
    dataId: string
    taskId: string
    previewId: string
    outputId: string
  }
): SkillsWorkflowTemplate {
  return {
    id,
    name,
    description,
    category,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: nodeIds.dataId,
        type: 'skills_data',
        position: { x: START_X, y: START_Y },
        data: {
          label: '数据输入',
          params: {
            templateCategory: category,
            templateId: '',
            templateName: '',
            dynamicParams: {},
          },
          inputs: [],
          outputs: [
            { id: 'data-out', name: '数据', type: 'object', required: false }
          ],
          status: 'idle' as any,
        },
      },
      {
        id: nodeIds.taskId,
        type: 'skills_task',
        position: { x: START_X + NODE_WIDTH + HORIZONTAL_GAP, y: START_Y },
        data: {
          label: 'Skills 生成',
          params: {
            templateId: '',
            templateName: '',
            formData: {},
            size: '1024x1024',
            quality: 'standard',
          },
          inputs: [
            { id: 'data-in', name: '数据', type: 'object', required: true }
          ],
          outputs: [
            { id: 'result-out', name: '结果', type: 'image', required: false }
          ],
          status: 'idle' as any,
        },
      },
      {
        id: nodeIds.previewId,
        type: 'image_preview',
        position: { x: START_X + (NODE_WIDTH + HORIZONTAL_GAP) * 2, y: START_Y },
        data: {
          label: '图片预览',
          params: {
            autoConnectSource: true,
            sourceNodeId: nodeIds.taskId,
            thumbnailSize: 'medium' as const,
            gridColumns: 2 as const,
          },
          inputs: [
            { id: 'image-in', name: '图片', type: 'image', required: true }
          ],
          outputs: [
            { id: 'data-out', name: '数据', type: 'image', required: false }
          ],
          status: 'idle' as any,
        },
      },
      {
        id: nodeIds.outputId,
        type: 'output_node',
        position: { x: START_X + (NODE_WIDTH + HORIZONTAL_GAP) * 3, y: START_Y },
        data: {
          label: '输出/保存',
          params: {
            enableAssetSave: true,
            assetSaveScope: 'image_with_metadata',
            assetCategory: 'ai-generated',
            enableDownload: false,
            downloadFolder: 'NanoAI_Downloads',
            downloadNaming: 'timestamp',
            downloadCustomTemplate: '',
            downloadConflict: 'rename',
            includeUserInfo: true,
            includeTimestamp: true,
          },
          inputs: [
            { id: 'data-in', name: '数据', type: 'image', required: true }
          ],
          outputs: [],
          status: 'idle' as any,
        },
      },
    ],
    edges: [
      {
        id: `edge-${nodeIds.dataId}-${nodeIds.taskId}`,
        source: nodeIds.dataId,
        target: nodeIds.taskId,
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3ecf8e', strokeWidth: 2 },
        data: { type: 'auto' },
      },
      {
        id: `edge-${nodeIds.taskId}-${nodeIds.previewId}`,
        source: nodeIds.taskId,
        target: nodeIds.previewId,
        sourceHandle: 'result-out',
        targetHandle: 'image-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { type: 'auto' },
      },
      {
        id: `edge-${nodeIds.previewId}-${nodeIds.outputId}`,
        source: nodeIds.previewId,
        target: nodeIds.outputId,
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 },
        data: { type: 'auto' },
      },
    ],
  }
}
