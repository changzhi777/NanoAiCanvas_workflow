import { Mic } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface MiniMaxSpeechData extends ApiTaskNodeData {
  params: {
    apiType: 'minimax';
    action: 'speech';
    inputText: string;
    voice: 'female_yunyang' | 'female_xiaoxi' | 'male_asen' | 'male_xiaoming';
    speed: number;
    outputType: 'audio';
  };
}

const VOICE_OPTIONS = [
  { label: '云仰（女声）', value: 'female_yunyang' },
  { label: '小溪（女声）', value: 'female_xiaoxi' },
  { label: '阿森（男声）', value: 'male_asen' },
  { label: '小明（男声）', value: 'male_xiaoming' },
];

export const MiniMaxSpeechNode = ({ id, data }: NodeProps<MiniMaxSpeechData>) => {
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
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Mic className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateSpeech } = await import('@/lib/api/minimax-api');
        return generateSpeech({
          text: params.inputText!,
          voice: params.voice || 'female_yunyang',
          speed: params.speed ?? 1.0,
        });
      }}
    />
  );
};

export default MiniMaxSpeechNode;