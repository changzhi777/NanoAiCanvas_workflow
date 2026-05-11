import { Search } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { TaskNodeBase, ApiTaskNodeData } from './TaskNodeBase';

export interface MiniMaxCodingData extends ApiTaskNodeData {
  params: {
    apiType: 'minimax';
    action: 'coding';
    query: string;
    outputType: 'text';
  };
}

export const MiniMaxCodingNode = ({ id, data }: NodeProps<MiniMaxCodingData>) => {
  const paramSchema = [
    {
      key: 'query',
      label: '搜索查询',
      type: 'textarea' as const,
      placeholder: '请输入编程相关问题...',
      required: true,
    },
  ];

  return (
    <TaskNodeBase
      id={id}
      data={data}
      icon={<Search className="w-4 h-4" />}
      paramSchema={paramSchema}
      apiCall={async (params) => {
        const { codingPlanSearch } = await import('@/lib/api/minimax-api');
        return codingPlanSearch(params.query || '');
      }}
    />
  );
};

export default MiniMaxCodingNode;