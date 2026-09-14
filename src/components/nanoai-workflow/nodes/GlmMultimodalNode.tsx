import { Layers } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface GlmMultimodalData extends ApiTaskNodeData {
  params: {
    apiType: 'glm';
    action: 'multimodal';
    inputText: string;
    model: string;
    imageUrl?: string;
    temperature: number;
    maxLength: number;
    outputType: 'text';
  };
}

const MULTIMODAL_MODELS = [
  { label: 'GLM-4V（推荐）', value: 'glm-4v' },
  { label: 'GLM-4V-Plus', value: 'glm-4v-plus' },
];

export const GlmMultimodalNode = ({ id, data }: NodeProps<GlmMultimodalData>) => {
  const paramSchema = [
    {
      key: 'inputText',
      label: '输入内容',
      type: 'textarea' as const,
      placeholder: '请输入问题或指令...',
      required: true,
    },
    {
      key: 'imageUrl',
      label: '图片URL',
      type: 'text' as const,
      placeholder: '可选：输入图片URL进行多模态理解...',
      required: false,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: MULTIMODAL_MODELS,
      defaultValue: 'glm-4v',
    },
    {
      key: 'temperature',
      label: '创意程度',
      type: 'number' as const,
      defaultValue: 0.7,
      min: 0,
      max: 1,
    },
    {
      key: 'maxLength',
      label: '最大长度',
      type: 'number' as const,
      defaultValue: 1024,
      min: 256,
      max: 8192,
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Layers className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateMultimodal } = await import('@/lib/api/glm-api');
        const messages: Array<{ role: string; content: string | { type: string; image?: string; text?: string } }> = [];

        let content: string | { type: string; image?: string; text?: string };
        if (params.imageUrl) {
          content = {
            type: 'image_url',
            image: params.imageUrl,
            text: params.inputText || '',
          };
        } else {
          content = params.inputText || '';
        }

        messages.push({ role: 'user', content });
        return generateMultimodal({
          model: params.model || 'glm-4v',
          messages,
          temperature: params.temperature ?? 0.7,
          maxTokens: params.maxLength ?? 1024,
        });
      }}
    />
  );
};

export default GlmMultimodalNode;