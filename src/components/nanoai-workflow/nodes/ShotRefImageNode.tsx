/**
 * ShotRefImageNode — 分镜头参考图节点
 * 从上游 StoryboardV2Node 读取 shots[] → 并行生图（1:1 四/六/九宫格）
 */

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Image, Play } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import { type ScreenplayShot, type ScreenplayData } from './StoryboardV2.shared'
import { useImageGeneration } from './useImageGeneration'
import { statusConfig } from './nodeStatusConfig'
import { buildImagePrompt } from './promptBuilder'

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

export const ShotRefImageNode = memo(({ id, data }: { id: string; data: ShotRefImageData }) => {
  const nodes = useNanoaiWorkflowStore(s => s.nodes)
  const edges = useNanoaiWorkflowStore(s => s.edges)
  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage, stopExecution,
    startGeneration, finishGeneration, handleError,
    runParallel, updateNode,
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
    const quality = data.params?.quality || 'hd'
    const style = data.params?.style || 'realistic'

    const tasks = upstreamShots.map((shot, idx) => ({
      label: `P${idx + 1}/${upstreamShots.length}`,
      execute: async (): Promise<{ shot: ScreenplayShot & { imageUrl?: string }; image: string } | null> => {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const shotPrompt = buildImagePrompt(shot.visual_prompt || shot.description, {
          quality, style, aspectRatio: '1:1', camera: shot.camera_angle, mood: shot.mood,
        })
        const images = await adapter.generateImage(
          { prompt: shotPrompt, size: '2K' as const, aspectRatio: '1:1', signal: abortController.signal },
          () => {},
        )

        if (images[0]) {
          return { shot: { ...shot, imageUrl: images[0] }, image: images[0] }
        }
        return null
      },
    }))

    try {
      const results = await runParallel(tasks)
      const completedShots = results.map(r => r!.shot)
      const allImages = results.map(r => r!.image)

      finishGeneration({ shots: completedShots, images: allImages, startedAt })
      setStepMessage(`完成！${allImages.length}/${upstreamShots.length} 个镜头`)
    } catch (err: any) {
      handleError(err)
    }
  }, [upstreamShots, data.params, startGeneration, runParallel, finishGeneration, handleError, updateNode, id])

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
