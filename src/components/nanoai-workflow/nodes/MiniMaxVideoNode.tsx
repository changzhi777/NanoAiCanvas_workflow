import { useCallback } from 'react';
import { Video } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface MiniMaxVideoData extends WorkflowNodeData {
  params: {
    prompt: string;
    model: 'hailuo-2.3-fast-768P' | 'hailuo-2.3-768P';
    duration: number;
  };
}

const VIDEO_MODELS = [
  { label: 'Hailuo-2.3-Fast-768P（推荐）', value: 'hailuo-2.3-fast-768P' },
  { label: 'Hailuo-2.3-768P（标准）', value: 'hailuo-2.3-768P' },
];

export const MiniMaxVideoNode = ({ id, data }: NodeProps<MiniMaxVideoData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

  const paramSchema = [
    {
      key: 'prompt',
      label: '视频描述',
      type: 'textarea' as const,
      placeholder: '请描述视频内容：如"夕阳下，一只猫坐在窗边望向远方"...',
      required: true,
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: VIDEO_MODELS,
      defaultValue: 'hailuo-2.3-fast-768P',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'number' as const,
      defaultValue: 6,
      min: 3,
      max: 10,
      step: 1,
      description: '3-10秒',
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
      icon={<Video className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />
      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label="生成视频"
      />
    </BaseNode>
  );
};

export default MiniMaxVideoNode;
