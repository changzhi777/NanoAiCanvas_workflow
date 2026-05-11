'use client'

import { Image } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface GPTImage2Data extends ApiTaskNodeData {
  params: {
    apiType: 'gpt';
    action: 'image';
    prompt: string;
    size: string;
    aspectRatio: string;
    quality: 'standard' | 'hd';
    referenceUrls: string[];
    outputType: 'image';
  };
}

const IMAGE_SIZES = [
  { label: 'auto', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '3:2', value: '3:2' },
  { label: '2:3', value: '2:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '21:9', value: '21:9' },
  { label: '9:21', value: '9:21' },
  { label: '1:3', value: '1:3' },
  { label: '3:1', value: '3:1' },
  { label: '2:1', value: '2:1' },
  { label: '1:2', value: '1:2' },
];

const IMAGE_QUALITIES = [
  { label: '标准', value: 'standard' },
  { label: '高清', value: 'hd' },
];

export const GPTImage2Node = ({ id, data }: NodeProps<GPTImage2Data>) => {
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
      label: '图片比例',
      type: 'select' as const,
      options: IMAGE_SIZES,
      defaultValue: 'auto',
    },
    {
      key: 'quality',
      label: '图片质量',
      type: 'select' as const,
      options: IMAGE_QUALITIES,
      defaultValue: 'standard',
    },
    {
      key: 'referenceUrls',
      label: '参考图URL（溶图）',
      type: 'textarea' as const,
      placeholder: '每行一个URL，用于溶图模式',
      description: '留空为文生图，填入URL为溶图模式',
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Image className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateGPTImageWithPolling } = await import('@/lib/api/gpt-image-api');
        const urls = params.referenceUrls?.length ? params.referenceUrls : [];
        return generateGPTImageWithPolling({
          prompt: params.prompt!,
          size: params.size || 'auto',
          aspect_ratio: params.aspectRatio || '1:1',
          quality: params.quality || 'standard',
          urls,
        });
      }}
    />
  );
};

export default GPTImage2Node;