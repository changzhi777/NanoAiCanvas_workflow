import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { NodeStatus } from '@/stores/nanoaiWorkflowStore';

interface WorkflowProgressProps {
  nodes: Array<{ id: string; data: { label: string; status: NodeStatus } }>;
  isExecuting?: boolean;
}

export function WorkflowProgress({ nodes, isExecuting }: WorkflowProgressProps) {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState(0);

  const totalNodes = nodes.length;
  const completedNodes = nodes.filter(n => n.data.status === NodeStatus.SUCCESS).length;
  const runningNodes = nodes.filter(n => n.data.status === NodeStatus.RUNNING).length;
  const errorNodes = nodes.filter(n => n.data.status === NodeStatus.ERROR).length;

  useEffect(() => {
    if (totalNodes > 0) {
      const newProgress = (completedNodes / totalNodes) * 100;
      setProgress(newProgress);
    }
  }, [completedNodes, totalNodes]);

  if (totalNodes === 0) return null;

  return (
    <div className={cn(
      'space-y-3 p-4 rounded-xl backdrop-blur-xl border transition-all duration-300',
      isDark
        ? 'bg-slate-900/80 border-white/10'
        : 'bg-white/90 border-gray-200'
    )}>
      {/* 总体进度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={cn(
            'font-medium',
            isDark ? 'text-slate-200' : 'text-gray-700'
          )}>
            工作流进度
          </span>
          <span className={cn(
            'text-xs font-mono',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            {completedNodes}/{totalNodes} 节点完成
          </span>
        </div>

        {/* 进度条 */}
        <div className={cn(
          'h-2 rounded-full overflow-hidden',
          isDark ? 'bg-slate-800' : 'bg-gray-200'
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              'relative overflow-hidden',
              isExecuting && 'animate-pulse',
              errorNodes > 0
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : progress === 100
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            )}
            style={{ width: `${progress}%` }}
          >
            {/* 闪光效果 */}
            {isExecuting && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* 状态统计 */}
      <div className="flex items-center gap-4 text-xs">
        <div className={cn(
          'flex items-center gap-1.5',
          isDark ? 'text-slate-400' : 'text-gray-500'
        )}>
          <Loader2 className={cn(
            'w-3.5 h-3.5',
            runningNodes > 0 && 'animate-spin text-blue-500'
          )} />
          <span>运行中: {runningNodes}</span>
        </div>

        <div className={cn(
          'flex items-center gap-1.5',
          isDark ? 'text-slate-400' : 'text-gray-500'
        )}>
          <CheckCircle2 className={cn(
            'w-3.5 h-3.5',
            completedNodes > 0 && 'text-green-500'
          )} />
          <span>已完成: {completedNodes}</span>
        </div>

        {errorNodes > 0 && (
          <div className={cn(
            'flex items-center gap-1.5',
            isDark ? 'text-red-400' : 'text-red-500'
          )}>
            <XCircle className="w-3.5 h-3.5" />
            <span>失败: {errorNodes}</span>
          </div>
        )}
      </div>

      {/* 节点列表 */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {nodes.map((node, index) => (
          <div
            key={node.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
              'text-xs',
              node.data.status === NodeStatus.RUNNING && 'animate-pulse',
              isDark
                ? node.data.status === NodeStatus.RUNNING
                  ? 'bg-blue-900/30 border border-blue-500/50'
                  : node.data.status === NodeStatus.SUCCESS
                    ? 'bg-green-900/30 border border-green-500/50'
                    : node.data.status === NodeStatus.ERROR
                      ? 'bg-red-900/30 border border-red-500/50'
                      : 'bg-white/5'
                : node.data.status === NodeStatus.RUNNING
                  ? 'bg-blue-50 border border-blue-200'
                  : node.data.status === NodeStatus.SUCCESS
                    ? 'bg-green-50 border border-green-200'
                    : node.data.status === NodeStatus.ERROR
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50'
            )}
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium">
              {node.data.status === NodeStatus.RUNNING && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              )}
              {node.data.status === NodeStatus.SUCCESS && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
              {node.data.status === NodeStatus.ERROR && (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              {node.data.status === NodeStatus.IDLE && (
                <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>
                  {index + 1}
                </span>
              )}
            </div>

            <span className={cn(
              'flex-1 truncate',
              isDark ? 'text-slate-200' : 'text-gray-700'
            )}>
              {node.data.label}
            </span>

            {node.data.status === NodeStatus.RUNNING && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-500 animate-pulse" />
                <span className="text-blue-500">执行中</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

WorkflowProgress.displayName = 'WorkflowProgress';
