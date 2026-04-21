import { useCallback, useState } from 'react';
import { Film, Wand2 } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import {
  generateNanoaiImageWithPolling,
  buildStoryboardPrompt,
} from '@/lib/api/suchuang-api';

export interface StoryboardGeneratorData extends WorkflowNodeData {
  params: {
    dataSource: string;  // 数据源选择
    style: string;
    aspectRatio: string;
    quality: 'standard' | 'hd';
    count: number;
  };
}

const STORYBOARD_STYLES = [
  { label: '写实风格', value: 'realistic' },
  { label: '动漫风格', value: 'anime' },
  { label: '水彩风格', value: 'watercolor' },
  { label: '油画风格', value: 'oilpainting' },
  { label: '3D渲染', value: '3d' },
];

const ASPECT_RATIOS = [
  { label: '16:9（横屏）', value: '16:9' },
  { label: '9:16（竖屏）', value: '9:16' },
  { label: '4:3（标准）', value: '4:3' },
  { label: '1:1（方形）', value: '1:1' },
];

const QUALITIES = [
  { label: '标清', value: 'standard' },
  { label: '高清', value: 'hd' },
];

export const StoryboardGeneratorNode = ({ id, data }: NodeProps<StoryboardGeneratorData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore();
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // 使用真实API调用的执行逻辑
  const handleExecute = useCallback(async () => {
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined });
      setProgress(0);
      setProgressMessage('准备生成...');

      // 构建提示词
      const prompt = buildStoryboardPrompt(
        data.params.dataSource || 'storyboard scene',
        data.params.style,
        {
          mood: 'cinematic',
          lighting: 'professional',
        }
      );

      // 调用速创API
      const images = await generateNanoaiImageWithPolling(
        {
          prompt,
          size: data.params.quality === 'hd' ? '2K' : '1K',
          aspectRatio: data.params.aspectRatio as any,
        },
        (message, progress) => {
          setProgressMessage(message);
          setProgress(progress);
        }
      );

      // 更新节点状态
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          images,
          count: images.length,
        },
      });
      setProgress(100);
      setProgressMessage('生成完成！');
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '生成失败',
      });
      setProgress(0);
      setProgressMessage('');
    }
  }, [id, data, updateNode]);

  const paramSchema = [
    {
      key: 'dataSource',
      label: '场景描述',
      type: 'text' as const,
      placeholder: '请描述要生成的场景...',
      description: '从上游节点获取脚本数据，或手动输入场景描述',
    },
    {
      key: 'style',
      label: '风格',
      type: 'select' as const,
      options: STORYBOARD_STYLES,
      defaultValue: 'realistic',
    },
    {
      key: 'aspectRatio',
      label: '宽高比',
      type: 'select' as const,
      options: ASPECT_RATIOS,
      defaultValue: '16:9',
    },
    {
      key: 'quality',
      label: '质量',
      type: 'select' as const,
      options: QUALITIES,
      defaultValue: 'hd',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  return (
    <BaseNode
      data={data}
      icon={<Film className="w-5 h-5" />}
      headerAction={
        <button className="p-1 hover:bg-white/50 rounded transition-colors" title="配置">
          <Wand2 className="w-4 h-4 text-blue-600" />
        </button>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="生成分镜" />

      {/* 进度显示 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">{progressMessage}</span>
            <span className="text-sm text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {data.result && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-2">✓ 分镜生成成功</div>
          <div className="grid grid-cols-3 gap-2">
            {data.result.images?.slice(0, 3).map((img: string, i: number) => (
              <img key={i} src={img} alt={`分镜${i + 1}`} className="rounded" />
            ))}
          </div>
        </div>
      )}
    </BaseNode>
  );
};

export default StoryboardGeneratorNode;
