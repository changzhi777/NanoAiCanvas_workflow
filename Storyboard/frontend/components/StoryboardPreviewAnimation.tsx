'use client'

import { useEffect, useState } from 'react'
import { FileText, LayoutGrid, Users, CheckCircle2, Loader2, ChevronRight, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { StoryboardTaskStatus, StoryboardSubTask } from '@/types'

// 故事板阶段配置
const STORYBOARD_STAGES = {
  script: { label: '生成剧本', order: 1, icon: FileText },
  storyboard: { label: '生成故事板', order: 2, icon: LayoutGrid },
  character: { label: '生成角色设计', order: 3, icon: Users },
}

// 动画网格背景
function AnimatedMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="grid-storyboard" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-storyboard)" />
        {/* Animated dots */}
        {[...Array(12)].map((_, i) => (
          <circle
            key={i}
            r="1"
            fill="currentColor"
            className="text-pink-400 animate-pulse"
            style={{
              animationDelay: `${i * 0.3}s`,
              transform: `translate(${10 + (i % 4) * 25}px, ${10 + Math.floor(i / 4) * 30}px)`,
            }}
          >
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="2s"
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
          </circle>
        ))}
      </svg>
    </div>
  )
}

// 旋转的故事板图标动画
function RotatingStoryboardIcon() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-4" style={{ perspective: '200px' }}>
      <div
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          animation: 'storyboard-rotate 4s linear infinite',
        }}
      >
        {/* 三层卡片效果 */}
        {[
          { bg: 'rgba(168, 85, 247, 0.6)', transform: 'translateZ(30px) rotateY(0deg)', delay: '0s' },
          { bg: 'rgba(236, 72, 153, 0.5)', transform: 'translateZ(20px) rotateY(120deg)', delay: '1.33s' },
          { bg: 'rgba(139, 92, 246, 0.4)', transform: 'translateZ(10px) rotateY(240deg)', delay: '2.66s' },
        ].map((face, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center border border-purple-400/50 rounded-lg"
            style={{
              background: face.bg,
              transform: face.transform,
              backfaceVisibility: 'hidden',
            }}
          >
            {i === 0 && <FileText className="w-8 h-8 text-white" />}
            {i === 1 && <LayoutGrid className="w-8 h-8 text-white" />}
            {i === 2 && <Users className="w-8 h-8 text-white" />}
          </div>
        ))}
      </div>
      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes storyboard-rotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  )
}

// 阶段指示器
interface StageIndicatorProps {
  stageId: string
  stageInfo: { label: string; order: number; icon: React.ComponentType<{ className?: string }> }
  status: 'pending' | 'running' | 'success' | 'error'
  progress: number
}

function StageIndicator({ stageId, stageInfo, status, progress }: StageIndicatorProps) {
  const Icon = stageInfo.icon

  return (
    <div className={cn(
      "flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300",
      status === 'running' && "bg-purple-500/20 border border-purple-500/30",
      status === 'success' && "bg-green-500/10 border border-green-500/20",
      status === 'error' && "bg-red-500/10 border border-red-500/20",
      status === 'pending' && "bg-slate-800/30 border border-transparent"
    )}>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        status === 'running' && "bg-purple-500 text-white animate-pulse",
        status === 'success' && "bg-green-500/50 text-white",
        status === 'error' && "bg-red-500/50 text-white",
        status === 'pending' && "bg-slate-700 text-slate-400"
      )}>
        {status === 'success' ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === 'running' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'error' ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs font-medium",
            status === 'running' && "text-purple-300",
            status === 'success' && "text-green-400",
            status === 'error' && "text-red-400",
            status === 'pending' && "text-slate-500"
          )}>
            {stageInfo.label}
          </span>
          {status === 'running' && (
            <span className="text-xs text-purple-400 font-mono">{Math.round(progress)}%</span>
          )}
          {status === 'success' && (
            <span className="text-xs text-green-400">完成</span>
          )}
        </div>
        {/* 子进度条 */}
        {status === 'running' && (
          <Progress
            value={progress}
            className="h-1 mt-1 bg-slate-700/50"
          />
        )}
      </div>
    </div>
  )
}

interface StoryboardPreviewAnimationProps {
  status: StoryboardTaskStatus
  progress: number
  subTasks: StoryboardSubTask[]
  error?: string
  title?: string
  createdAt?: string
}

export function StoryboardPreviewAnimation({
  status,
  progress,
  subTasks,
  error,
  title = '故事板生成',
  createdAt,
}: StoryboardPreviewAnimationProps) {
  const [dots, setDots] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  const isActive = status !== 'success' && status !== 'error'

  // 动态省略号
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [isActive])

  // 计时器
  useEffect(() => {
    if (!isActive || !createdAt) return
    const timer = setInterval(() => {
      const start = new Date(createdAt).getTime()
      const elapsed = Math.floor((Date.now() - start) / 1000)
      setElapsedTime(elapsed)
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive, createdAt])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}分${secs}秒`
    }
    return `${secs}秒`
  }

  // 获取子任务状态
  const getSubTaskStatus = (taskId: string): StoryboardSubTask['status'] => {
    const subTask = subTasks.find(t => t.id === taskId)
    return subTask?.status || 'pending'
  }

  const getSubTaskProgress = (taskId: string): number => {
    const subTask = subTasks.find(t => t.id === taskId)
    return subTask?.progress || 0
  }

  // 获取当前阶段
  const getCurrentStageId = (): string => {
    if (status === 'generating_script') return 'script'
    if (status === 'generating_storyboard') return 'storyboard'
    if (status === 'generating_characters') return 'character'
    return 'script'
  }

  const currentStageId = getCurrentStageId()

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-900/95 via-pink-900/90 to-purple-900/95 backdrop-blur-xl rounded-xl overflow-hidden">
      {/* 背景动画 */}
      <AnimatedMeshBackground />

      <div className="relative flex-1 flex flex-col p-4">
        {/* 头部 - 旋转图标 */}
        <div className="text-center py-2">
          {isActive ? (
            <>
              <RotatingStoryboardIcon />
              <div className="flex items-center justify-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-white">
                  {title}{dots}
                </h3>
                {createdAt && (
                  <div className="flex items-center gap-1.5 bg-purple-500/20 px-2 py-0.5 rounded-full">
                    <svg className="w-3.5 h-3.5 text-purple-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6 6z" />
                    </svg>
                    <span className="text-xs text-purple-400 font-mono font-medium">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-purple-300">
                {status === 'pending' ? '等待中...' :
                 status === 'generating_script' ? '正在生成剧本...' :
                 status === 'generating_storyboard' ? '正在生成故事板...' :
                 status === 'generating_characters' ? '正在生成角色设计...' : '处理中...'}
              </p>
            </>
          ) : (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                {status === 'success' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {status === 'success' ? '生成完成' : '生成失败'}
              </h3>
              {error && (
                <p className="text-xs text-red-400 max-w-xs mx-auto">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* 总进度条 */}
        {isActive && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-purple-400 font-medium">总进度</span>
              <span className="text-white font-mono">{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-slate-700/50"
            />
          </div>
        )}

        {/* 阶段指示器 */}
        <div className="space-y-2 flex-1">
          {Object.entries(STORYBOARD_STAGES).map(([stageId, stageInfo]) => (
            <StageIndicator
              key={stageId}
              stageId={stageId}
              stageInfo={stageInfo}
              status={getSubTaskStatus(stageId)}
              progress={getSubTaskProgress(stageId)}
            />
          ))}
        </div>

        {/* 提示 */}
        {isActive && (
          <div className="text-center pt-3 border-t border-purple-700/50 mt-4">
            <p className="text-[10px] text-purple-400">
              💡 故事板生成通常需要 1-3 分钟，请耐心等待
            </p>
          </div>
        )}

        {/* 成功后的操作提示 */}
        {status === 'success' && (
          <div className="text-center pt-3 border-t border-green-700/30 mt-4">
            <p className="text-xs text-green-400">
              ✅ 可以在资产库中查看生成的故事板
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
