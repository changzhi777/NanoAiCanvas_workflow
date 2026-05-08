/**
 * 故事板分镜A 节点 — 精简版
 * 节点：文本输入框 + 运行按钮（左→右连线）
 * 属性面板：提示词优化、模型选择、生成参数、比例设置
 */

import { memo, useCallback, useState, useRef, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import {
  ClipboardList, Play, Circle, Timer, CheckCircle2, Ban,
} from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter, type TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'
import { DEFAULT_PARAMS, getSizeTier, type AspectRatio } from './StoryboardShotA.shared'

// ==================== 类型定义 ====================

export type { AspectRatio }

export interface StoryboardShotAData extends WorkflowNodeData {
  params: {
    inputText: string
    size: string
    quality: string
    style: string
    batchCount: number
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
    startedAt?: string
    completedAt?: string
  }
  error?: string
}

// ==================== 状态映射 ====================

const statusConfig = {
  [NodeStatus.IDLE]: { icon: Circle, label: '未开始', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Timer, label: '进行中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: Ban, label: '已阻塞', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Circle, label: '禁用', cls: 'not-started' },
}

// ==================== 主组件 ====================

export const StoryboardShotANode = memo(({ id, data }: { id: string; data: StoryboardShotAData }) => {
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const [localError, setLocalError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState('idle')
  const [stepProgress, setStepProgress] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const [inputText, setInputText] = useState(data.params?.inputText || '')

  const optimizedPrompt = data.params?._optimizedPrompt || ''
  const editablePrompt = data.params?._editablePrompt || ''

  const upstreamText = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      const sourceResult = sourceNode?.data?.result
      if (sourceResult?.text) return sourceResult.text
      if (sourceResult?.copywriteText) return sourceResult.copywriteText
      if (typeof sourceResult === 'string') return sourceResult
    }
    return ''
  }, [edges, nodes, id])

  const rawPrompt = upstreamText || inputText
  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon
  const params = useMemo(() => ({ ...DEFAULT_PARAMS, ...data.params }), [data.params])

  const prompt = editablePrompt || optimizedPrompt || rawPrompt

  const handleExecute = useCallback(async () => {
    if (!prompt) { setLocalError('请先输入故事描述'); return }

    setLocalError(null)
    setCurrentStep('validating')
    setStepProgress(0)
    setStepMessage('准备中...')
    const startedAt = new Date().toISOString()
    updateNode(id, { status: NodeStatus.RUNNING, error: undefined })

    try {
      const adapter = getSkillQueueAdapter()
      const abortController = new AbortController()
      abortRef.current = abortController

      const allImages: string[] = []
      const batchSize = Math.max(1, Math.min(8, params.batchCount))

      for (let i = 0; i < batchSize; i++) {
        const batchImages = await adapter.generateImage(
          { prompt: batchSize > 1 ? `${prompt} (variation ${i + 1})` : prompt, size: getSizeTier(params.size), aspectRatio: params.aspectRatio, signal: abortController.signal },
          (progress) => { setStepProgress(progress) },
          (stepInfo: TaskStepInfo) => {
            setCurrentStep(stepInfo.step)
            setStepProgress(stepInfo.progress)
            setStepMessage(stepInfo.message)
          },
        )
        allImages.push(...batchImages)
      }

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          images: allImages,
          imageUrl: allImages[0],
          rawPrompt,
          optimizedPrompt,
          prompt,
          startedAt,
          completedAt: new Date().toISOString(),
        },
      })
      setCurrentStep('completed')
      setStepProgress(100)
      setStepMessage('完成')
    } catch (err: any) {
      if (err.name === 'AbortError') return
      const errorMsg = err.message || '生成失败'
      setLocalError(errorMsg)
      setCurrentStep('failed')
      setStepMessage(errorMsg)
      updateNode(id, { status: NodeStatus.ERROR, error: errorMsg })
    }
  }, [id, updateNode, prompt, rawPrompt, optimizedPrompt, params])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    updateNode(id, { status: NodeStatus.IDLE })
    setCurrentStep('cancelled')
  }, [id, updateNode])

  return (
    <>
      <NodeResizer
        minWidth={200}
        maxWidth={480}
        minHeight={120}
        maxHeight={400}
        lineStyle={{ borderWidth: 0 }}
        handleStyle={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'transparent' }}
      />

      <div
        className="card-node node-appear node-task"
        style={{
          width: '100%',
          height: '100%',
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

        <div className="space-y-2 p-3 h-full box-border overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ClipboardList className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">故事板分镜A</h3>
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
              <p className="text-xs break-all max-h-12 overflow-y-auto text-muted-foreground line-clamp-3">{upstreamText}</p>
            </div>
          ) : (
            <textarea
              value={editablePrompt || inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                updateNode(id, { params: { ...data.params, inputText: e.target.value, _editablePrompt: '', _optimizedPrompt: '' } })
              }}
              rows={3}
              className="w-full text-xs resize-none rounded-md border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
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
            <TaskStepAnimation currentStep={currentStep} progress={stepProgress} stepMessage={stepMessage} />
          )}

          {/* 执行按钮 */}
          {data.status === NodeStatus.RUNNING ? (
            <Button onClick={handleCancel} variant="outline" size="sm" className="w-full h-7 text-xs">取消</Button>
          ) : (
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
