import { MessageSquare } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface MiniMaxTextData extends ApiTaskNodeData {
  params: {
    apiType: 'minimax';
    action: 'text';
    inputText: string;
    model: 'MiniMax-Text-01' | 'abab6.5s-chat';
    temperature: number;
    maxLength: number;
    systemPrompt?: string;
    outputType: 'text';
  };
}

const TEXT_MODELS = [
  { label: 'MiniMax-Text-01（推荐）', value: 'MiniMax-Text-01' },
  { label: 'abab6.5s-chat', value: 'abab6.5s-chat' },
];

export const MiniMaxTextNode = ({ id, data }: NodeProps<MiniMaxTextData>) => {
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
      defaultValue: 'MiniMax-Text-01',
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
        const { generateText } = await import('@/lib/api/minimax-api');
        const messages: Array<{ role: string; content: string }> = [];
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.inputText || '' });
        return generateText({
          model: params.model || 'MiniMax-Text-01',
          messages,
          temperature: params.temperature ?? 0.7,
          maxTokens: params.maxLength ?? params.maxTokens ?? 1024,
        });
      }}
    />
  );
};

export default MiniMaxTextNode;