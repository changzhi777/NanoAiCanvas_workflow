import { Video } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface JimengVideoData extends ApiTaskNodeData {
  params: {
    apiType: 'jimeng';
    action: 'video';
    prompt: string;
    model: string;
    duration: number;
    resolution: '720p' | '1080p';
    outputType: 'video';
  };
}

const DURATION_OPTIONS = [
  { label: '5秒', value: '5' },
  { label: '6秒', value: '6' },
  { label: '10秒', value: '10' },
];

const RESOLUTION_OPTIONS = [
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
];

export const JimengVideoNode = ({ id, data }: NodeProps<JimengVideoData>) => {
  const paramSchema = [
    {
      key: 'prompt',
      label: '视频描述',
      type: 'textarea' as const,
      placeholder: '请描述你想要生成的视频...',
      required: true,
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'select' as const,
      options: DURATION_OPTIONS,
      defaultValue: 6,
    },
    {
      key: 'resolution',
      label: '分辨率',
      type: 'select' as const,
      options: RESOLUTION_OPTIONS,
      defaultValue: '1080p',
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Video className="w-5 h-5" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateVideo, pollVideoResult } = await import('@/lib/api/jimeng-api');
        const requestId = await generateVideo({
          prompt: params.prompt || '',
          duration: params.duration,
          resolution: params.resolution as '720p' | '1080p',
        });
        return pollVideoResult(requestId);
      }}
    />
  );
};

export default JimengVideoNode;