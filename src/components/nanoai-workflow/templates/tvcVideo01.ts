/**
 * TVC 视频 V1 模板 — 3 节点专业 TVC 广告视频生成
 *
 * 工作流步骤：
 * 1. 文案/剧本生成（输入+参考图+提示词优化+剧本）
 *    → 2. 分镜头故事板（生成分镜图片：起始帧+结束帧）
 *    → 3. 视频+音频合成（线性调度逐镜头生成视频 + BGM）
 *
 * 执行模式：分步执行 / 一键生成
 * 默认模型：GLM-5.1(深度分析) + Seedance 2.0(视频) + MiniMax Music(BGM)
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

export interface TvcVideo01Template {
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

export const createTvcVideo01Nodes = (): WorkflowNode[] => {
  const startX = 100;
  const startY = 300;
  const nodeWidth = 280;
  const horizontalGap = 150;

  return [
    // ==================== 节点 1：文案/剧本（起始节点）====================
    {
      id: 'node-tvc-script',
      type: 'tvc_script',
      position: { x: startX, y: startY },
      data: {
        label: 'TVC 文案/剧本',
        params: {
          // 用户输入
          inputText: '',
          // 参考图
          referenceImage: "",
          // 模型选择（功能名，非模型名）
          optimizeMode: 'tvc_deep' as string,
          // 执行模式
          executionMode: 'auto' as string,
          // 级联参数
          totalDuration: 30,
          // 风格
          style: 'realistic',
          quality: 'hd',
          // 温度（GLM-5.1 thinking 模式固定 1.0）
          temperature: 1.0,
          maxLength: 8192,
        },
        inputs: [],
        outputs: [
          {
            id: 'output-script',
            name: '剧本内容',
            type: 'text',
            required: false,
            description: '生成的 TVC 结构化脚本 JSON',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 2：分镜头故事板 ====================
    {
      id: 'node-tvc-storyboard',
      type: 'storyboard_generator',
      position: { x: startX + nodeWidth + horizontalGap, y: startY },
      data: {
        label: '分镜头故事板',
        params: {
          // 图片生成参数
          style: '电影质感',
          aspectRatio: '16:9',
          quality: 'hd',
          // 由上游脚本驱动
          shotCount: 6,
        },
        inputs: [
          {
            id: 'input-script',
            name: '剧本内容',
            type: 'text',
            required: true,
            description: '从剧本节点获取 TVC 结构化脚本',
          },
        ],
        outputs: [
          {
            id: 'output-storyboard',
            name: '分镜图片',
            type: 'array',
            required: false,
            description: '每镜头起始帧+结束帧图片（共 shotCount×2 张）',
          },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 3：视频+音频合成 ====================
    {
      id: 'node-tvc-video',
      type: 'storyboard_video',
      position: { x: startX + (nodeWidth + horizontalGap) * 2, y: startY },
      data: {
        label: 'TVC 视频合成',
        params: {
          // 视频模型（默认 Seedance 2.0）
          apiProvider: 'jimeng',
          model: 'jimeng-video-01',
          duration: 5,
          resolution: '720p',
          aspectRatio: '16:9',
          // BGM
          enableBgm: true,
          bgmModel: 'music-2.6',
          // 输出
          enableDownload: true,
          enableAssetSave: true,
          // 资源保障
          maxRetry: 3,
          shotTimeout: 300000,
        },
        inputs: [
          {
            id: 'input-script',
            name: '剧本内容',
            type: 'text',
            required: true,
            description: '时间线 + 提示词',
          },
          {
            id: 'input-storyboard-frames',
            name: '分镜图片',
            type: 'array',
            required: true,
            description: '每镜头起始帧+结束帧图片',
          },
        ],
        outputs: [
          {
            id: 'output-video',
            name: 'TVC 视频',
            type: 'array',
            required: false,
            description: '逐镜头视频 + BGM',
          },
        ],
        status: 'idle' as any,
      },
    },
  ];
};

export const createTvcVideo01Edges = (): WorkflowEdge[] => {
  return [
    {
      id: 'edge-tvc-script-to-storyboard',
      source: 'node-tvc-script',
      target: 'node-tvc-storyboard',
      sourceHandle: 'output-script',
      targetHandle: 'input-script',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2 },
    },
    {
      id: 'edge-tvc-storyboard-to-video',
      source: 'node-tvc-storyboard',
      target: 'node-tvc-video',
      sourceHandle: 'output-storyboard',
      targetHandle: 'input-storyboard-frames',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
    },
  ];
};

export const tvcVideo01Template: TvcVideo01Template = {
  id: 'tvc-video-01',
  name: 'TVC视频V1',
  description: '3步TVC广告视频：文案剧本 → 分镜头故事板 → 视频合成(含BGM)',
  category: 'story',
  tags: ['TVC', '视频', '广告', '3步流程', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: createTvcVideo01Nodes(),
  edges: createTvcVideo01Edges(),
};

export default tvcVideo01Template;
