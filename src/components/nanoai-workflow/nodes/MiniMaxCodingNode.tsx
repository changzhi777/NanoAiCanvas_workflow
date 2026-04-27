import { useCallback } from 'react';
import { Search } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface MiniMaxCodingData extends WorkflowNodeData {
  params: {
    query: string;
  };
}

export const MiniMaxCodingNode = ({ id, data }: NodeProps<MiniMaxCodingData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

  const paramSchema = [
    {
      key: 'query',
      label: '搜索查询',
      type: 'textarea' as const,
      placeholder: '请输入编程相关问题...',
      required: true,
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
      icon={<Search className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />
      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label="搜索"
      />
    </BaseNode>
  );
};

export default MiniMaxCodingNode;
