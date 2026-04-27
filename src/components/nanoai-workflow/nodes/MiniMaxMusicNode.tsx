import { useCallback } from 'react';
import { Music } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface MiniMaxMusicData extends WorkflowNodeData {
  params: {
    prompt: string;
    model: 'music-2.6' | 'music-cover';
    lyrics: boolean;
  };
}

const MUSIC_MODELS = [
  { label: 'Music 2.6（推荐）', value: 'music-2.6' },
  { label: 'Music Cover', value: 'music-cover' },
];

export const MiniMaxMusicNode = ({ id, data }: NodeProps<MiniMaxMusicData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

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
    {
      key: 'lyrics',
      label: '包含歌词',
      type: 'toggle' as const,
      defaultValue: true,
      description: '是否生成歌词',
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
      icon={<Music className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />
      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label="生成音乐"
      />
    </BaseNode>
  );
};

export default MiniMaxMusicNode;
