/**
 * 导演Agent节点 - 决策/逻辑处理节点
 * 功能：智能路由、条件判断、流程控制
 */

import { memo } from 'react';
import { Brain, Sparkles, GitBranch } from 'lucide-react';
import { BaseNode, ExecuteButton, ParamEditor } from './BaseNode';
import type { WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { getNodeColorScheme, getDarkNodeColorScheme } from './nodeColors';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

interface DirectorAgentNodeData extends WorkflowNodeData {
  decisionLogic?: 'branch' | 'parallel' | 'conditional';
  targetNodes?: string[];
}

const DirectorAgentNode = memo((props: { data: DirectorAgentNodeData }) => {
  const { data } = props;
  const { isDark } = useTheme();
  const colorScheme = isDark
    ? getDarkNodeColorScheme('director_agent')
    : getNodeColorScheme('director_agent');

  // 参数配置
  const paramSchema = [
    {
      key: 'decisionLogic',
      label: '决策逻辑',
      type: 'select' as const,
      defaultValue: 'branch',
      options: [
        { label: '分支路由', value: 'branch' },
        { label: '并行处理', value: 'parallel' },
        { label: '条件判断', value: 'conditional' }
      ],
      description: '选择数据处理方式'
    },
    {
      key: 'condition',
      label: '条件表达式',
      type: 'text' as const,
      placeholder: '例如：data.status === "success"',
      description: '判断条件（可选）'
    }
  ];

  return (
    <BaseNode
      data={data}
      icon={<Brain className="w-5 h-5" />}
      headerAction={
        <div className={cn('px-2 py-1 rounded-md', colorScheme.iconBg)}>
          <GitBranch className="w-4 h-4" style={{ color: colorScheme.iconText }} />
        </div>
      }
    >
      {/* 决策逻辑说明 */}
      <div className={cn(
        'p-3 rounded-lg border mb-3',
        isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-blue-400' : 'text-blue-700'
          )}>
            导演Agent - 智能决策节点
          </span>
        </div>
        <div className={cn(
          'text-xs space-y-1',
          isDark ? 'text-blue-300/80' : 'text-blue-600/80'
        )}>
          <p>• 智能路由：根据条件选择执行路径</p>
          <p>• 并行处理：同时处理多个任务</p>
          <p>• 条件判断：if/else 逻辑分支</p>
        </div>
      </div>

      <ParamEditor
        params={data.params || {}}
        onChange={(newParams) => {
          // 更新参数的逻辑
          console.log('更新参数:', newParams);
        }}
        schema={paramSchema}
      />

      <ExecuteButton
        onExecute={() => {
          console.log('执行导演Agent决策');
        }}
        status={data.status}
        label="执行决策"
      />
    </BaseNode>
  );
});

DirectorAgentNode.displayName = 'DirectorAgentNode';

export default DirectorAgentNode;
