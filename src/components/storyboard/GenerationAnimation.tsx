'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { StoryboardSubTask } from '@/types'

interface GenerationAnimationProps {
  isGenerating: boolean
  currentTask?: string
  progress?: number
  subTasks?: StoryboardSubTask[]
  className?: string
}

// 生成动画组件 - Mesh To 风格
export function GenerationAnimation({
  isGenerating,
  currentTask,
  progress = 0,
  subTasks = [],
  className,
}: GenerationAnimationProps) {
  const [dots, setDots] = useState('')
  const [particlePositions, setParticlePositions] = useState<Array<{ x: number; y: number; delay: number }>>([])

  // 点动画
  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [isGenerating])

  // 粒子位置
  useEffect(() => {
    const particles = Array.from({ length: 12 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }))
    setParticlePositions(particles)
  }, [])

  if (!isGenerating) return null

  const progressPercent = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10", className)}>
      {/* 背景粒子动画 */}
      <div className="absolute inset-0 overflow-hidden">
        {particlePositions.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-pulse"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 中心动画圆环 */}
      <div className="relative flex flex-col items-center justify-center py-8 px-4">
        {/* 外圈旋转 */}
        <div className="relative w-24 h-24">
          {/* 旋转环 1 */}
          <div
            className="absolute inset-0 border-2 border-primary/30 rounded-full animate-spin"
            style={{ animationDuration: '3s' }}
          />
          {/* 旋转环 2 */}
          <div
            className="absolute inset-2 border-2 border-pink-500/30 rounded-full animate-spin"
            style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          />
          {/* 旋转环 3 */}
          <div
            className="absolute inset-4 border-2 border-purple-500/30 rounded-full animate-spin"
            style={{ animationDuration: '1.5s' }}
          />

          {/* 中心图标/进度 */}
          <div className="absolute inset-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(progressPercent)}%
              </div>
            </div>
          </div>

          {/* 扫描线效果 */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, rgba(168, 85, 247, 0.3) ${progressPercent}%, transparent ${progressPercent}%)`,
            }}
          />
        </div>

        {/* 状态文字 */}
        <div className="mt-6 text-center">
          <div className="text-sm font-medium text-white">
            {currentTask || '正在生成'}{dots}
          </div>
          <div className="text-xs text-white/50 mt-1">
            故事板生成中
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full max-w-xs mt-4">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-gradient transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 子任务列表 */}
        {subTasks.length > 0 && (
          <div className="w-full max-w-xs mt-4 space-y-1">
            {subTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <SubTaskIcon status={task.status} />
                <span className={cn(
                  "flex-1 truncate",
                  task.status === 'running' && "text-white",
                  task.status === 'success' && "text-green-400",
                  task.status === 'error' && "text-red-400",
                  task.status === 'pending' && "text-white/40"
                )}>
                  {task.label}
                </span>
                {task.status === 'running' && (
                  <span className="text-white/50">{Math.round(task.progress)}%</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  )
}

// 子任务图标
function SubTaskIcon({ status }: { status: StoryboardSubTask['status'] }) {
  switch (status) {
    case 'success':
      return (
        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      )
    case 'running':
      return (
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      )
    case 'error':
      return (
        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-red-400" />
        </div>
      )
    default:
      return (
        <div className="w-4 h-4 rounded-full bg-white/10" />
      )
  }
}

// 简化版动画（用于任务队列列表项）
export function GenerationAnimationMini({
  isGenerating,
  progress = 0,
  className,
}: {
  isGenerating: boolean
  progress?: number
  className?: string
}) {
  if (!isGenerating) return null

  return (
    <div className={cn("relative", className)}>
      {/* 进度圆环 */}
      <div className="relative w-10 h-10">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          {/* 背景圆 */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/10"
          />
          {/* 进度圆 */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progress * 1.005} 100`}
            className="transition-all duration-300"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* 中心百分比 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  )
}
