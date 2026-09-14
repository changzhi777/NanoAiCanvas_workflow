/**
 * 故事板分镜V1版 节点 — 分镜头流水线版
 * 流程：提示词 → GLM生成分镜头脚本 → 并行生图 → 汇总输出到预览节点
 */

import { memo, useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import {
  ClipboardList, Play,
} from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter } from '@/lib/api/adapters/SkillQueueAdapter'
import {
  DEFAULT_PARAMS, NODE_DIMENSIONS,
  type AspectRatio, type LayoutDirection, type StoryboardShot,
  generateStoryboardScript,
} from './StoryboardShotA.shared'
import { useImageGeneration } from './useImageGeneration'
import { statusConfig } from './nodeStatusConfig'
import { buildImagePrompt } from './promptBuilder'

// ==================== 类型定义 ====================

export type { AspectRatio, LayoutDirection }
export type { StoryboardShot }

export interface StoryboardShotAData extends WorkflowNodeData {
  params: {
    inputText: string
    size: string
    quality: string
    style: string
    batchCount: number
    shotCount: number
    layoutDirection: LayoutDirection
    temperature: number
    systemPromptTemplate: string
    model: string
    aspectRatio: AspectRatio
    _optimizedPrompt?: string
    _editablePrompt?: string
  }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    images?: string[]
    imageUrl?: string
    rawPrompt?: string
    optimizedPrompt?: string
    prompt?: string
    shots?: StoryboardShot[]
    scriptTitle?: string
    startedAt?: string
    completedAt?: string
  }
  error?: string
  _stepInfo?: { step: string; progress: number; message: string }
}

// ==================== 主组件 ====================

export const StoryboardShotANode = memo(({ id, data }: { id: string; data: StoryboardShotAData }) => {
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const stopExecution = useNanoaiWorkflowStore(s => s.stopExecution)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputText, setInputText] = useState(data.params?.inputText || '')

  const {
    localError, currentStep, stepProgress, stepMessage, setStepMessage,
    startGeneration, finishGeneration, handleError,
    runParallel,
  } = useImageGeneration({ nodeId: id })

  const optimizedPrompt = data.params?._optimizedPrompt || ''
  const editablePrompt = data.params?._editablePrompt || ''

  const upstreamText = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      const sourceResult = sourceNode?.data?.result
      if (sourceResult?.text) return sourceResult.text
      if (sourceResult?.copywriteText) return sourceResult.copywriteText
      // 来自 TvcScriptNode: result.script.shots[i].scene_description
      if (sourceResult?.script?.shots?.length) {
        return sourceResult.script.shots.map((s: any) => s.scene_description || s.description || '').join('\n')
      }
      if (typeof sourceResult === 'string') return sourceResult
    }
    return ''
  }, [edges, nodes, id])

  const rawPrompt = upstreamText || inputText
  const params = useMemo(() => ({ ...DEFAULT_PARAMS, ...data.params }), [data.params])

  const prompt = editablePrompt || optimizedPrompt || rawPrompt

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => { autoResize(textareaRef.current) }, [editablePrompt, inputText, autoResize])

  const handleExecute = useCallback(async () => {
    if (!prompt) { return }

    const { abortController } = startGeneration()

    try {
      // ===== 阶段1：生成分镜头脚本 =====
      const script = await generateStoryboardScript(prompt, {
        shotCount: params.shotCount,
        model: params.model,
        temperature: params.temperature,
        style: params.style,
        quality: params.quality,
      })

      if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

      const shots = script.shots || []
      if (shots.length === 0) throw new Error('GLM 未返回有效的分镜头脚本')

      // ===== 阶段2：并行生成所有镜头图片 =====
      const adapter = getSkillQueueAdapter()
      const tasks = shots.map((shot, idx) => ({
        label: `P${idx + 1}/${shots.length}`,
        execute: async (): Promise<{ shot: StoryboardShot; imageUrl: string } | null> => {
          if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')
          const shotPrompt = buildImagePrompt(shot.visual_prompt || shot.scene_description, {
            quality: params.quality,
            style: params.style,
            aspectRatio: params.aspectRatio,
            camera: shot.camera_angle,
            mood: shot.mood,
          })
          const images = await adapter.generateImage(
            { prompt: shotPrompt, size: '2K' as const, aspectRatio: params.aspectRatio, signal: abortController.signal },
            () => {},
          )
          if (images[0]) return { shot: { ...shot, imageUrl: images[0] }, imageUrl: images[0] }
          return null
        },
      }))

      const results = await runParallel(tasks)
      const completedShots = results.map(r => r!.shot)
      const allImages = results.map(r => r!.imageUrl)

      finishGeneration({
        images: allImages,
        imageUrl: allImages[0],
        rawPrompt,
        optimizedPrompt,
        prompt,
        shots: completedShots,
        scriptTitle: script.title,
      })
      setStepMessage(`完成！${allImages.length}/${shots.length} 个镜头`)
    } catch (err: any) {
      handleError(err)
    }
  }, [id, prompt, rawPrompt, optimizedPrompt, params, startGeneration, runParallel, finishGeneration, handleError, setStepMessage])

  const dims = NODE_DIMENSIONS[params.aspectRatio] || NODE_DIMENSIONS['1:1']
  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  return (
    <>
      <div
        className="card-node node-appear node-task"
        style={{
          width: dims.width,
          willChange: 'auto',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        <div className="node-type-strip" />

        <Handle
          type="target"
          position={Position.Left}
          className="!bg-primary !border-primary transition-all duration-200"
          id="text-in"
        />

        <div className="space-y-2 p-3">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ClipboardList className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">故事板分镜V1版</h3>
            </div>
            <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </Badge>
          </div>

          <Separator className="my-1" />

          {/* 上游文本预览或输入 */}
          {upstreamText ? (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">上游输入</span>
              <p className="text-xs break-all text-muted-foreground">{upstreamText}</p>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={editablePrompt || inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                autoResize(e.target)
                updateNode(id, { params: { ...data.params, inputText: e.target.value, _editablePrompt: '', _optimizedPrompt: '' } })
              }}
              rows={1}
              className="w-full text-xs resize-none overflow-hidden rounded-md border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
              placeholder="输入故事描述..."
            />
          )}

          {/* 错误信息 */}
          {(localError || data.error) && (
            <div className="p-1.5 bg-destructive/10 border border-destructive/20 rounded text-[10px] text-destructive">
              {localError || data.error}
            </div>
          )}

          {/* 运行时步骤动画 */}
          {data.status === NodeStatus.RUNNING && (
            <TaskStepAnimation
              currentStep={currentStep}
              progress={stepProgress}
              stepMessage={stepMessage}
              startedAt={data.result?.startedAt}
              onCancel={stopExecution}
            />
          )}

          {/* 执行按钮（非运行状态显示） */}
          {data.status !== NodeStatus.RUNNING && (
            <Button
              onClick={handleExecute}
              disabled={data.status === NodeStatus.DISABLED || !prompt}
              size="sm"
              className="w-full h-7 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              执行生成
            </Button>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary !border-primary transition-all duration-200"
          id="result-out"
        />
      </div>
    </>
  )
})

StoryboardShotANode.displayName = 'StoryboardShotANode'

export default StoryboardShotANode
