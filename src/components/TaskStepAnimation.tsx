/**
 * 任务步骤动画组件
 * 实时显示图片生成任务的执行步骤和进度
 */

import { memo } from 'react'
import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STEPS } from '@/lib/api/adapters/SkillQueueAdapter'

// 完整步骤顺序
const STEP_ORDER = [
  'validating',
  'prompt_building',
  'api_submitting',
  'generating',
] as const

interface TaskStepAnimationProps {
  currentStep: string
  progress: number
  stepMessage?: string
  className?: string
}

const stepIcon = (stepState: 'done' | 'active' | 'pending' | 'failed') => {
  switch (stepState) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    case 'active':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'pending':
      return <Circle className="w-4 h-4 text-muted-foreground/30" />
  }
}

/**
 * 任务步骤动画
 */
export const TaskStepAnimation = memo(({ currentStep, progress, stepMessage, className }: TaskStepAnimationProps) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep as any)
  const isComplete = currentStep === 'completed'
  const isFailed = currentStep === 'failed' || currentStep === 'cancelled'

  return (
    <div className={cn('space-y-2', className)}>
      {/* 步骤列表 */}
      <div className="space-y-1.5">
        {STEP_ORDER.map((stepKey, idx) => {
          const stepDef = TASK_STEPS[stepKey]
          let state: 'done' | 'active' | 'pending' | 'failed' = 'pending'

          if (isComplete) {
            state = 'done'
          } else if (isFailed && idx === Math.max(0, currentIndex)) {
            state = 'failed'
          } else if (idx < currentIndex) {
            state = 'done'
          } else if (idx === currentIndex) {
            state = 'active'
          }

          return (
            <div
              key={stepKey}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-300',
                state === 'active' && 'bg-blue-500/10',
                state === 'done' && 'opacity-60',
                state === 'failed' && 'bg-red-500/10',
              )}
            >
              {stepIcon(state)}
              <span
                className={cn(
                  'text-xs transition-colors',
                  state === 'active' && 'text-blue-500 font-medium',
                  state === 'done' && 'text-emerald-500',
                  state === 'pending' && 'text-muted-foreground/40',
                  state === 'failed' && 'text-red-500',
                )}
              >
                {stepDef?.label || stepKey}
              </span>
              {/* 活跃步骤的消息 */}
              {state === 'active' && stepMessage && (
                <span className="text-xs text-muted-foreground ml-auto truncate max-w-[140px]">
                  {stepMessage}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 进度条 */}
      <div className="space-y-1">
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-blue-500',
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {isComplete ? '完成' : isFailed ? '失败' : stepMessage || '处理中...'}
          </span>
          <span className="font-mono">{progress}%</span>
        </div>
      </div>
    </div>
  )
})

TaskStepAnimation.displayName = 'TaskStepAnimation'
