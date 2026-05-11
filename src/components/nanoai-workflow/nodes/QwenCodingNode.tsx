import { Code } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface QwenCodingData extends ApiTaskNodeData {
  params: {
    apiType: 'qwen';
    action: 'coding';
    inputText: string;
    model: string;
    temperature: number;
    maxLength: number;
    outputType: 'text';
  };
}

const CODING_MODELS = [
  { label: 'Qwen-Coder-Plus（推荐）', value: 'qwen-coder-plus' },
  { label: 'Qwen-Coder-Turbo', value: 'qwen-coder-turbo' },
];

export const QwenCodingNode = ({ id, data }: NodeProps<QwenCodingData>) => {
  const paramSchema = [
    {
      key: 'inputText',
      label: '编程需求',
      type: 'textarea' as const,
      placeholder: '请描述你的编程需求或问题...',
      required: true,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: CODING_MODELS,
      defaultValue: 'qwen-coder-plus',
    },
    {
      key: 'temperature',
      label: '创意程度',
      type: 'number' as const,
      defaultValue: 0.2,
      min: 0,
      max: 1,
    },
    {
      key: 'maxLength',
      label: '最大长度',
      type: 'number' as const,
      defaultValue: 2048,
      min: 256,
      max: 8192,
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Code className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateCode } = await import('@/lib/api/qwen-api');
        const messages: Array<{ role: string; content: string }> = [];
        messages.push({ role: 'user', content: params.inputText || '' });
        return generateCode({
          model: params.model || 'qwen-coder-plus',
          messages,
          temperature: params.temperature ?? 0.2,
          maxTokens: params.maxLength ?? 2048,
        });
      }}
    />
  );
};

export default QwenCodingNode;