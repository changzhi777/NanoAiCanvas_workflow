/**
 * ShotRefImageNode — 分镜头参考图节点
 * 从上游 StoryboardV2Node 读取 shots[] → 逐镜头生图（1:1 四/六/九宫格）
 */

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Image, Play, Circle, Timer, CheckCircle2, Ban } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import { type ScreenplayShot, type ScreenplayData, prefixResolution } from './StoryboardV2.shared'
import { useImageGeneration } from './useImageGeneration'

export interface ShotRefImageData extends WorkflowNodeData {
  params: { gridSize: '4' | '6' | '9'; quality: string; style: string }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    shots?: Array<ScreenplayShot & { imageUrl?: string }>
    images?: string[]
    startedAt?: string
    completedAt?: string
  }
  error?: string
  _stepInfo?: { step: string; progress: number; message: string }
}

const statusConfig = {
  [NodeStatus.IDLE]: { icon: Circle, label: '未开始', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Timer, label: '生成中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: Ban, label: '已阻塞', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Circle, label: '禁用', cls: 'not-started' },
}

export const ShotRefImageNode = memo(({ id, data }: { id: string; data: ShotRefImageData }) => {
  const { nodes, edges } = useNanoaiWorkflowStore()
  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage, stopExecution,
    emitStep, startGeneration, finishGeneration, handleError,
    createProgressCallbacks, updateNode,
  } = useImageGeneration({ nodeId: id })

  const upstreamShots = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return []
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return (sourceNode?.data?.result?.screenplay as ScreenplayData | undefined)?.shots || []
  }, [edges, nodes, id])

  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon
  const gridSize = data.params?.gridSize || '4'

  const handleExecute = useCallback(async () => {
    if (upstreamShots.length === 0) return

    const { abortController, startedAt } = startGeneration()
    const adapter = getSkillQueueAdapter()
    const totalShots = upstreamShots.length
    const completedShots: Array<ScreenplayShot & { imageUrl?: string }> = []
    const allImages: string[] = []
    const resolutionPrefix = prefixResolution(data.params?.quality || 'hd')

    try {
      for (let idx = 0; idx < totalShots; idx++) {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const shot = upstreamShots[idx]
        const shotPrompt = `${resolutionPrefix}${shot.visual_prompt || shot.description}`
        const startProg = 5 + Math.floor((idx / totalShots) * 90)
        const label = `P${idx + 1}/${totalShots}`

        emitStep('shot_generating', startProg, `镜头 ${label}: ${shot.description?.substring(0, 30)}...`)

        try {
          const { onProgress, onStep } = createProgressCallbacks(startProg, totalShots, label)
          const images = await adapter.generateImage(
            { prompt: shotPrompt, size: '2K' as const, aspectRatio: '1:1', signal: abortController.signal },
            onProgress, onStep,
          )

          if (images[0]) {
            completedShots.push({ ...shot, imageUrl: images[0] })
            allImages.push(images[0])
            updateNode(id, { result: { shots: [...completedShots], images: [...allImages], startedAt } })
          }
        } catch (shotErr: any) {
          console.warn(`Shot P${idx + 1} failed:`, shotErr.message)
        }
      }

      if (allImages.length === 0) throw new Error('所有镜头生成失败')
      finishGeneration({ shots: completedShots, images: allImages, startedAt })
      setStepMessage(`完成！${allImages.length}/${totalShots} 个镜头`)
    } catch (err: any) {
      handleError(err)
    }
  }, [upstreamShots, data.params, startGeneration, emitStep, createProgressCallbacks, finishGeneration, handleError, updateNode, id])

  const completedCount = data.result?.images?.length || 0
  const totalCount = upstreamShots.length

  return (
    <div className="card-node node-appear node-task" style={{ width: 280, willChange: 'auto', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      <div className="node-type-strip" />
      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="shots-in" />

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Image className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-xs">分镜头参考图</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" /><span>{statusInfo.label}</span>
          </Badge>
        </div>
        <Separator className="my-1" />

        {totalCount > 0 ? (
          <div className="text-[10px] text-muted-foreground">待生成 {totalCount} 个镜头 · {gridSize}宫格 · 1:1</div>
        ) : (
          <div className="text-[10px] text-muted-foreground">等待上游分镜头数据...</div>
        )}

        {data.status === NodeStatus.SUCCESS && completedCount > 0 && (
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>{completedCount} 张图片</span><span>·</span><span>{gridSize}宫格</span>
          </div>
        )}

        {data.result?.images && data.result.images.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {data.result.images.slice(0, 3).map((url, i) => (
              <img key={i} src={url} alt={`shot-${i}`} className="w-full aspect-square object-cover rounded border border-white/10" />
            ))}
            {data.result.images.length > 3 && (
              <div className="w-full aspect-square rounded border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground bg-white/5">+{data.result.images.length - 3}</div>
            )}
          </div>
        )}

        {(localError || data.error) && (
          <div className="p-1.5 bg-destructive/10 border border-destructive/20 rounded text-[10px] text-destructive">{localError || data.error}</div>
        )}

        {data.status === NodeStatus.RUNNING && (
          <TaskStepAnimation currentStep={currentStep} progress={stepProgress} stepMessage={stepMessage} startedAt={data.result?.startedAt} onCancel={stopExecution} />
        )}

        {data.status !== NodeStatus.RUNNING && (
          <Button onClick={handleExecute} disabled={data.status === NodeStatus.DISABLED || totalCount === 0} size="sm" className="w-full h-7 text-xs">
            <Play className="w-3 h-3 mr-1" />生成分镜图
          </Button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="images-out" />
    </div>
  )
})

ShotRefImageNode.displayName = 'ShotRefImageNode'
export default ShotRefImageNode
