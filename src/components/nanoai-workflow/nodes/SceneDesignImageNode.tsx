/**
 * SceneDesignImageNode — 场景设计图节点
 * 从上游 StoryboardV2Node 读取 scenes[] → 逐场景生图（16:9，无人物）
 */

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Mountain, Play, Circle, Timer, CheckCircle2, Ban } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import { type SceneDesign, type ScreenplayData, prefixResolution } from './StoryboardV2.shared'
import { useImageGeneration } from './useImageGeneration'

export interface SceneDesignImageData extends WorkflowNodeData {
  params: { quality: string; style: string }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    scenes?: Array<SceneDesign & { imageUrl?: string }>
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

export const SceneDesignImageNode = memo(({ id, data }: { id: string; data: SceneDesignImageData }) => {
  const { nodes, edges } = useNanoaiWorkflowStore()
  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage, stopExecution,
    emitStep, startGeneration, finishGeneration, handleError,
    createProgressCallbacks, updateNode,
  } = useImageGeneration({ nodeId: id })

  const upstreamScenes = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return []
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return (sourceNode?.data?.result?.screenplay as ScreenplayData | undefined)?.scenes || []
  }, [edges, nodes, id])

  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  const handleExecute = useCallback(async () => {
    if (upstreamScenes.length === 0) return

    const { abortController, startedAt } = startGeneration()
    const adapter = getSkillQueueAdapter()
    const resolutionPrefix = prefixResolution(data.params?.quality || 'hd')
    const totalScenes = upstreamScenes.length
    const completedScenes: Array<SceneDesign & { imageUrl?: string }> = []
    const allImages: string[] = []

    try {
      for (let idx = 0; idx < totalScenes; idx++) {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const scene = upstreamScenes[idx]
        const scenePrompt = `${resolutionPrefix}${scene.visual_prompt || scene.description}, no people, no characters, environment only, 16:9 cinematic`
        const startProg = 5 + Math.floor((idx / totalScenes) * 90)
        const label = `S${idx + 1}/${totalScenes}`

        emitStep('scene_generating', startProg, `场景 ${label}: ${scene.location?.substring(0, 25)}...`)

        try {
          const { onProgress, onStep } = createProgressCallbacks(startProg, totalScenes, label)
          const images = await adapter.generateImage(
            { prompt: scenePrompt, size: '2K' as const, aspectRatio: '16:9', signal: abortController.signal },
            onProgress, onStep,
          )

          if (images[0]) {
            completedScenes.push({ ...scene, imageUrl: images[0] })
            allImages.push(images[0])
            updateNode(id, { result: { scenes: [...completedScenes], images: [...allImages], startedAt } })
          }
        } catch (sceneErr: any) {
          console.warn(`Scene S${idx + 1} failed:`, sceneErr.message)
        }
      }

      if (allImages.length === 0) throw new Error('所有场景图生成失败')
      finishGeneration({ scenes: completedScenes, images: allImages, startedAt })
      setStepMessage(`完成！${allImages.length}/${totalScenes} 张场景图`)
    } catch (err: any) {
      handleError(err)
    }
  }, [upstreamScenes, data.params, startGeneration, emitStep, createProgressCallbacks, finishGeneration, handleError, updateNode, id])

  const sceneCount = upstreamScenes.length
  const completedCount = data.result?.images?.length || 0

  return (
    <div className="card-node node-appear node-task" style={{ width: 280, willChange: 'auto', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      <div className="node-type-strip" />
      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="scenes-in" />

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mountain className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-xs">场景设计图</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" /><span>{statusInfo.label}</span>
          </Badge>
        </div>
        <Separator className="my-1" />

        {sceneCount > 0 ? (
          <div className="text-[10px] text-muted-foreground">{sceneCount} 个场景 · 16:9 · 无人物</div>
        ) : (
          <div className="text-[10px] text-muted-foreground">等待上游场景数据...</div>
        )}

        {data.status === NodeStatus.SUCCESS && completedCount > 0 && (
          <div className="flex gap-2 text-[10px] text-muted-foreground"><span>{completedCount} 张图片</span></div>
        )}

        {data.result?.images && data.result.images.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {data.result.images.slice(0, 2).map((url, i) => (
              <img key={i} src={url} alt={`scene-${i}`} className="w-full aspect-video object-cover rounded border border-white/10" />
            ))}
            {data.result.images.length > 2 && (
              <div className="w-full aspect-video rounded border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground bg-white/5">+{data.result.images.length - 2}</div>
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
          <Button onClick={handleExecute} disabled={data.status === NodeStatus.DISABLED || sceneCount === 0} size="sm" className="w-full h-7 text-xs">
            <Play className="w-3 h-3 mr-1" />生成场景图
          </Button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="scenes-out" />
    </div>
  )
})

SceneDesignImageNode.displayName = 'SceneDesignImageNode'
export default SceneDesignImageNode
