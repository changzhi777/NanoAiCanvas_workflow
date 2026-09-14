/**
 * 故事板01 - 完整故事板生成工作流
 *
 * 工作流步骤：
 * 1. 文案输入 → 2. 剧本生成 → 3. 提取人物角色 → 4. 角色设计
 *    → 5. 场景生成 → 6. 分镜头故事板 → 7. 分镜头视频 → 8. 故事线编辑 → 9. 合成样品
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

export interface Storyboard01Template {
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
 * 创建故事板01模板的节点配置
 */
export const createStoryboard01Nodes = (): WorkflowNode[] => {
  // 节点布局配置（横向流式布局）
  const startX = 100;
  const startY = 300;
  const nodeWidth = 280;
  const horizontalGap = 100;
  const verticalGap = 150;

  return [
    // ==================== 节点1：文案输入 ====================
    {
      id: 'node-copywrite-input',
      type: 'input_text',
      position: { x: startX, y: startY },
      data: {
        label: '文案输入',
        params: {
          copywriteText: '',
        },
        inputs: [],
        outputs: [
          {
            id: 'output-copywrite',
            name: '文案内容',
            type: 'text',
            required: false,
            description: '输出的文案文本内容',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点2：剧本生成 ====================
    {
      id: 'node-script-generator',
      type: 'script_generator',
      position: { x: startX + nodeWidth + horizontalGap, y: startY },
      data: {
        label: '剧本生成',
        params: {
          genre: '电影',
          style: '现实主义',
          duration: '90分钟',
          theme: '成长',
        },
        inputs: [
          {
            id: 'input-copywrite',
            name: '文案内容',
            type: 'text',
            required: true,
            description: '从文案节点获取输入',
          },
        ],
        outputs: [
          {
            id: 'output-script',
            name: '剧本内容',
            type: 'text',
            required: false,
            description: '生成的剧本文本',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点3：提取人物角色 ====================
    {
      id: 'node-character-extractor',
      type: 'text_processor',
      position: { x: startX + (nodeWidth + horizontalGap) * 2, y: startY },
      data: {
        label: '提取人物角色',
        params: {
          extractMode: 'character',
          outputFormat: 'list',
        },
        inputs: [
          {
            id: 'input-script',
            name: '剧本内容',
            type: 'text',
            required: true,
            description: '从剧本中提取角色信息',
          },
        ],
        outputs: [
          {
            id: 'output-characters',
            name: '角色列表',
            type: 'json',
            required: false,
            description: '提取的角色信息JSON',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点4：角色设计 ====================
    {
      id: 'node-character-designer',
      type: 'character_designer',
      position: { x: startX + (nodeWidth + horizontalGap) * 3, y: startY - verticalGap },
      data: {
        label: '角色设计',
        params: {
          characterInfo: '',
          style: '写实风格',
          pose: '站立',
          expression: '微笑',
          background: '简单',
          viewAngle: '正面',
        },
        inputs: [
          {
            id: 'input-character-data',
            name: '角色信息',
            type: 'json',
            required: true,
            description: '从角色提取节点获取',
          },
        ],
        outputs: [
          {
            id: 'output-character-images',
            name: '角色设计图',
            type: 'image',
            required: false,
            description: '生成的角色设计图片',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点5：场景生成 ====================
    {
      id: 'node-scene-designer',
      type: 'scene_designer',
      position: { x: startX + (nodeWidth + horizontalGap) * 3, y: startY + verticalGap },
      data: {
        label: '场景生成',
        params: {
          sceneDescription: '',
          style: '写实摄影',
          timeOfDay: '早晨',
          weather: '晴朗',
          mood: '温馨',
          angle: '平视',
        },
        inputs: [
          {
            id: 'input-script-scene',
            name: '剧本场景描述',
            type: 'text',
            required: true,
            description: '从剧本获取场景信息',
          },
        ],
        outputs: [
          {
            id: 'output-scene-images',
            name: '场景设计图',
            type: 'image',
            required: false,
            description: '生成的场景设计图片',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点6：分镜头故事板 ====================
    {
      id: 'node-storyboard-generator',
      type: 'storyboard_generator',
      position: { x: startX + (nodeWidth + horizontalGap) * 4, y: startY },
      data: {
        label: '分镜头故事板',
        params: {
          dataSource: '',
          style: '写实风格',
          aspectRatio: '16:9',
          quality: 'hd',
          count: 6,
        },
        inputs: [
          {
            id: 'input-script-storyboard',
            name: '剧本内容',
            type: 'text',
            required: true,
            description: '从剧本获取分镜信息',
          },
          {
            id: 'input-character-ref',
            name: '角色参考',
            type: 'image',
            required: false,
            description: '角色设计参考图',
          },
          {
            id: 'input-scene-ref',
            name: '场景参考',
            type: 'image',
            required: false,
            description: '场景设计参考图',
          },
        ],
        outputs: [
          {
            id: 'output-storyboard',
            name: '分镜图片',
            type: 'array',
            required: false,
            description: '生成分镜图片数组',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点7：分镜头视频（预览节点） ====================
    {
      id: 'node-storyboard-video',
      type: 'output_preview',
      position: { x: startX + (nodeWidth + horizontalGap) * 5, y: startY - verticalGap / 2 },
      data: {
        label: '分镜头视频预览',
        params: {
          videoFormat: 'mp4',
          frameRate: 24,
          duration: 10,
        },
        inputs: [
          {
            id: 'input-storyboard-frames',
            name: '分镜图片',
            type: 'array',
            required: true,
            description: '从分镜节点获取图片',
          },
        ],
        outputs: [
          {
            id: 'output-video-preview',
            name: '视频预览',
            type: 'array',
            required: false,
            description: '视频预览帧序列',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点8：故事线编辑 ====================
    {
      id: 'node-storyline-editor',
      type: 'data_transformer',
      position: { x: startX + (nodeWidth + horizontalGap) * 6, y: startY },
      data: {
        label: '故事线编辑',
        params: {
          editMode: 'timeline',
          transitionEffect: 'fade',
          durationPerScene: 3,
        },
        inputs: [
          {
            id: 'input-storyline-data',
            name: '故事线数据',
            type: 'json',
            required: true,
            description: '完整的故事线数据',
          },
        ],
        outputs: [
          {
            id: 'output-edited-storyline',
            name: '编辑后故事线',
            type: 'json',
            required: false,
            description: '编辑后的故事线JSON',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点9：合成样品 ====================
    {
      id: 'node-final-export',
      type: 'output_export',
      position: { x: startX + (nodeWidth + horizontalGap) * 7, y: startY },
      data: {
        label: '合成样品',
        params: {
          exportFormat: 'mp4',
          resolution: '1920x1080',
          quality: 'high',
          includeAudio: true,
          includeSubtitles: true,
        },
        inputs: [
          {
            id: 'input-final-data',
            name: '最终数据',
            type: 'json',
            required: true,
            description: '所有合成数据',
          },
        ],
        outputs: [
          {
            id: 'output-final-file',
            name: '最终文件',
            type: 'json',
            required: false,
            description: '导出的文件信息',
          },
        ],
        status: 'idle' as any,
      },
    },
  ];
};

/**
 * 创建故事板01模板的连线配置
 */
export const createStoryboard01Edges = (): WorkflowEdge[] => {
  return [
    // 文案 → 剧本
    {
      id: 'edge-copywrite-to-script',
      source: 'node-copywrite-input',
      target: 'node-script-generator',
      sourceHandle: 'output-copywrite',
      targetHandle: 'input-copywrite',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 剧本 → 提取角色
    {
      id: 'edge-script-to-character-extractor',
      source: 'node-script-generator',
      target: 'node-character-extractor',
      sourceHandle: 'output-script',
      targetHandle: 'input-script',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 提取角色 → 角色设计
    {
      id: 'edge-character-extractor-to-designer',
      source: 'node-character-extractor',
      target: 'node-character-designer',
      sourceHandle: 'output-characters',
      targetHandle: 'input-character-data',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
    },

    // 剧本 → 场景生成
    {
      id: 'edge-script-to-scene',
      source: 'node-script-generator',
      target: 'node-scene-designer',
      sourceHandle: 'output-script',
      targetHandle: 'input-script-scene',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 剧本 → 分镜故事板
    {
      id: 'edge-script-to-storyboard',
      source: 'node-script-generator',
      target: 'node-storyboard-generator',
      sourceHandle: 'output-script',
      targetHandle: 'input-script-storyboard',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 角色设计 → 分镜故事板
    {
      id: 'edge-character-to-storyboard',
      source: 'node-character-designer',
      target: 'node-storyboard-generator',
      sourceHandle: 'output-character-images',
      targetHandle: 'input-character-ref',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
    },

    // 场景生成 → 分镜故事板
    {
      id: 'edge-scene-to-storyboard',
      source: 'node-scene-designer',
      target: 'node-storyboard-generator',
      sourceHandle: 'output-scene-images',
      targetHandle: 'input-scene-ref',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
    },

    // 分镜故事板 → 分镜头视频
    {
      id: 'edge-storyboard-to-video',
      source: 'node-storyboard-generator',
      target: 'node-storyboard-video',
      sourceHandle: 'output-storyboard',
      targetHandle: 'input-storyboard-frames',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 分镜头视频 → 故事线编辑
    {
      id: 'edge-video-to-editor',
      source: 'node-storyboard-video',
      target: 'node-storyline-editor',
      sourceHandle: 'output-video-preview',
      targetHandle: 'input-storyline-data',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },

    // 故事线编辑 → 合成样品
    {
      id: 'edge-editor-to-export',
      source: 'node-storyline-editor',
      target: 'node-final-export',
      sourceHandle: 'output-edited-storyline',
      targetHandle: 'input-final-data',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
    },
  ];
};

/**
 * 故事板01完整模板
 */
export const storyboard01Template: Storyboard01Template = {
  id: 'storyboard-01',
  name: '故事板01',
  description: '完整的故事板生成工作流：文案→剧本→角色→场景→分镜→视频→编辑→合成',
  category: 'story',
  nodes: createStoryboard01Nodes(),
  edges: createStoryboard01Edges(),
  tags: ['完整流程', '故事板', '专业', '9步流程', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default storyboard01Template;
