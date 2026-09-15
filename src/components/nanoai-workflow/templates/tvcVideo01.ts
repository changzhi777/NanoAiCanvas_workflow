/**
 * TVC 视频 V1 模板 — 5 节点专业 TVC 广告视频生成
 *
 * 工作流步骤：
 * 1. 文案/剧本（minimax M3 多模态）
 *    → 2. 分镜+视频（速创 GPT-Image-2 + Hailuo/Seedance）
 *    → 2.5 BGM 上传（MiniMax Audio 弹窗 → dropzone）
 *    → 3. 视频合成（FFmpeg 串联镜头 + BGM 混音）
 *
 * 执行模式：分步执行 / 一键生成
 * 默认模型：minimax M3(剧本) + GPT-Image-2(图片) + Hailuo/Seedance(视频) + 用户上传(BGM)
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
  const startX = 80;
  const startY = 280;
  const nodeWidth = 280;
  const horizontalGap = 280;

  return [
    // ==================== 节点 1：文案/剧本 ====================
    {
      id: 'node-tvc-script',
      type: 'tvc_script',
      position: { x: startX, y: startY },
      data: {
        label: '① TVC 文案/剧本',
        params: {
          inputText: '',
          referenceImage: '',
          optimizeMode: 'tvc_deep',
          executionMode: 'auto' as string,
          totalDuration: 30,
          shotDuration: 5,
          shotCount: 6,
          style: 'realistic',
          quality: 'hd',
          temperature: 1.0,
          maxLength: 8192,
        },
        inputs: [],
        outputs: [
          { id: 'output-script', name: '剧本内容', type: 'text', required: false, description: '生成的 TVC 结构化脚本 JSON' },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 2：分镜+视频+BGM ====================
    {
      id: 'node-tvc-storyboard',
      type: 'storyboard_generator',
      position: { x: startX + nodeWidth + horizontalGap, y: startY },
      data: {
        label: '② 分镜+视频+BGM',
        params: {
          dataSource: '',
          style: 'realistic',
          aspectRatio: '16:9',
          quality: 'hd' as const,
          count: 6,
          referenceAssets: [] as string[],
          characterRefs: [] as any[],
          videoProvider: 'minimax',
          imageModel: 'gpt-image-2',
          videoModel: 'MiniMax-H3',
          videoDuration: 5,
          enableBgm: false,
          enableVoiceover: false,
          enableAssetSave: true,
        },
        inputs: [
          { id: 'text-in', name: '剧本内容', type: 'text', required: false, description: '从剧本节点获取 TVC 结构化脚本' },
        ],
        outputs: [
          { id: 'result-out', name: '视频+BGM', type: 'array', required: false, description: '逐镜头视频 + BGM' },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 2.5：BGM 上传 ====================
    {
      id: 'node-tvc-bgm',
      type: 'background_music',
      position: { x: startX + nodeWidth + horizontalGap, y: startY + 360 },
      data: {
        label: '②.5 背景音乐',
        params: {
          source: 'upload' as const,
          volume: 80,
          fadeIn: 2,
          fadeOut: 3,
        },
        inputs: [],
        outputs: [
          { id: 'output-bgm', name: 'BGM 文件', type: 'audio', required: false, description: '用户上传的 BGM（来自 MiniMax Audio）' },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 3：FFmpeg 合成整段视频 ====================
    {
      id: 'node-tvc-compose',
      type: 'storyboard_video',
      position: { x: startX + (nodeWidth + horizontalGap) * 2, y: startY },
      data: {
        label: '③ TVC 视频合成',
        params: {
          transition: 'fade',
          fadeDuration: 0.5,
          outputFormat: 'mp4',
          resolution: '720p',
          quality: 'standard',
          enableBgmMix: true,
          bgmVolume: 0.3,
          bgmFadeIn: 1.0,
          bgmFadeOut: 1.5,
        },
        inputs: [
          { id: 'input-videos', name: '镜头视频', type: 'array', required: true, description: '逐镜头视频列表' },
          { id: 'input-bgm', name: 'BGM', type: 'audio', required: false, description: '背景音乐' },
        ],
        outputs: [
          { id: 'output-video', name: 'TVC 完整视频', type: 'video', required: false, description: 'FFmpeg 合成的完整 TVC' },
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
      targetHandle: 'node-tvc-storyboard',
      type: 'smoothstep',
      animated: true,
      label: '脚本 JSON',
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelStyle: { fill: '#93c5fd', fontSize: 11, fontWeight: 600 },
      style: { stroke: '#3B82F6', strokeWidth: 2.5 },
    },
    {
      id: 'edge-tvc-storyboard-to-compose',
      source: 'node-tvc-storyboard',
      target: 'node-tvc-compose',
      sourceHandle: 'node-tvc-storyboard',
      targetHandle: 'video-in',
      type: 'smoothstep',
      animated: true,
      label: '视频 + BGM',
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelStyle: { fill: '#86efac', fontSize: 11, fontWeight: 600 },
      style: { stroke: '#3ecf8e', strokeWidth: 2.5 },
    },
    {
      id: 'edge-tvc-bgm-to-compose',
      source: 'node-tvc-bgm',
      target: 'node-tvc-compose',
      sourceHandle: 'output-bgm',
      targetHandle: 'input-bgm',
      type: 'smoothstep',
      animated: true,
      label: 'BGM',
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelStyle: { fill: '#fcd34d', fontSize: 11, fontWeight: 600 },
      style: { stroke: '#fbbf24', strokeWidth: 2 },
    },
  ];
};

export const tvcVideo01Template: TvcVideo01Template = {
  id: 'tvc-video-01',
  name: 'TVC视频V1',
  description: '5节点TVC广告视频：文案剧本(M3) → 分镜+视频(GPT-Image-2+Hailuo) → BGM上传(MiniMax Audio) → FFmpeg合成整段预览',
  category: 'story',
  tags: ['TVC', '视频', '广告', '3步流程', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: createTvcVideo01Nodes(),
  edges: createTvcVideo01Edges(),
};

export default tvcVideo01Template;
