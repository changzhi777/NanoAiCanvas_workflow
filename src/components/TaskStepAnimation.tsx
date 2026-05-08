/**
 * 任务步骤动画组件
 * 实时显示图片生成任务的执行步骤、进度、计时和预估时间
 */

import { memo, useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Circle, XCircle, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STEPS } from '@/lib/api/adapters/SkillQueueAdapter'

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
  startedAt?: string
  onCancel?: () => void
  className?: string
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function formatETA(ms: number): string {
  if (ms < 0 || !isFinite(ms)) return '--:--'
  if (ms < 60000) return `约${Math.ceil(ms / 1000)}秒`
  const m = Math.floor(ms / 60000)
  const s = Math.ceil((ms % 60000) / 1000)
  return `约${m}分${s > 0 ? s + '秒' : ''}`
}

const stepIcon = (stepState: 'done' | 'active' | 'pending' | 'failed') => {
  switch (stepState) {
    case 'done':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    case 'active':
      return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />
    case 'pending':
      return <Circle className="w-3.5 h-3.5 text-muted-foreground/30" />
  }
}

export const TaskStepAnimation = memo(({ currentStep, progress, stepMessage, startedAt, onCancel, className }: TaskStepAnimationProps) => {
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const currentIndex = STEP_ORDER.indexOf(currentStep as any)
  const isComplete = currentStep === 'completed'
  const isFailed = currentStep === 'failed' || currentStep === 'cancelled'
  const isRunning = !isComplete && !isFailed

  // 已用时间计时
  useEffect(() => {
    if (!startedAt || !isRunning) return
    startTimeRef.current = new Date(startedAt).getTime()

    const tick = () => {
      setElapsed(Date.now() - startTimeRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [startedAt, isRunning])

  // 预估剩余时间：基于线性进度推算
  const eta = progress > 0 && progress < 100 && elapsed > 0
    ? (elapsed / progress) * (100 - progress)
    : 0

  return (
    <div className={cn('space-y-2', className)}>
      {/* 步骤列表 */}
      <div className="space-y-1">
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
                'flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-all duration-300',
                state === 'active' && 'bg-blue-500/10',
                state === 'done' && 'opacity-60',
                state === 'failed' && 'bg-red-500/10',
              )}
            >
              {stepIcon(state)}
              <span
                className={cn(
                  'text-[10px] transition-colors',
                  state === 'active' && 'text-blue-500 font-medium',
                  state === 'done' && 'text-emerald-500',
                  state === 'pending' && 'text-muted-foreground/40',
                  state === 'failed' && 'text-red-500',
                )}
              >
                {stepDef?.label || stepKey}
              </span>
              {state === 'active' && stepMessage && (
                <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[100px]">
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
        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
          <span>
            {isComplete ? '完成' : isFailed ? '失败' : stepMessage || '处理中...'}
          </span>
          <span className="font-mono">{progress}%</span>
        </div>
      </div>

      {/* 时间信息 + 终止按钮 */}
      {startedAt && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>已用 {formatDuration(elapsed)}</span>
            {isRunning && eta > 0 && (
              <span>· 预计剩余 {formatETA(eta)}</span>
            )}
          </div>
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              终止
            </button>
          )}
        </div>
      )}
    </div>
  )
})

TaskStepAnimation.displayName = 'TaskStepAnimation'
