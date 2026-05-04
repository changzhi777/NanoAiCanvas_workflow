import { Image } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface JimengImageData extends ApiTaskNodeData {
  params: {
    apiType: 'jimeng';
    action: 'image';
    prompt: string;
    model: string;
    size: string;
    aspectRatio: string;
    outputType: 'image';
  };
}

const SIZE_OPTIONS = [
  { label: '1K (1024x1024)', value: '1K' },
  { label: '2K (2048x2048)', value: '2K' },
  { label: '4K (4096x4096)', value: '4K' },
];

const ASPECT_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

export const JimengImageNode = ({ id, data }: NodeProps<JimengImageData>) => {
  const paramSchema = [
    {
      key: 'prompt',
      label: '图片描述',
      type: 'textarea' as const,
      placeholder: '请描述你想要生成的图片...',
      required: true,
    },
    {
      key: 'size',
      label: '图片尺寸',
      type: 'select' as const,
      options: SIZE_OPTIONS,
      defaultValue: '1K',
    },
    {
      key: 'aspectRatio',
      label: '图片比例',
      type: 'select' as const,
      options: ASPECT_OPTIONS,
      defaultValue: '1:1',
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Image className="w-5 h-5" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateImage } = await import('@/lib/api/jimeng-api');
        return generateImage({
          prompt: params.prompt || '',
          size: params.size,
          aspectRatio: params.aspectRatio,
        });
      }}
    />
  );
};

export default JimengImageNode;