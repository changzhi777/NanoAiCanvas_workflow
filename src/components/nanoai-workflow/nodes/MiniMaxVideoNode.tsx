import { Video } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface MiniMaxVideoData extends ApiTaskNodeData {
  params: {
    apiType: 'minimax';
    action: 'video';
    prompt: string;
    model: 'hailuo-2.3-fast-768P' | 'hailuo-2.3-768P';
    duration: number;
    outputType: 'video';
  };
}

const VIDEO_MODELS = [
  { label: 'Hailuo-2.3-Fast-768P（推荐）', value: 'hailuo-2.3-fast-768P' },
  { label: 'Hailuo-2.3-768P（标准）', value: 'hailuo-2.3-768P' },
];

export const MiniMaxVideoNode = ({ id, data }: NodeProps<MiniMaxVideoData>) => {
  const paramSchema = [
    {
      key: 'prompt',
      label: '视频描述',
      type: 'textarea' as const,
      placeholder: '请描述视频内容：如"夕阳下，一只猫坐在窗边望向远方"...',
      required: true,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: VIDEO_MODELS,
      defaultValue: 'hailuo-2.3-fast-768P',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'number' as const,
      defaultValue: 6,
      min: 3,
      max: 10,
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Video className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateVideo } = await import('@/lib/api/minimax-api');
        return generateVideo({
          prompt: params.prompt!,
          model: params.model || 'hailuo-2.3-fast-768P',
          duration: params.duration || 6,
        });
      }}
    />
  );
};

export default MiniMaxVideoNode;