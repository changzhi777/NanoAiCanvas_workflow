import { Image } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface NanoBanana2Data extends ApiTaskNodeData {
  params: {
    apiType: 'suchuang';
    action: 'image';
    prompt: string;
    size: '1K' | '2K' | '4K';
    aspectRatio: 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9';
    outputType: 'image';
  };
}

const IMAGE_SIZES = [
  { label: '1K（推荐）', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
];

const IMAGE_RATIOS = [
  { label: '自动', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

export const NanoBanana2Node = ({ id, data }: NodeProps<NanoBanana2Data>) => {
  const paramSchema = [
    {
      key: 'prompt',
      label: '图片描述',
      type: 'textarea' as const,
      placeholder: '请输入AI绘图提示词...',
      required: true,
    },
    {
      key: 'size',
      label: '图片尺寸',
      type: 'select' as const,
      options: IMAGE_SIZES,
      defaultValue: '1K',
    },
    {
      key: 'aspectRatio',
      label: '宽高比',
      type: 'select' as const,
      options: IMAGE_RATIOS,
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
        const { generateNanoaiImageWithPolling } = await import('@/lib/api/suchuang-api');
        return generateNanoaiImageWithPolling({
          prompt: params.prompt || '',
          size: (params.size || '1K') as '1K' | '2K' | '4K',
          aspectRatio: (params.aspectRatio || '1:1') as 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9',
        });
      }}
    />
  );
};

export default NanoBanana2Node;