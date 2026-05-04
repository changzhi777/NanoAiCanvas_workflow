'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Play, Pause, Square, Copy, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTaskQueueStore } from '@/stores/nanoImageTaskQueueStore'
import { useAuthStore } from '@/stores/remoteStore'
import { getAdapter } from '@/lib/api/adapters'
import { buildPrompt } from '@/lib/constants/presets'
import { IMAGE_MODEL_OPTIONS } from '@/lib/constants/presets'
import type { ImageModelId, FullGenerationParams } from '@/types/image'

interface BatchTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // 当前生成面板的参数
  currentParams: {
    model: ImageModelId
    size: '1K' | '2K' | '4K'
    aspectRatio: string
    style: string
    shotType: string
    cameraAngle: string
    lensType: string
    focus: string
    lighting: string
    technical: string
    cameraModel: string
    atmosphere: string
    quality: string
    saturation: string
    contrast: string
    noise: string
  }
}

interface PromptItem {
  id: string
  text: string
}

export function BatchTaskDialog({ open, onOpenChange, currentParams }: BatchTaskDialogProps) {
  const { user } = useAuthStore()
  const {
    addBatchTask,
    batchQueue,
    removeBatchTask,
    clearBatchQueue,
    isBatchExecuting,
    startBatchExecution,
    pauseBatchExecution,
    stopBatchExecution,
    updateBatchItem,
    updateBatchTask,
  } = useTaskQueueStore()

  const [taskName, setTaskName] = useState('')
  const [prompts, setPrompts] = useState<PromptItem[]>([
    { id: crypto.randomUUID(), text: '' }
  ])
  const [selectedModel, setSelectedModel] = useState<ImageModelId>(currentParams.model)

  // 添加 prompt 行
  const addPromptLine = useCallback(() => {
    setPrompts((prev) => [...prev, { id: crypto.randomUUID(), text: '' }])
  }, [])

  // 删除 prompt 行
  const removePromptLine = useCallback((id: string) => {
    setPrompts((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  // 更新 prompt 内容
  const updatePromptText = useCallback((id: string, text: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, text } : p))
    )
  }, [])

  // 复制 prompt 行
  const duplicatePromptLine = useCallback((id: string) => {
    setPrompts((prev) => {
      const index = prev.findIndex((p) => p.id === id)
      if (index === -1) return prev
      const newItem = { id: crypto.randomUUID(), text: prev[index].text }
      const newPrompts = [...prev]
      newPrompts.splice(index + 1, 0, newItem)
      return newPrompts
    })
  }, [])

  // 从文本导入（每行一个 prompt）
  const importFromText = useCallback((text: string) => {
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length === 0) return
    setPrompts(lines.map((line) => ({ id: crypto.randomUUID(), text: line.trim() })))
  }, [])

  // 创建批量任务
  const handleCreateBatch = useCallback(() => {
    const validPrompts = prompts.filter((p) => p.text.trim())
    if (validPrompts.length === 0) {
      toast.error('请输入至少一个提示词')
      return
    }

    if (!user?.id || !user.imageApiKey) {
      toast.error('请先登录')
      return
    }

    const params: Omit<FullGenerationParams, 'prompt' | 'model'> = {
      size: currentParams.size,
      aspectRatio: currentParams.aspectRatio,
      style: currentParams.style as any,
      shotType: currentParams.shotType as any,
      cameraAngle: currentParams.cameraAngle as any,
      lensType: currentParams.lensType as any,
      focus: currentParams.focus as any,
      lighting: currentParams.lighting as any,
      technical: currentParams.technical as any,
      cameraModel: currentParams.cameraModel as any,
      atmosphere: currentParams.atmosphere as any,
      quality: currentParams.quality as any,
      saturation: currentParams.saturation as any,
      contrast: currentParams.contrast as any,
      noise: currentParams.noise as any,
    }

    addBatchTask({
      name: taskName || `批量任务 ${new Date().toLocaleTimeString()}`,
      prompts: validPrompts.map((p) => p.text),
      model: selectedModel,
      params,
    })

    toast.success(`已添加批量任务，包含 ${validPrompts.length} 个提示词`)
    setPrompts([{ id: crypto.randomUUID(), text: '' }])
    setTaskName('')
  }, [prompts, taskName, selectedModel, currentParams, user, addBatchTask])

  // 执行单个任务
  const executeSingleTask = useCallback(async (
    prompt: string,
    model: ImageModelId,
    params: Omit<FullGenerationParams, 'prompt' | 'model'>,
    taskId: string,
    itemId: string
  ) => {
    if (!user?.imageApiKey) {
      updateBatchItem(taskId, itemId, { status: 'failed', error: '未登录' })
      return
    }

    updateBatchItem(taskId, itemId, { status: 'running', progress: 0 })

    const adapter = getAdapter(model)
    const fullPrompt = buildPrompt(prompt, {
      style: params.style as string,
      shotType: params.shotType as string,
      cameraAngle: params.cameraAngle as string,
      lensType: params.lensType as string,
      focus: params.focus as string,
      lighting: params.lighting as string,
      technical: params.technical as string,
      cameraModel: params.cameraModel as string,
      atmosphere: params.atmosphere as string,
      quality: params.quality as string,
      saturation: params.saturation as string,
      contrast: params.contrast as string,
      noise: params.noise as string,
    })

    try {
      const images = await adapter.generateImage(
        {
          prompt: fullPrompt,
          model,
          size: params.size,
          aspectRatio: params.aspectRatio,
        },
        (progress) => {
          updateBatchItem(taskId, itemId, { progress })
        }
      )

      updateBatchItem(taskId, itemId, {
        status: 'completed',
        progress: 100,
        result: images,
      })

      // 更新任务进度
      const task = batchQueue.find((t) => t.id === taskId)
      if (task) {
        const completedCount = task.items.filter(
          (i) => i.status === 'completed' || i.id === itemId
        ).length
        const progress = Math.round((completedCount / task.items.length) * 100)
        updateBatchTask(taskId, { progress, currentIndex: completedCount })
      }

      toast.success(`生成成功: ${prompt.substring(0, 20)}...`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败'
      updateBatchItem(taskId, itemId, { status: 'failed', error: errorMessage })
    }
  }, [user, updateBatchItem, updateBatchTask, batchQueue])

  // 开始执行批量任务
  const handleStartBatch = useCallback(async () => {
    const pendingTasks = batchQueue.filter((t) => t.status === 'pending')
    if (pendingTasks.length === 0) {
      toast.error('没有待执行的批量任务')
      return
    }

    startBatchExecution()

    for (const task of pendingTasks) {
      if (!isBatchExecuting) break

      for (const item of task.items) {
        if (!isBatchExecuting || item.status !== 'pending') break
        await executeSingleTask(item.prompt, task.model, task.params, task.id, item.id)
      }
    }

    // 更新任务状态
    const allCompleted = batchQueue.every((t) =>
      t.items.every((i) => i.status === 'completed' || i.status === 'failed')
    )
    if (allCompleted) {
      toast.success('批量任务全部完成')
    }

    stopBatchExecution()
  }, [batchQueue, isBatchExecuting, startBatchExecution, stopBatchExecution, executeSingleTask])

  // 批量任务列表
  const renderBatchList = () => (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {batchQueue.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          暂无批量任务
        </div>
      ) : (
        batchQueue.map((task) => (
          <div
            key={task.id}
            className="p-3 bg-white/5 rounded-lg border border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{task.name}</span>
                <span className="text-xs text-muted-foreground">
                  {task.items.length} 个任务
                </span>
              </div>
              <div className="flex items-center gap-1">
                {task.status === 'pending' && (
                  <span className="px-2 py-0.5 text-xs bg-muted rounded">待执行</span>
                )}
                {task.status === 'running' && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">执行中</span>
                )}
                {task.status === 'completed' && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">完成</span>
                )}
                {task.status === 'paused' && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">已暂停</span>
                )}
                <span className="text-xs text-muted-foreground ml-2">
                  {task.progress}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeBatchTask(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {/* 任务进度条 */}
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            {/* 子任务列表 */}
            <div className="mt-2 space-y-1">
              {task.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-xs"
                >
                  {item.status === 'pending' && <div className="w-2 h-2 rounded-full bg-muted" />}
                  {item.status === 'running' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  {item.status === 'completed' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                  {item.status === 'failed' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  <span className="truncate text-muted-foreground">
                    {item.prompt.substring(0, 30)}...
                  </span>
                </div>
              ))}
              {task.items.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  还有 {task.items.length - 3} 个任务...
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>批量任务</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 任务名称 */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              任务名称（可选）
            </label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="给批量任务起个名字..."
            />
          </div>

          {/* 模型选择 */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              生成模型
            </label>
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ImageModelId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt 列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">
                提示词列表
              </label>
              <Button variant="ghost" size="sm" onClick={addPromptLine}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {prompts.map((prompt, index) => (
                <div key={prompt.id} className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
                  <Textarea
                    value={prompt.text}
                    onChange={(e) => updatePromptText(prompt.id, e.target.value)}
                    placeholder={`输入第 ${index + 1} 个提示词...`}
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => duplicatePromptLine(prompt.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removePromptLine(prompt.id)}
                      disabled={prompts.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground p-0"
                onClick={() => {
                  const text = prompts.map((p) => p.text).join('\n')
                  importFromText(text)
                }}
              >
                从现有提示词导入
              </Button>
            </div>
          </div>

          {/* 批量任务列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">
                任务队列 ({batchQueue.length})
              </label>
              {batchQueue.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={clearBatchQueue}
                >
                  清空
                </Button>
              )}
            </div>
            {renderBatchList()}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center gap-2 w-full">
            {isBatchExecuting ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={pauseBatchExecution}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  暂停
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={stopBatchExecution}
                >
                  <Square className="h-4 w-4 mr-1" />
                  停止
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCreateBatch}
                  disabled={prompts.filter((p) => p.text.trim()).length === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加到队列
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                  onClick={handleStartBatch}
                  disabled={batchQueue.length === 0}
                >
                  <Play className="h-4 w-4 mr-1" />
                  开始执行
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
