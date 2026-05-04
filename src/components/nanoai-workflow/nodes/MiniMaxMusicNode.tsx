import { Music } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface MiniMaxMusicData extends ApiTaskNodeData {
  params: {
    apiType: 'minimax';
    action: 'music';
    prompt: string;
    model: 'music-2.6' | 'music-cover';
    lyrics: boolean;
    outputType: 'audio';
  };
}

const MUSIC_MODELS = [
  { label: 'Music 2.6（推荐）', value: 'music-2.6' },
  { label: 'Music Cover', value: 'music-cover' },
];

export const MiniMaxMusicNode = ({ id, data }: NodeProps<MiniMaxMusicData>) => {
  const paramSchema = [
    {
      key: 'prompt',
      label: '音乐描述',
      type: 'textarea' as const,
      placeholder: '请描述想要的音乐：如"轻快爵士风格的歌曲，主题是夏天的海边"...',
      required: true,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: MUSIC_MODELS,
      defaultValue: 'music-2.6',
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Music className="w-5 h-5" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { generateMusic } = await import('@/lib/api/minimax-api');
        return generateMusic({
          prompt: params.prompt!,
          model: params.model || 'music-2.6',
        });
      }}
    />
  );
};

export default MiniMaxMusicNode;