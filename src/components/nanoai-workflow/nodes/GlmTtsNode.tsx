import { Mic } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface GlmTtsData extends ApiTaskNodeData {
  params: {
    apiType: 'glm';
    action: 'tts';
    text: string;
    voice: string;
    speed: number;
    responseFormat: 'mp3' | 'wav' | 'pcm';
    outputType: 'audio';
  };
}

const VOICE_OPTIONS = [
  { label: '女声-云扬', value: 'female_yunyang' },
  { label: '男声-云起', value: 'male_yunqi' },
  { label: '女声-小娇', value: 'female_xiaojiao' },
  { label: '男声-小刚', value: 'male_xiaogang' },
];

const FORMAT_OPTIONS = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
  { label: 'PCM', value: 'pcm' },
];

export const GlmTtsNode = ({ id, data }: NodeProps<GlmTtsData>) => {
  const paramSchema = [
    {
      key: 'text',
      label: '合成文本',
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
    {
      key: 'responseFormat',
      label: '输出格式',
      type: 'select' as const,
      options: FORMAT_OPTIONS,
      defaultValue: 'mp3',
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Mic className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { synthesizeSpeech } = await import('@/lib/api/glm-api');
        return synthesizeSpeech({
          text: params.text || '',
          voice: params.voice,
          speed: params.speed,
          responseFormat: params.responseFormat,
        });
      }}
    />
  );
};

export default GlmTtsNode;