/**
 * SceneDesignImageNode — 场景设计图节点
 * 从上游 StoryboardV2Node 读取 scenes[] → 并行生图（16:9，无人物）
 */

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Mountain, Play } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import { type SceneDesign, type ScreenplayData } from './StoryboardV2.shared'
import { useImageGeneration } from './useImageGeneration'
import { statusConfig } from './nodeStatusConfig'
import { buildScenePrompt } from './promptBuilder'

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

export const SceneDesignImageNode = memo(({ id, data }: { id: string; data: SceneDesignImageData }) => {
  const nodes = useNanoaiWorkflowStore(s => s.nodes)
  const edges = useNanoaiWorkflowStore(s => s.edges)
  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage, stopExecution,
    startGeneration, finishGeneration, handleError,
    runParallel,
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
    const quality = data.params?.quality || 'hd'
    const style = data.params?.style || 'realistic'

    const tasks = upstreamScenes.map((scene, idx) => ({
      label: `S${idx + 1}/${upstreamScenes.length}`,
      execute: async (): Promise<{ scene: SceneDesign & { imageUrl?: string }; image: string } | null> => {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const scenePrompt = buildScenePrompt(scene.visual_prompt || scene.description, {
          quality, style, aspectRatio: '16:9', mood: scene.mood,
        })
        const images = await adapter.generateImage(
          { prompt: scenePrompt, size: '2K' as const, aspectRatio: '16:9', signal: abortController.signal },
          () => {},
        )

        if (images[0]) {
          return { scene: { ...scene, imageUrl: images[0] }, image: images[0] }
        }
        return null
      },
    }))

    try {
      const results = await runParallel(tasks)
      const completedScenes = results.map(r => r!.scene)
      const allImages = results.map(r => r!.image)

      finishGeneration({ scenes: completedScenes, images: allImages, startedAt })
      setStepMessage(`完成！${allImages.length}/${upstreamScenes.length} 张场景图`)
    } catch (err: any) {
      handleError(err)
    }
  }, [upstreamScenes, data.params, startGeneration, runParallel, finishGeneration, handleError, id])

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
