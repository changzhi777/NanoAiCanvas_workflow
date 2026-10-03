/**
 * KFC TVC 一镜到底模板 — 吃货哥 IP 系列专用
 *
 * 预置参数对齐客户 Brief 标准：
 * - 一镜到底（shotCount=1，15s 竖屏 9:16）
 * - 生图 GPT-Image-2.5-flare（720*1280）+ 视频 MiniMax H3（4-15s 全时长）
 * - 剧本 DeepSeek-V4-Pro（重），优化 DeepSeek-Flash（轻）
 * - 验收标准审查闸：节点右上「验收」按钮导入飞书 Brief → 剧本闸+成片闸双审查
 *
 * 使用流程：
 * 1. 点节点「验收」按钮 → 粘贴飞书 Brief 分享链接 → 选条目关联标准集
 * 2. 输入创意（或直接用 Brief 情节描述）→ 一键生成
 * 3. 完成后节点内播放器下方出现验收报告卡（百分比/冲突点/接受/单步重做/客户版导出）
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

export interface KfcTvcTemplate {
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

const KFC_PLACEHOLDER_PROMPT = `【示例·可替换】肯德基十翅一桶×三体宇宙联名 15秒竖屏TVC：
天体研究院场景，Q版吃货哥（天体研究员风格、深蓝制服+研究院工牌）面对宇宙级疑问，
镜头拉回现实拿起鸡翅："而我，只想知道今天这桶够不够我吃。"
肯德基×三体宇宙，探索美味新宇宙。39.9元十翅一桶，薄脆金沙翅首次加入翅桶。结尾KV定格。
（正式投放请点「验收」导入飞书 Brief，标准集自动驱动审查与竖屏）`;

export const createKfcTvcNodes = (): WorkflowNode[] => {
  const startX = 80;
  const startY = 280;
  const nodeWidth = 280;
  const horizontalGap = 280;

  return [
    // ==================== 节点 1：文案/剧本（一镜到底 + 验收闸） ====================
    {
      id: 'node-kfc-script',
      type: 'tvc_script',
      position: { x: startX, y: startY },
      data: {
        label: '① KFC TVC 一镜到底',
        params: {
          inputText: KFC_PLACEHOLDER_PROMPT,
          referenceImage: '',
          productImage: '',
          optimizeMode: 'tvc_deep',
          executionMode: 'auto' as string,
          // 一镜到底：单段 15s 竖屏
          shotCount: 1,
          shotDuration: 15,
          totalDuration: 15,
          oneShot: true,
          style: 'realistic',
          quality: 'hd',
          temperature: 1.0,
          maxLength: 8192,
          // KFC 定版模型组合（2026-09-30 模型审计结论）
          imageModel: 'gpt-image-2.5-flare',
          videoModel: 'MiniMax-H3',
          scriptModel: 'deepseek-v4-pro',
          optimizeModel: 'deepseek-flash',
          cameraMovement: 'push-in',
          lightStyle: 'golden_hour',
          negativePrompts: ['avoid_jitter', 'avoid_bent_limbs'],
        },
        inputs: [],
        outputs: [
          { id: 'output-script', name: '剧本内容', type: 'text', required: false, description: '生成的 TVC 结构化脚本 JSON' },
        ],
        status: 'idle' as any,
      },
    },

    // ==================== 节点 2：分镜+视频+BGM（分步模式备用，一镜到底自动折叠） ====================
    {
      id: 'node-kfc-storyboard',
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
          imageModel: 'gpt-image-2.5-flare',
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
  ];
};

export const createKfcTvcEdges = (): WorkflowEdge[] => {
  return [
    {
      id: 'edge-kfc-script-to-storyboard',
      source: 'node-kfc-script',
      target: 'node-kfc-storyboard',
      sourceHandle: 'output-script',
      targetHandle: 'node-kfc-storyboard',
      type: 'smoothstep',
      animated: true,
      label: '脚本 JSON',
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelStyle: { fill: '#93c5fd', fontSize: 11, fontWeight: 600 },
      style: { stroke: '#3B82F6', strokeWidth: 2.5 },
    },
  ];
};

export const kfcTvcTemplate: KfcTvcTemplate = {
  id: 'kfc-tvc-oneshot',
  name: 'KFC TVC 一镜到底',
  description: 'KFC吃货哥IP专用：15s竖屏9:16一镜到底（H3全时长）+ 飞书Brief导入验收双闸（剧本/成片审查+百分比报告+单步重做）。流程：点节点「验收」导Brief → 一键生成 → 报告卡验收',
  category: 'story',
  tags: ['KFC', 'TVC', '一镜到底', '9:16竖屏', '验收审查', '推荐'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: createKfcTvcNodes(),
  edges: createKfcTvcEdges(),
};

export default kfcTvcTemplate;
