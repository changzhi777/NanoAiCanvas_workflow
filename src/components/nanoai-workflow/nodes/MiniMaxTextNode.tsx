import { useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface MiniMaxTextData extends WorkflowNodeData {
  params: {
    inputText: string;
    model: 'MiniMax-Text-01' | 'abab6.5s-chat';
    temperature: number;
    maxLength: number;
    systemPrompt?: string;
  };
}

const TEXT_MODELS = [
  { label: 'MiniMax-Text-01（推荐）', value: 'MiniMax-Text-01' },
  { label: 'abab6.5s-chat', value: 'abab6.5s-chat' },
];

export const MiniMaxTextNode = ({ id, data }: NodeProps<MiniMaxTextData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

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
      step: 0.1,
      description: '0-1之间，越高越有创意',
    },
    {
      key: 'maxLength',
      label: '最大长度',
      type: 'number' as const,
      defaultValue: 1024,
      min: 256,
      max: 8192,
      step: 256,
      description: '最大输出token数',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  const handleNodeExecute = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode
      data={data}
      icon={<MessageSquare className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />
      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label="生成文本"
      />
    </BaseNode>
  );
};

export default MiniMaxTextNode;
