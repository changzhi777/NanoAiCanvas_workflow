/**
 * 里程碑节点 - 里程碑标记节点
 * 功能：标记工作流中的重要节点，用于流程组织和版本管理
 */

import { memo } from 'react';
import { Flag, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

interface MilestoneNodeData extends WorkflowNodeData {
  milestoneType?: 'start' | 'checkpoint' | 'complete' | 'review';
  description?: string;
}

const MilestoneNode = memo((props: { data: MilestoneNodeData }) => {
  const { data } = props;
  const { isDark } = useTheme();

  const milestoneType = data.milestoneType || 'checkpoint';

  // 根据类型获取图标和颜色
  const getMilestoneConfig = () => {
    switch (milestoneType) {
      case 'start':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'blue',
          label: '开始',
          bgClass: isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
          textClass: isDark ? 'text-blue-400' : 'text-blue-600',
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'green',
          label: '完成',
          bgClass: isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200',
          textClass: isDark ? 'text-green-400' : 'text-green-600',
        };
      case 'review':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'yellow',
          label: '审核',
          bgClass: isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200',
          textClass: isDark ? 'text-yellow-400' : 'text-yellow-600',
        };
      default:
        return {
          icon: <Flag className="w-5 h-5" />,
          color: 'orange',
          label: '检查点',
          bgClass: isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200',
          textClass: isDark ? 'text-orange-400' : 'text-orange-600',
        };
    }
  };

  const config = getMilestoneConfig();

  return (
    <BaseNode
      data={data}
      icon={config.icon}
    >
      {/* 里程碑卡片 */}
      <div className={cn('p-3 rounded-lg border mb-3', config.bgClass)}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-sm font-semibold', config.textClass)}>{config.label}</span>
        </div>
        {data.description && (
          <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
            {data.description}
          </p>
        )}
      </div>

      {/* 提示信息 */}
      <div className={cn(
        'text-xs p-2 rounded border',
        isDark ? 'bg-gray-800/50 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'
      )}>
        <p>里程碑节点用于标记工作流中的重要节点</p>
        <p className="mt-1">- 开始/结束点</p>
        <p>- 版本检查点</p>
        <p>- 审核节点</p>
      </div>
    </BaseNode>
  );
});

MilestoneNode.displayName = 'MilestoneNode';

export default MilestoneNode;