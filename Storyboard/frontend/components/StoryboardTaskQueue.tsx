'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clapperboard,
  X,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  ChevronDown,
} from 'lucide-react'
import { useStoryboardTaskStore } from '@/stores/storyboardTaskStore'
import { GenerationAnimationMini } from '@/components/storyboard/GenerationAnimation'
import type { StoryboardTask, StoryboardAsset, StoryboardSubTask } from '@/types'
import { cn } from '@/lib/utils'

// 任务状态映射
const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'text-muted-foreground' },
  generating_script: { label: '生成剧本', color: 'text-yellow-400' },
  generating_storyboard: { label: '生成故事板', color: 'text-purple-400' },
  generating_characters: { label: '生成角色', color: 'text-pink-400' },
  generating_audio: { label: '生成音频', color: 'text-blue-400' },
  success: { label: '完成', color: 'text-green-400' },
  error: { label: '失败', color: 'text-red-400' },
}

// 子任务状态映射
const subTaskLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'text-muted-foreground' },
  running: { label: '进行中', color: 'text-yellow-400' },
  success: { label: '完成', color: 'text-green-400' },
  error: { label: '失败', color: 'text-red-400' },
}

// 默认用户ID（单用户模式）
const DEFAULT_USER_ID = 'changzhi'

interface StoryboardTaskQueueProps {
  onViewAsset?: (asset: StoryboardAsset) => void
}

export function StoryboardTaskQueue({ onViewAsset }: StoryboardTaskQueueProps) {
  const {
    tasks,
    completedAssets,
    loadTasks,
    loadAssets,
    cancelTask,
    deleteTask,
    deleteAsset,
    runningTaskId,
    subTasks,
    showCompletionToast,
    dismissCompletionToast,
  } = useStoryboardTaskStore()

  // 组件加载时获取数据（不依赖 authStore hydration）
  useEffect(() => {
    loadTasks()
    loadAssets()
  }, [loadTasks, loadAssets])

  // 刷新列表
  const handleRefresh = () => {
    loadTasks()
    loadAssets()
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">故事板任务</span>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleRefresh}>
          刷新
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* 运行中的任务 */}
          {tasks.filter(t => t.status !== 'success' && t.status !== 'error').length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground px-1">进行中</div>
              {tasks
                .filter(t => t.status !== 'success' && t.status !== 'error')
                .map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isRunning={task.id === runningTaskId}
                    subTasks={subTasks.get(task.id)}
                    onCancel={() => cancelTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
            </div>
          )}

          {/* 已完成的任务/智能图库 */}
          {completedAssets.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-xs text-muted-foreground px-1">智能图库 · 故事板</div>
              {completedAssets.map(asset => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onView={() => onViewAsset?.(asset)}
                  onDelete={() => deleteAsset(asset.id)}
                />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {tasks.length === 0 && completedAssets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">暂无故事板任务</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 完成提示 Toast */}
      {showCompletionToast && (
        <div className="flex-shrink-0 p-2 bg-green-500/10 border-t border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <Check className="w-4 h-4" />
            <span>故事板已自动保存到资产库中</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-auto"
              onClick={dismissCompletionToast}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 任务项组件
function TaskItem({
  task,
  isRunning,
  subTasks,
  onCancel,
  onDelete,
}: {
  task: StoryboardTask
  isRunning: boolean
  subTasks?: StoryboardSubTask[]
  onCancel: () => void
  onDelete: () => void
}) {
  const status = statusLabels[task.status] || statusLabels.pending
  const [expanded, setExpanded] = useState(isRunning) // 运行中默认展开

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {task.title}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-[10px]", status.color)}>
                {isRunning && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                {status.label}
              </span>
              {task.progress > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {task.progress.toFixed(0)}%
                </span>
              )}
            </div>
            {/* 进度条 */}
            {isRunning && task.progress > 0 && (
              <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isRunning && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onCancel}>
                <X className="w-3 h-3 mr-1" />
                取消
              </Button>
            )}
            {!isRunning && task.status === 'error' && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-400" onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
            {/* 展开/收起按钮 */}
            {subTasks && subTasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 子任务列表 */}
      {expanded && subTasks && (
        <div className="border-t border-white/5 bg-black/20">
          {/* 生成动画 */}
          {isRunning && (
            <GenerationAnimationMini
              isGenerating={isRunning}
              progress={task.progress}
            />
          )}

          {/* 子任务列表 */}
          <div className="p-2 space-y-1">
            {subTasks.map(subTask => (
              <SubTaskItem key={subTask.id} subTask={subTask} />
            ))}
          </div>
        </div>
      )}

      {task.error && (
        <div className="text-[10px] text-red-400 px-2 pb-2 truncate">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {task.error}
        </div>
      )}
    </div>
  )
}

// 子任务项组件
function SubTaskItem({ subTask }: { subTask: StoryboardSubTask }) {
  const status = subTaskLabels[subTask.status] || subTaskLabels.pending

  return (
    <div className="flex items-center gap-2 p-1.5 rounded bg-white/5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[10px]", status.color)}>
            {subTask.status === 'running' && (
              <Loader2 className="w-2.5 h-2.5 animate-spin inline" />
            )}
            {subTask.status === 'success' && (
              <Check className="w-2.5 h-2.5 inline" />
            )}
            {subTask.status === 'error' && (
              <AlertCircle className="w-2.5 h-2.5 inline" />
            )}
            {subTask.label}
          </span>
          {subTask.progress > 0 && subTask.progress < 100 && (
            <span className="text-[10px] text-muted-foreground">
            {subTask.progress.toFixed(0)}%
          </span>
          )}
        </div>
      </div>
      {/* 子任务进度条 */}
      {subTask.status === 'running' && subTask.progress > 0 && (
        <div className="w-16 bg-muted rounded-full h-0.5 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${subTask.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// 资产项组件
function AssetItem({
  asset,
  onView,
  onDelete,
}: {
  asset: StoryboardAsset
  onView: () => void
  onDelete: () => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground truncate">
            {asset.title}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
            {asset.synopsis || '暂无梗概'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-green-400">
              <Check className="w-3 h-3 inline mr-0.5" />
              已完成
            </span>
            <span className="text-[10px] text-muted-foreground">
              {asset.storyboardImages?.length || 0}张故事板
            </span>
            <span className="text-[10px] text-muted-foreground">
              {asset.characterDesigns?.length || 0}张角色图
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onView}>
            <Eye className="w-3 h-3 mr-1" />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 预览缩略图 */}
      {asset.storyboardImages?.length > 0 && (
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {asset.storyboardImages.slice(0, 3).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`故事板${i + 1}`}
              className="w-12 h-12 rounded object-cover flex-shrink-0"
            />
          ))}
          {asset.storyboardImages.length > 3 && (
            <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
              +{asset.storyboardImages.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
