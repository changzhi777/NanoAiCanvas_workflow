/**
 * StoryboardV2Node — 剧本生成节点
 * 流程：输入故事梗概 → GLM生成完整剧本 → 扇出到下游并行节点
 */

import { memo, useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import { ClipboardList, Play, Circle, Timer, CheckCircle2, Ban } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { generateScreenplay, DEFAULT_V2_PARAMS, type ScreenplayData } from './StoryboardV2.shared'

export interface StoryboardV2Data extends WorkflowNodeData {
  params: {
    inputText: string
    shotCount: number
    style: string
    quality: string
    temperature: number
    model: string
  }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    screenplay?: ScreenplayData
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

export const StoryboardV2Node = memo(({ id, data }: { id: string; data: StoryboardV2Data }) => {
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const stopExecution = useNanoaiWorkflowStore(s => s.stopExecution)
  const [localError, setLocalError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState('idle')
  const [stepProgress, setStepProgress] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const [inputText, setInputText] = useState(data.params?.inputText || '')

  const upstreamText = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      const sourceResult = sourceNode?.data?.result
      if (sourceResult?.text) return sourceResult.text
      if (sourceResult?.copywriteText) return sourceResult.copywriteText
    }
    return ''
  }, [edges, nodes, id])

  const rawPrompt = upstreamText || inputText
  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon
  const params = useMemo(() => ({ ...DEFAULT_V2_PARAMS, ...data.params }), [data.params])

  useEffect(() => {
    const handler = () => { abortRef.current?.abort() }
    window.addEventListener('workflow:abort-all', handler)
    return () => window.removeEventListener('workflow:abort-all', handler)
  }, [])

  const emitStep = useCallback((step: string, progress: number, message: string) => {
    setCurrentStep(step)
    setStepProgress(progress)
    setStepMessage(message)
    updateNode(id, { _stepInfo: { step, progress, message } })
  }, [id, updateNode])

  const handleExecute = useCallback(async () => {
    if (!rawPrompt) { setLocalError('请先输入故事梗概'); return }

    setLocalError(null)
    window.dispatchEvent(new CustomEvent('properties-panel-toggle', { detail: { open: false } }))
    const startedAt = new Date().toISOString()
    updateNode(id, { status: NodeStatus.RUNNING, error: undefined, result: { startedAt }, _stepInfo: undefined })

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      emitStep('screenplay_generating', 10, '正在生成完整剧本...')

      let screenplay: ScreenplayData
      try {
        screenplay = await generateScreenplay(rawPrompt, {
          shotCount: params.shotCount,
          style: params.style,
          quality: params.quality,
          model: params.model,
          temperature: params.temperature,
        })
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('504') || msg.includes('超时')) throw new Error('GLM API 超时，请重试')
        if (msg.includes('JSON') || msg.includes('解析')) throw new Error('GLM 返回格式异常，请重试')
        throw new Error('剧本生成失败: ' + (msg || '未知错误'))
      }

      if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

      emitStep('screenplay_parsed', 80, `剧本完成: ${screenplay.characters?.length || 0} 角色, ${screenplay.shots?.length || 0} 分镜头`)

      // 实时推送剧本到下游节点
      updateNode(id, {
        result: {
          screenplay,
          startedAt,
          completedAt: new Date().toISOString(),
        },
      })

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        _stepInfo: undefined,
      })
      setCurrentStep('completed')
      setStepProgress(100)
      setStepMessage(`完成！${screenplay.shots?.length || 0} 个分镜头`)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setCurrentStep('cancelled')
        setStepMessage('已终止')
        setStepProgress(0)
        updateNode(id, { _stepInfo: undefined })
        return
      }
      const errorMsg = err.message || '生成失败'
      setLocalError(errorMsg)
      setCurrentStep('failed')
      setStepMessage(errorMsg)
      updateNode(id, { status: NodeStatus.ERROR, error: errorMsg, _stepInfo: undefined })
    }
  }, [id, updateNode, rawPrompt, params, emitStep])

  const charCount = data.result?.screenplay?.characters?.length || 0
  const shotCount = data.result?.screenplay?.shots?.length || 0
  const sceneCount = data.result?.screenplay?.scenes?.length || 0

  return (
    <div
      className="card-node node-appear node-task"
      style={{
        width: 280,
        willChange: 'auto',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="node-type-strip" />

      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="text-in" />

      <div className="space-y-2 p-3">
        {/* 头部 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ClipboardList className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-xs">故事板分镜V2版</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </Badge>
        </div>

        <Separator className="my-1" />

        {/* 输入 */}
        {upstreamText ? (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">上游输入</span>
            <p className="text-xs break-all text-muted-foreground line-clamp-3">{upstreamText}</p>
          </div>
        ) : (
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              updateNode(id, { params: { ...data.params, inputText: e.target.value } })
            }}
            rows={3}
            className="w-full text-xs resize-none rounded-md border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            placeholder="输入故事梗概..."
          />
        )}

        {/* 完成统计 */}
        {data.status === NodeStatus.SUCCESS && data.result?.screenplay && (
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>{charCount} 角色</span>
            <span>·</span>
            <span>{sceneCount} 场景</span>
            <span>·</span>
            <span>{shotCount} 分镜头</span>
          </div>
        )}

        {/* 错误 */}
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

        {/* 执行按钮 */}
        {data.status !== NodeStatus.RUNNING && (
          <Button onClick={handleExecute} disabled={data.status === NodeStatus.DISABLED || !rawPrompt} size="sm" className="w-full h-7 text-xs">
            <Play className="w-3 h-3 mr-1" />
            生成剧本
          </Button>
        )}
      </div>

      {/* 4 个输出端口 — 扇出到下游节点 */}
      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary !top-[35%]" id="shots-out" />
      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary !top-[50%]" id="characters-out" />
      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary !top-[65%]" id="scenes-out" />
      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary !top-[80%]" id="script-out" />
    </div>
  )
})

StoryboardV2Node.displayName = 'StoryboardV2Node'
export default StoryboardV2Node
