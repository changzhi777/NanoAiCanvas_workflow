import { FileText } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface QwenTextData extends ApiTaskNodeData {
  params: {
    apiType: 'qwen';
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
  { label: 'Qwen-Turbo（推荐）', value: 'qwen-turbo' },
  { label: 'Qwen-Plus', value: 'qwen-plus' },
  { label: 'Qwen-Max', value: 'qwen-max' },
];

export const QwenTextNode = ({ id, data }: NodeProps<QwenTextData>) => {
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
      defaultValue: 'qwen-turbo',
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
      icon={<FileText className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateText } = await import('@/lib/api/qwen-api');
        const messages: Array<{ role: string; content: string }> = [];
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.inputText || '' });
        return generateText({
          model: params.model || 'qwen-turbo',
          messages,
          temperature: params.temperature ?? 0.7,
          maxTokens: params.maxLength ?? params.maxTokens ?? 1024,
        });
      }}
    />
  );
};

export default QwenTextNode;