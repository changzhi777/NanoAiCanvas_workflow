import { useCallback } from 'react';
import { Mic } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface MiniMaxSpeechData extends WorkflowNodeData {
  params: {
    inputText: string;
    voice: string;
    speed: number;
  };
}

const VOICE_OPTIONS = [
  { label: '云仰（女声）', value: 'female_yunyang' },
  { label: '小溪（女声）', value: 'female_xiaoxi' },
  { label: '阿森（男声）', value: 'male_asen' },
  { label: '小明（男声）', value: 'male_xiaoming' },
];

export const MiniMaxSpeechNode = ({ id, data }: NodeProps<MiniMaxSpeechData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

  const paramSchema = [
    {
      key: 'inputText',
      label: '文本内容',
      type: 'textarea' as const,
      placeholder: '请输入要转换为语音的文本...',
      required: true,
    },
    {
      key: 'voice',
      label: '音色选择',
      type: 'select' as const,
      options: VOICE_OPTIONS,
      defaultValue: 'female_yunyang',
    },
    {
      key: 'speed',
      label: '语速',
      type: 'number' as const,
      defaultValue: 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      description: '0.5-2.0之间',
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
      icon={<Mic className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />
      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label="生成语音"
      />
    </BaseNode>
  );
};

export default MiniMaxSpeechNode;
