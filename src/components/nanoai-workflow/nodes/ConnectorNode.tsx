import { useCallback, useState } from 'react';
import { GitBranch, GitMerge, ArrowRight } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

export interface ConnectorNodeData extends WorkflowNodeData {
  params: {
    connectorType: 'branch' | 'merge' | 'conditional' | 'loop';
    condition?: string;
    branchCount?: number;
    mergeStrategy?: 'first' | 'last' | 'all' | 'custom';
  };
  result?: {
    routedData?: any;
    branchResults?: any[];
    mergedData?: any;
    conditionMet?: boolean;
  };
}

export const ConnectorNode = ({ id, data }: NodeProps<ConnectorNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode } = useNanoaiWorkflowStore();
  const [activeBranch, setActiveBranch] = useState(0);

  const handleExecute = useCallback(() => {
    updateNode(id, { status: NodeStatus.RUNNING });

    // 模拟连接器处理
    setTimeout(() => {
      const connectorType = data.params.connectorType;
      let result: any = {};

      switch (connectorType) {
        case 'branch':
          result = {
            routedData: `数据已分发到 ${data.params.branchCount || 2} 个分支`,
            branchResults: ['分支1结果', '分支2结果']
          };
          break;
        case 'merge':
          result = {
            mergedData: '数据已合并',
            mergeStrategy: data.params.mergeStrategy
          };
          break;
        case 'conditional':
          result = {
            conditionMet: data.params.condition === 'true',
            routedData: '条件判断完成'
          };
          break;
        case 'loop':
          result = {
            loopResult: '循环处理完成',
            iterations: 3
          };
          break;
      }

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result
      });
    }, 1000);
  }, [id, data, updateNode]);

  const paramSchema = [
    {
      key: 'connectorType',
      label: '连接器类型',
      type: 'select' as const,
      options: [
        { label: '分支', value: 'branch' },
        { label: '合并', value: 'merge' },
        { label: '条件', value: 'conditional' },
        { label: '循环', value: 'loop' },
      ],
      defaultValue: 'branch',
    },
    {
      key: 'branchCount',
      label: '分支数量',
      type: 'number' as const,
      defaultValue: 2,
      description: '分支连接器的输出数量',
    },
    {
      key: 'condition',
      label: '条件表达式',
      type: 'text' as const,
      placeholder: '输入条件...',
      description: '条件连接器的判断条件',
    },
    {
      key: 'mergeStrategy',
      label: '合并策略',
      type: 'select' as const,
      options: [
        { label: '首个', value: 'first' },
        { label: '末个', value: 'last' },
        { label: '全部', value: 'all' },
        { label: '自定义', value: 'custom' },
      ],
      defaultValue: 'first',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    // 参数已通过ParamEditor更新到data.params中
    console.log('连接器参数已更新:', params);
  }, []);

  const getConnectorIcon = () => {
    switch (data.params.connectorType) {
      case 'branch':
        return <GitBranch className="w-5 h-5" />;
      case 'merge':
        return <GitMerge className="w-5 h-5" />;
      case 'conditional':
        return <ArrowRight className="w-5 h-5" />;
      case 'loop':
        return <div className="relative w-5 h-5">
          <ArrowRight className="w-5 h-5" />
          <ArrowRight className="w-3 h-3 absolute -bottom-1 -right-1 opacity-50" />
        </div>;
      default:
        return <GitBranch className="w-5 h-5" />;
    }
  };

  return (
    <BaseNode
      data={data}
      icon={getConnectorIcon()}
      headerAction={
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
             style={{ background: 'rgba(62, 207, 142, 0.1)', color: '#3ecf8e' }}>
          <GitBranch className="w-3 h-3" />
          <span>连接器</span>
        </div>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="执行连接" />

      {/* 连接器可视化 */}
      <div className="mt-3 p-4 rounded-lg border-2" style={{
        background: isDark ? '#171717' : '#f5f5f5',
        borderColor: isDark ? '#2e2e2e' : '#e5e7eb',
      }}>
        {/* 分支可视化 */}
        {data.params.connectorType === 'branch' && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: '#898989' }}>
              分支输出
            </div>
            <div className="flex gap-2">
              {Array.from({ length: data.params.branchCount || 2 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 p-2 rounded-lg text-center text-xs transition-all',
                    'cursor-pointer hover:scale-105',
                    activeBranch === i
                      ? 'ring-2 ring-[#3ecf8e] ring-offset-2'
                      : 'opacity-60 hover:opacity-100'
                  )}
                  style={{
                    background: isDark ? '#242424' : '#e5e7eb',
                  }}
                  onClick={() => setActiveBranch(i)}
                >
                  <div className="font-medium">分支 {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 合并可视化 */}
        {data.params.connectorType === 'merge' && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: '#898989' }}>
              合并策略
            </div>
            <div className="text-xs" style={{ color: '#b4b4b4' }}>
              {data.params.mergeStrategy === 'first' && '取首个输入'}
              {data.params.mergeStrategy === 'last' && '取末个输入'}
              {data.params.mergeStrategy === 'all' && '合并所有输入'}
              {data.params.mergeStrategy === 'custom' && '自定义处理'}
            </div>
          </div>
        )}

        {/* 条件可视化 */}
        {data.params.connectorType === 'conditional' && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: '#898989' }}>
              条件判断
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 p-2 rounded text-center" style={{
                background: isDark ? '#242424' : '#e5e7eb',
                color: '#898989'
              }}>
                条件: {data.params.condition || '未设置'}
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: '#3ecf8e' }} />
              <div className="flex-1 p-2 rounded text-center" style={{
                background: isDark ? '#242424' : '#e5e7eb',
                color: '#3ecf8e'
              }}>
                结果
              </div>
            </div>
          </div>
        )}

        {/* 循环可视化 */}
        {data.params.connectorType === 'loop' && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: '#898989' }}>
              循环处理
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{
                borderColor: '#3ecf8e',
                background: 'rgba(62, 207, 142, 0.1)',
              }}>
                <span className="text-xs font-bold" style={{ color: '#3ecf8e' }}>↻</span>
              </div>
              <div className="text-xs" style={{ color: '#b4b4b4' }}>
                迭代处理
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 执行结果 */}
      {data.status === NodeStatus.SUCCESS && data.result && (
        <div className="mt-3 p-3 rounded-lg border" style={{
          background: 'rgba(62, 207, 142, 0.1)',
          borderColor: 'rgba(62, 207, 142, 0.3)',
        }}>
          <div className="text-sm font-semibold mb-1" style={{ color: '#3ecf8e' }}>
            ✓ 连接器执行成功
          </div>
          <div className="text-xs space-y-1" style={{ color: '#898989' }}>
            {data.result.routedData && <div>{data.result.routedData}</div>}
            {data.result.branchResults && (
              <div className="space-y-1">
                <div>分支结果：</div>
                {data.result.branchResults.map((result: string, i: number) => (
                  <div key={i} className="p-1 rounded" style={{
                    background: isDark ? '#242424' : '#e5e7eb'
                  }}>
                    {result}
                  </div>
                ))}
              </div>
            )}
            {data.result.mergedData && <div>{data.result.mergedData}</div>}
            {data.result.conditionMet !== undefined && (
              <div>条件结果: {data.result.conditionMet ? '满足' : '不满足'}</div>
            )}
          </div>
        </div>
      )}
    </BaseNode>
  );
};

ConnectorNode.displayName = 'ConnectorNode';

export default ConnectorNode;
