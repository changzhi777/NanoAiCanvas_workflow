import { useCallback, useEffect } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface DialogueGeneratorData extends WorkflowNodeData {
  params: {
    dialogueText: string;
    voice: string;
    speed: number;
    pitch: number;
    emotion?: string;
  };
}

const VOICE_OPTIONS = [
  { label: '温柔女声', value: 'female_gentle' },
  { label: '活力女声', value: 'female_energetic' },
  { label: '深沉男声', value: 'male_deep' },
  { label: '阳光男声', value: 'male_bright' },
  { label: '童声', value: 'child' },
];

const EMOTIONS = [
  { label: '无', value: '' },
  { label: '开心', value: 'happy' },
  { label: '悲伤', value: 'sad' },
  { label: '愤怒', value: 'angry' },
  { label: '紧张', value: 'nervous' },
];

export const DialogueGeneratorNode = ({ id, data }: NodeProps<DialogueGeneratorData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

  const paramSchema = [
    {
      key: 'dialogueText',
      label: '对白文本',
      type: 'textarea' as const,
      placeholder: '请输入对白内容...',
      required: true,
    },
    {
      key: 'voice',
      label: '音色',
      type: 'select' as const,
      options: VOICE_OPTIONS,
      defaultValue: 'female_gentle',
    },
    {
      key: 'speed',
      label: '语速',
      type: 'number' as const,
      defaultValue: 1.0,
      description: '0.5-2.0倍速',
    },
    {
      key: 'pitch',
      label: '音调',
      type: 'number' as const,
      defaultValue: 1.0,
      description: '0.5-2.0倍音调',
    },
    {
      key: 'emotion',
      label: '情感',
      type: 'select' as const,
      options: EMOTIONS,
      defaultValue: '',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  useEffect(() => {
    if (data.status === NodeStatus.SUCCESS && data.params.dialogueText) {
      const timer = setTimeout(() => executeNode(id), 800);
      return () => clearTimeout(timer);
    }
  }, [data.params, data.status, id, executeNode]);

  const handleExecute = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode
      data={data}
      icon={<Mic className="w-5 h-5" />}
      headerAction={
        <button className="p-1 hover:bg-white/50 rounded transition-colors" title="配置">
          <Volume2 className="w-4 h-4 text-blue-600" />
        </button>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="生成对白" />

      {data.result && data.result.audioUrl && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-2">✓ 对白生成成功</div>
          <audio controls src={data.result.audioUrl} className="w-full h-8" />
        </div>
      )}
    </BaseNode>
  );
};

export default DialogueGeneratorNode;
