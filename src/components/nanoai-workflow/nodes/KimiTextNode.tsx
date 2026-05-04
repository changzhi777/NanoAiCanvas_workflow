import { MessageSquare } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface KimiTextData extends ApiTaskNodeData {
  params: {
    apiType: 'kimi';
    action: 'text';
    inputText: string;
    model: string;
    temperature: number;
    maxLength: number;
    systemPrompt?: string;
    outputType: 'text';
  };
}

const TEXT_MODELS = [
  { label: 'Moonshot-V1-8K（推荐）', value: 'moonshot-v1-8k' },
  { label: 'Moonshot-V1-32K', value: 'moonshot-v1-32k' },
  { label: 'Moonshot-V1-128K', value: 'moonshot-v1-128k' },
];

export const KimiTextNode = ({ id, data }: NodeProps<KimiTextData>) => {
  const paramSchema = [
    {
      key: 'inputText',
      label: '输入文案',
      type: 'textarea' as const,
      placeholder: '请输入问题或创作需求...',
      required: true,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: TEXT_MODELS,
      defaultValue: 'moonshot-v1-8k',
    },
    {
      key: 'systemPrompt',
      label: '系统提示词',
      type: 'textarea' as const,
      placeholder: '可选：设置AI角色或行为约束...',
      required: false,
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
      icon={<MessageSquare className="w-5 h-5" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateText } = await import('@/lib/api/kimi-api');
        const messages: Array<{ role: string; content: string }> = [];
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.inputText || '' });
        return generateText({
          model: params.model || 'moonshot-v1-8k',
          messages,
          temperature: params.temperature ?? 0.7,
          maxTokens: params.maxLength ?? params.maxTokens ?? 1024,
        });
      }}
    />
  );
};

export default KimiTextNode;