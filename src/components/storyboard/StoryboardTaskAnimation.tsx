'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { FileText, LayoutGrid, Users, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { StoryboardTaskStatus, StoryboardSubTask } from '@/types'

interface StoryboardTaskAnimationProps {
  status: StoryboardTaskStatus
  progress: number
  subTasks?: StoryboardSubTask[]
  error?: string
  compact?: boolean // 紧凑模式（用于列表项）
  className?: string
}

// 子任务配置
const SUB_TASK_CONFIG = [
  { id: 'script', label: '生成剧本', icon: FileText },
  { id: 'storyboard', label: '生成故事板', icon: LayoutGrid },
  { id: 'character', label: '生成角色设计', icon: Users },
]

/**
 * 故事板任务专用动画组件
 * 展示三阶段工作流：剧本 → 故事板 → 角色设计
 * 紫粉色渐变主题，与图片任务动画区分
 */
export function StoryboardTaskAnimation({
  status,
  progress,
  subTasks = [],
  error,
  compact = false,
  className,
}: StoryboardTaskAnimationProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // 进度动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 50)
    return () => clearTimeout(timer)
  }, [progress])

  // 获取子任务状态
  const getSubTaskStatus = (taskId: string): StoryboardSubTask['status'] => {
    const subTask = subTasks.find(t => t.id === taskId)
    return subTask?.status || 'pending'
  }

  const getSubTaskProgress = (taskId: string): number => {
    const subTask = subTasks.find(t => t.id === taskId)
    return subTask?.progress || 0
  }

  // 判断是否活跃状态
  const _isActive = status !== 'success' && status !== 'error'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  // 紧凑模式 - 用于列表项
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* 迷你进度环 */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-purple-500/20"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="url(#storyboard-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${animatedProgress * 0.754} 75.4`}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="storyboard-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isSuccess ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : isError ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <span className="text-[8px] font-bold text-purple-300">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>

        {/* 三阶段指示器 */}
        <div className="flex items-center gap-1">
          {SUB_TASK_CONFIG.map((config) => {
            const subStatus = getSubTaskStatus(config.id)
            const Icon = config.icon
            return (
              <div key={config.id} className="flex items-center">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  subStatus === 'success' && "bg-green-500/20 text-green-400",
                  subStatus === 'running' && "bg-purple-500/20 text-purple-400 animate-pulse",
                  subStatus === 'error' && "bg-red-500/20 text-red-400",
                  subStatus === 'pending' && "bg-white/5 text-white/30"
                )}>
                  {subStatus === 'success' ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : subStatus === 'running' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Icon className="w-2.5 h-2.5" />
                  )}
                </div>
                {index < SUB_TASK_CONFIG.length - 1 && (
                  <div className={cn(
                    "w-3 h-0.5 mx-0.5 transition-colors",
                    getSubTaskStatus(SUB_TASK_CONFIG[index + 1].id) !== 'pending'
                      ? "bg-purple-500/50"
                      : "bg-white/10"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 完整模式 - 展开详情时使用
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg",
      "bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30",
      "border border-purple-500/20",
      className
    )}>
      {/* 背景动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-conic from-purple-500/10 via-transparent to-transparent animate-spin-slow" style={{ animationDuration: '8s' }} />
      </div>

      <div className="relative p-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">故事板生成</div>
              <div className="text-xs text-purple-300">
                {isSuccess ? '已完成' : isError ? '生成失败' : '生成中...'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-gradient rounded-full transition-all duration-500"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </div>

        {/* 三阶段流程 */}
        <div className="space-y-2">
          {SUB_TASK_CONFIG.map((config) => {
            const subStatus = getSubTaskStatus(config.id)
            const subProgress = getSubTaskProgress(config.id)
            const Icon = config.icon

            return (
              <div key={config.id} className="flex items-center gap-3">
                {/* 图标 */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                  subStatus === 'success' && "bg-green-500/20 text-green-400",
                  subStatus === 'running' && "bg-purple-500/20 text-purple-400 ring-2 ring-purple-500/30",
                  subStatus === 'error' && "bg-red-500/20 text-red-400",
                  subStatus === 'pending' && "bg-white/5 text-white/30"
                )}>
                  {subStatus === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : subStatus === 'running' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : subStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* 标签和进度 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      subStatus === 'success' && "text-green-400",
                      subStatus === 'running' && "text-purple-300",
                      subStatus === 'error' && "text-red-400",
                      subStatus === 'pending' && "text-white/40"
                    )}>
                      {config.label}
                    </span>
                    {subStatus === 'running' && (
                      <span className="text-xs text-purple-400">
                        {Math.round(subProgress)}%
                      </span>
                    )}
                    {subStatus === 'success' && (
                      <span className="text-xs text-green-400">完成</span>
                    )}
                  </div>
                  {/* 子进度条 */}
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        subStatus === 'success' && "bg-green-500",
                        subStatus === 'running' && "bg-purple-500",
                        subStatus === 'error' && "bg-red-500",
                        subStatus === 'pending' && "bg-white/10"
                      )}
                      style={{ width: `${subStatus === 'success' ? 100 : subProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 可展开的故事板任务动画卡片
 */
export function StoryboardTaskAnimationExpandable({
  status,
  progress,
  subTasks = [],
  error,
  defaultExpanded = false,
  className,
}: StoryboardTaskAnimationProps & { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || status !== 'success')

  return (
    <div className={cn("space-y-2", className)}>
      {/* 展开/收起按钮 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>收起详情</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>展开详情</span>
          </>
        )}
      </button>

      {/* 动画内容 */}
      {expanded && (
        <StoryboardTaskAnimation
          status={status}
          progress={progress}
          subTasks={subTasks}
          error={error}
        />
      )}
    </div>
  )
}
