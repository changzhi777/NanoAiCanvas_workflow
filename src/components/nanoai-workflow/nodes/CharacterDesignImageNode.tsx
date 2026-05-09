/**
 * CharacterDesignImageNode — 人物角色设计图节点
 * 从上游 StoryboardV2Node 读取 characters[] → 逐角色生成图片（16:9, 站姿3+特写2+服饰2）
 */

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Users, Play } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import { type CharacterDesign, type ScreenplayData, prefixResolution } from './StoryboardV2.shared'
import { useImageGeneration } from './useImageGeneration'
import { statusConfig } from './nodeStatusConfig'

export interface CharDesignResultItem {
  characterName: string
  type: 'pose' | 'expression' | 'outfit'
  index: number
  prompt: string
  imageUrl?: string
}

export interface CharacterDesignImageData extends WorkflowNodeData {
  params: { quality: string; style: string }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    items?: CharDesignResultItem[]
    images?: string[]
    startedAt?: string
    completedAt?: string
  }
  error?: string
  _stepInfo?: { step: string; progress: number; message: string }
}

function buildCharacterPrompts(char: CharacterDesign, resolutionPrefix: string) {
  const tasks: Array<{ type: CharDesignResultItem['type']; index: number; prompt: string }> = []
  const desc = char.description ? `, ${char.description}` : ''

  char.pose_prompts?.forEach((p, i) => {
    tasks.push({ type: 'pose', index: i, prompt: `${resolutionPrefix}${p}, character full body standing${desc}` })
  })
  char.expression_prompts?.forEach((p, i) => {
    tasks.push({ type: 'expression', index: i, prompt: `${resolutionPrefix}${p}, character face close-up${desc}` })
  })
  char.outfit_prompts?.forEach((p, i) => {
    tasks.push({ type: 'outfit', index: i, prompt: `${resolutionPrefix}${p}, character outfit detail${desc}` })
  })

  if (tasks.length === 0) {
    tasks.push({ type: 'pose', index: 0, prompt: `${resolutionPrefix}${char.description}, full body standing pose, front view, 16:9` })
    tasks.push({ type: 'pose', index: 1, prompt: `${resolutionPrefix}${char.description}, full body standing pose, side view, 16:9` })
    tasks.push({ type: 'pose', index: 2, prompt: `${resolutionPrefix}${char.description}, full body standing pose, back view, 16:9` })
  }

  return tasks
}

export const CharacterDesignImageNode = memo(({ id, data }: { id: string; data: CharacterDesignImageData }) => {
  const nodes = useNanoaiWorkflowStore(s => s.nodes)
  const edges = useNanoaiWorkflowStore(s => s.edges)
  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage, stopExecution,
    emitStep, startGeneration, finishGeneration, handleError,
    createProgressCallbacks, updateNode,
  } = useImageGeneration({ nodeId: id })

  const upstreamCharacters = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return []
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return (sourceNode?.data?.result?.screenplay as ScreenplayData | undefined)?.characters || []
  }, [edges, nodes, id])

  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  const handleExecute = useCallback(async () => {
    if (upstreamCharacters.length === 0) return

    const { abortController, startedAt } = startGeneration()
    const adapter = getSkillQueueAdapter()
    const resolutionPrefix = prefixResolution(data.params?.quality || 'hd')

    const allTasks: Array<{ characterName: string; type: CharDesignResultItem['type']; index: number; prompt: string }> = []
    upstreamCharacters.forEach(char => {
      buildCharacterPrompts(char, resolutionPrefix).forEach(p => {
        allTasks.push({ characterName: char.name, ...p })
      })
    })

    const totalTasks = allTasks.length
    const completedItems: CharDesignResultItem[] = []
    const allImages: string[] = []

    try {
      for (let idx = 0; idx < totalTasks; idx++) {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const task = allTasks[idx]
        const startProg = 5 + Math.floor((idx / totalTasks) * 90)
        const typeLabel = task.type === 'pose' ? '站姿' : task.type === 'expression' ? '表情' : '服饰'
        const label = `${task.characterName} ${typeLabel}${task.index + 1}`

        emitStep('char_generating', startProg, `${label} (${idx + 1}/${totalTasks})`)

        try {
          const { onProgress, onStep } = createProgressCallbacks(startProg, totalTasks, label)
          const images = await adapter.generateImage(
            { prompt: task.prompt, size: '2K' as const, aspectRatio: '16:9', signal: abortController.signal },
            onProgress, onStep,
          )

          if (images[0]) {
            completedItems.push({ characterName: task.characterName, type: task.type, index: task.index, prompt: task.prompt, imageUrl: images[0] })
            allImages.push(images[0])
            updateNode(id, { result: { items: [...completedItems], images: [...allImages], startedAt } })
          }
        } catch (taskErr: any) {
          console.warn(`Char design task failed:`, taskErr.message)
        }
      }

      if (allImages.length === 0) throw new Error('所有角色图生成失败')
      finishGeneration({ items: completedItems, images: allImages, startedAt })
      setStepMessage(`完成！${allImages.length} 张角色设计图`)
    } catch (err: any) {
      handleError(err)
    }
  }, [upstreamCharacters, data.params, startGeneration, emitStep, createProgressCallbacks, finishGeneration, handleError, updateNode, id])

  const charCount = upstreamCharacters.length
  const completedCount = data.result?.images?.length || 0

  return (
    <div className="card-node node-appear node-task" style={{ width: 280, willChange: 'auto', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      <div className="node-type-strip" />
      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="chars-in" />

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-xs">人物角色设计图</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" /><span>{statusInfo.label}</span>
          </Badge>
        </div>
        <Separator className="my-1" />

        {charCount > 0 ? (
          <div className="text-[10px] text-muted-foreground">{charCount} 个角色 · 16:9 · 站姿3+特写2+服饰2</div>
        ) : (
          <div className="text-[10px] text-muted-foreground">等待上游角色数据...</div>
        )}

        {data.status === NodeStatus.SUCCESS && completedCount > 0 && (
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>{completedCount} 张图片</span><span>·</span><span>{charCount} 个角色</span>
          </div>
        )}

        {data.result?.images && data.result.images.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {data.result.images.slice(0, 3).map((url, i) => (
              <img key={i} src={url} alt={`char-${i}`} className="w-full aspect-video object-cover rounded border border-white/10" />
            ))}
            {data.result.images.length > 3 && (
              <div className="w-full aspect-video rounded border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground bg-white/5">+{data.result.images.length - 3}</div>
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
          <Button onClick={handleExecute} disabled={data.status === NodeStatus.DISABLED || charCount === 0} size="sm" className="w-full h-7 text-xs">
            <Play className="w-3 h-3 mr-1" />生成角色图
          </Button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="chars-out" />
    </div>
  )
})

CharacterDesignImageNode.displayName = 'CharacterDesignImageNode'
export default CharacterDesignImageNode
