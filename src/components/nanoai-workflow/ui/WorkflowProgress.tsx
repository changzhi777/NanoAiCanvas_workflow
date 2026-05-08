import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { NodeStatus } from '@/stores/nanoaiWorkflowStore';
import { TASK_STEPS } from '@/lib/api/adapters/SkillQueueAdapter';

interface StepInfo { step: string; progress: number; message: string }

interface WorkflowProgressNode {
  id: string
  data: {
    label: string
    status: NodeStatus
    startedAt?: string
    _stepInfo?: StepInfo
  }
}

interface WorkflowProgressProps {
  nodes: WorkflowProgressNode[];
  isExecuting?: boolean;
}

const STEP_KEYS = ['validating', 'prompt_building', 'api_submitting', 'generating'] as const

function stepIcon(state: 'done' | 'active' | 'pending' | 'failed') {
  switch (state) {
    case 'done': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />
    case 'active': return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
    case 'failed': return <XCircle className="w-3 h-3 text-red-500" />
    case 'pending': return <Circle className="w-3 h-3 text-muted-foreground/30" />
  }
}

export function WorkflowProgress({ nodes }: WorkflowProgressProps) {
  const { isDark } = useTheme();

  const totalNodes = nodes.length;
  const completedNodes = nodes.filter(n => n.data.status === NodeStatus.SUCCESS).length;
  const runningNodes = nodes.filter(n => n.data.status === NodeStatus.RUNNING).length;
  const errorNodes = nodes.filter(n => n.data.status === NodeStatus.ERROR).length;
  const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

  if (totalNodes === 0) return null;

  return (
    <div className={cn(
      'space-y-3 p-4 rounded-xl backdrop-blur-xl border',
      isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-gray-200'
    )}>
      {/* 总体进度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={cn('font-medium', isDark ? 'text-slate-200' : 'text-gray-700')}>
            执行进度
          </span>
          <span className={cn('text-xs font-mono', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {completedNodes}/{totalNodes} 完成
          </span>
        </div>

        <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-slate-800' : 'bg-gray-200')}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              errorNodes > 0
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : progress === 100
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          {runningNodes > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" /> 运行中: {runningNodes}
            </span>
          )}
          {completedNodes > 0 && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3 h-3" /> 完成: {completedNodes}
            </span>
          )}
          {errorNodes > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="w-3 h-3" /> 失败: {errorNodes}
            </span>
          )}
        </div>
      </div>

      {/* 节点列表（含步骤详情） */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {nodes.map((node) => {
          const isRunning = node.data.status === NodeStatus.RUNNING
          const stepInfo = node.data._stepInfo

          return (
            <div
              key={node.id}
              className={cn(
                'rounded-lg p-2 text-xs',
                node.data.status === NodeStatus.RUNNING
                  ? isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                  : node.data.status === NodeStatus.SUCCESS
                    ? isDark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                    : node.data.status === NodeStatus.ERROR
                      ? isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                      : isDark ? 'bg-white/5' : 'bg-gray-50'
              )}
            >
              {/* 节点标题行 */}
              <div className="flex items-center gap-2">
                {node.data.status === NodeStatus.RUNNING && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                {node.data.status === NodeStatus.SUCCESS && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                {node.data.status === NodeStatus.ERROR && <XCircle className="w-3 h-3 text-red-500" />}
                {node.data.status === NodeStatus.IDLE && <Circle className="w-3 h-3 text-muted-foreground/40" />}
                <span className={cn('flex-1 truncate', isDark ? 'text-slate-200' : 'text-gray-700')}>
                  {node.data.label}
                </span>
                {isRunning && stepInfo && (
                  <span className="text-[10px] text-muted-foreground font-mono">{stepInfo.progress}%</span>
                )}
              </div>

              {/* 运行中节点的步骤详情 */}
              {isRunning && stepInfo && (
                <div className="mt-1.5 space-y-0.5">
                  {STEP_KEYS.map((stepKey) => {
                    const stepDef = TASK_STEPS[stepKey]
                    const currentIdx = STEP_KEYS.indexOf(stepInfo.step as any)
                    const thisIdx = STEP_KEYS.indexOf(stepKey)
                    let state: 'done' | 'active' | 'pending' | 'failed' = 'pending'
                    if (thisIdx < currentIdx) state = 'done'
                    else if (thisIdx === currentIdx) state = 'active'

                    return (
                      <div key={stepKey} className={cn(
                        'flex items-center gap-1.5 px-1 py-0.5 rounded',
                        state === 'active' && 'bg-blue-500/10',
                        state === 'done' && 'opacity-50',
                      )}>
                        {stepIcon(state)}
                        <span className={cn(
                          'text-[10px]',
                          state === 'active' && 'text-blue-500 font-medium',
                          state === 'done' && 'text-emerald-500',
                          state === 'pending' && 'text-muted-foreground/40',
                        )}>
                          {stepDef?.label || stepKey}
                        </span>
                        {state === 'active' && stepInfo.message && (
                          <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[80px]">
                            {stepInfo.message}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* 步骤进度条 */}
                  <div className="w-full bg-muted rounded-full h-0.5 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, stepInfo.progress)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}

WorkflowProgress.displayName = 'WorkflowProgress';
