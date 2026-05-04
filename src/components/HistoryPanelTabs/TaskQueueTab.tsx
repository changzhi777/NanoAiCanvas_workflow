'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { Bot, Trash2, Copy, Square, RefreshCw, Loader2, Clock, Timer, ChevronUp, ChevronDown, Eye, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '@/stores/remoteStore'
import { useTaskQueueStore } from '@/stores/nanoImageTaskQueueStore'
import { useStoryboardTaskStore } from '@/stores/nanoImageStoryboardTaskStore'
import { getAllTaskItems } from '@/lib/db'
import { StoryboardTaskAnimation } from '@/components/storyboard/StoryboardTaskAnimation'
import type { TaskQueueItem, StoryboardTask, StoryboardTaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}时${minutes}分` : `${hours}小时`
  }
}

// Helper function to calculate elapsed time
function getElapsedTime(createdAt: string): number {
  const start = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.max(0, (now - start) / 1000)
}

// Helper function to estimate remaining time (based on progress)
function getEstimatedTime(createdAt: string, progress: number): number {
  if (progress <= 0) return 0
  const elapsed = getElapsedTime(createdAt)
  // Estimate total time based on current progress
  const estimatedTotal = elapsed / (progress / 100)
  return Math.max(0, estimatedTotal - elapsed)
}

// Storyboard task status mapping
const storyboardStatusConfig: Record<StoryboardTaskStatus, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'bg-yellow-500/20 text-yellow-400' },
  generating_script: { label: '生成剧本', color: 'bg-blue-500/20 text-blue-400' },
  generating_storyboard: { label: '生成故事板', color: 'bg-purple-500/20 text-purple-400' },
  generating_characters: { label: '生成角色', color: 'bg-pink-500/20 text-pink-400' },
  generating_audio: { label: '生成音频', color: 'bg-cyan-500/20 text-cyan-400' },
  success: { label: '完成', color: 'bg-green-500/20 text-green-400' },
  error: { label: '失败', color: 'bg-red-500/20 text-red-400' },
}

interface TaskQueueTabProps {
  onCopyAndExecute: (task: TaskQueueItem) => void
  onViewTask: (task: TaskQueueItem) => void
}

export function TaskQueueTab({ onCopyAndExecute, onViewTask }: TaskQueueTabProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { abortTask } = useTaskQueueStore()
  const {
    tasks: storyboardTasks,
    loadTasks: loadStoryboardTasks,
    loadAssets: loadStoryboardAssets,
    cancelTask: cancelStoryboardTask,
    deleteTask: deleteStoryboardTask,
    runningTaskId,
    subTasks: storyboardSubTasksMap,
  } = useStoryboardTaskStore()
  const [tasks, setTasks] = useState<TaskQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedStoryboardTaskId, setExpandedStoryboardTaskId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 加载所有任务（图片生成 + 故事板）
  const loadTasks = async () => {
    setIsLoading(true)
    try {
      // 并行加载图片生成任务和故事板任务
      const [imageTasks] = await Promise.all([
        user ? getAllTaskItems(user.id) : Promise.resolve([]),
        loadStoryboardTasks(),
        loadStoryboardAssets(),
      ])
      setTasks(imageTasks)
    } catch (error) {
      // 静默处理 - storyboard API 可能未部署
      console.warn('Tasks API not available, skipping load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
    // Refresh every 5 seconds for active tasks
    const interval = setInterval(loadTasks, 5000)
    return () => clearInterval(interval)
  }, [user])

  // Scroll functions
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  const handleTerminate = (task: TaskQueueItem) => {
    if (task.status === 'generating' || task.status === 'pending') {
      abortTask(task.id)
      loadTasks()
    }
  }

  const handleDelete = async (task: TaskQueueItem) => {
    // Delete from session messages
    const { dbDeleteMessage } = await import('@/lib/db')
    await dbDeleteMessage(task.sessionId, task.id)
    loadTasks()
  }

  const handleCopy = (task: TaskQueueItem) => {
    onCopyAndExecute(task)
  }

  const getStatusBadge = (status: TaskQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">等待中</span>
      case 'generating':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">生成中</span>
      case 'success':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">成功</span>
      case 'error':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">失败</span>
      default:
        return null
    }
  }

  const getStoryboardStatusBadge = (status: StoryboardTaskStatus) => {
    const config = storyboardStatusConfig[status] || storyboardStatusConfig.pending
    return <span className={cn("text-xs px-2 py-0.5 rounded", config.color)}>{config.label}</span>
  }

  // Combine tasks and sort by createdAt
  const allTasks = [
    ...tasks.map(t => ({ ...t, type: 'image' as const })),
    ...storyboardTasks.map(t => ({ ...t, type: 'storyboard' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalTasksCount = tasks.length + storyboardTasks.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-muted-foreground">共 {totalTasksCount} 个任务</span>
        <Button variant="ghost" size="sm" onClick={loadTasks} className="h-6 px-2 text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          刷新
        </Button>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-2 relative">
        {allTasks.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">暂无任务记录</div>
        ) : (
          allTasks.map((task) => {
            // Render storyboard task - 使用独立动画组件
            if (task.type === 'storyboard') {
              const sbTask = task as StoryboardTask & { type: 'storyboard' }
              const isRunning = sbTask.id === runningTaskId
              const isActive = sbTask.status !== 'success' && sbTask.status !== 'error'
              const isExpanded = expandedStoryboardTaskId === sbTask.id
              // 从 store 的 Map 中获取子任务数据
              const taskSubTasks = storyboardSubTasksMap.get(sbTask.id) || []

              return (
                <div
                  key={sbTask.id}
                  className="group rounded-md border border-transparent hover:border-white/10 transition-colors bg-gradient-to-r from-purple-500/5 to-pink-500/5 overflow-hidden"
                >
                  {/* 任务头部 - 紧凑模式动画 */}
                  <div className="p-2">
                    <div className="flex items-center gap-2">
                      {/* 使用独立的故事板动画组件（紧凑模式） */}
                      <StoryboardTaskAnimation
                        status={sbTask.status}
                        progress={sbTask.progress}
                        subTasks={taskSubTasks}
                        error={sbTask.error}
                        compact={true}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {getStoryboardStatusBadge(sbTask.status)}
                          <span className="text-[10px] text-purple-300">故事板</span>
                        </div>
                        <div className="text-sm truncate">{sbTask.title}</div>
                      </div>
                      {/* 操作按钮区域 */}
                      <div className="flex items-center gap-1">
                        {/* 终止按钮 - 运行中任务始终显示 */}
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                            onClick={() => cancelStoryboardTask(sbTask.id)}
                            title="终止任务"
                          >
                            <Square className="w-3 h-3" />
                          </Button>
                        )}
                        {/* 其他操作按钮 - hover时显示 */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 预览动画按钮 - 所有任务可用 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-purple-400 hover:bg-purple-500/10"
                            onClick={() => {
                              // 触发事件在预览栏显示故事板动画
                              window.dispatchEvent(
                                new CustomEvent('storyboard:previewTask', {
                                  detail: { task: sbTask, subTasks: taskSubTasks }
                                })
                              )
                            }}
                            title="预览动画"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {/* 查看资产库按钮 - 成功的任务可用 */}
                          {sbTask.status === 'success' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-400 hover:bg-green-500/10"
                              onClick={() => router.push('/storyboard-assets')}
                              title="查看资产库"
                            >
                              <LayoutGrid className="w-3 h-3" />
                            </Button>
                          )}
                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteStoryboardTask(sbTask.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* 时间信息 */}
                    {isActive && (
                      <div className="flex items-center gap-3 mt-1.5 ml-12 text-[10px]">
                        <div className="flex items-center gap-1 text-blue-400">
                          <Clock className="w-3 h-3" />
                          <span>已执行 {formatDuration(getElapsedTime(sbTask.createdAt))}</span>
                        </div>
                        {sbTask.progress > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Timer className="w-3 h-3" />
                            <span>预计 {formatDuration(getEstimatedTime(sbTask.createdAt, sbTask.progress))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 展开详情 - 完整动画模式 */}
                  {isExpanded && (
                    <div className="px-2 pb-2">
                      <StoryboardTaskAnimation
                        status={sbTask.status}
                        progress={sbTask.progress}
                        subTasks={taskSubTasks}
                        error={sbTask.error}
                        compact={false}
                      />
                    </div>
                  )}
                </div>
              )
            }

            // Render image task
            const imgTask = task as TaskQueueItem & { type: 'image' }
            return (
              <div
                key={imgTask.id}
                onClick={() => onViewTask(imgTask)}
                className="group p-2 rounded-md cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(imgTask.status)}
                      {imgTask.model && <span className="text-[10px] text-muted-foreground">{imgTask.model}</span>}
                    </div>
                    <div className="text-sm truncate mb-1">{imgTask.prompt}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{imgTask.sessionTitle}</span>
                      <span>·</span>
                      <span>{new Date(imgTask.createdAt).toLocaleString()}</span>
                    </div>
                    {/* 时间信息显示 */}
                    {(imgTask.status === 'generating' || imgTask.status === 'pending') && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        <div className="flex items-center gap-1 text-blue-400">
                          <Clock className="w-3 h-3" />
                          <span>已执行 {formatDuration(getElapsedTime(imgTask.createdAt))}</span>
                        </div>
                        {imgTask.progress > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Timer className="w-3 h-3" />
                            <span>预计 {formatDuration(getEstimatedTime(imgTask.createdAt, imgTask.progress))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 终止按钮 - 对进行中任务始终显示 */}
                  {(imgTask.status === 'generating' || imgTask.status === 'pending') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTerminate(imgTask)
                      }}
                      title="终止任务"
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  )}
                  {/* 其他操作按钮 - hover时显示 */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(imgTask)
                      }}
                      title="复制再执行"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(imgTask)
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Scroll buttons */}
        {allTasks.length > 3 && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center gap-2 py-2 bg-gradient-to-t from-transparent via-card/80 to-card/95">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20"
            >
              <ChevronUp className="w-3 h-3 mr-1" />
              顶部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToBottom}
              className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              底部
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
