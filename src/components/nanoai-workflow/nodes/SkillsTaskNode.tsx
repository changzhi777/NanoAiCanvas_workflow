/**
 * Skills 任务节点
 * 功能：接收数据节点输出 → 入队后台生成 → 输出结果
 */

import { memo, useCallback, useState, useRef, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Wand2, Loader2, CheckCircle2, AlertCircle, Play } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useTheme } from '../ui/Theme'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter, type TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'

// ==================== 类型定义 ====================

export interface SkillsTaskNodeData extends WorkflowNodeData {
  params: {
    templateId: string
    templateName: string
    formData: Record<string, string>
    size: string
    quality: string
  }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    images?: string[]
    imageUrl?: string
    rawPrompt?: string
    prompt?: string
    startedAt?: string
    completedAt?: string
  }
  error?: string
}

// ==================== 状态指示器 ====================

interface StatusIndicatorProps {
  status: NodeStatus
}

const StatusIndicator = memo(({ status }: StatusIndicatorProps) => {
  const { isDark } = useTheme()

  const config = {
    [NodeStatus.IDLE]: {
      icon: <Wand2 className="w-4 h-4" />,
      color: 'bg-gray-400',
      label: '空闲',
      textColor: isDark ? 'text-slate-400' : 'text-gray-600'
    },
    [NodeStatus.RUNNING]: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: 'bg-blue-500',
      label: '生成中',
      textColor: isDark ? 'text-blue-400' : 'text-blue-600'
    },
    [NodeStatus.SUCCESS]: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'bg-green-500',
      label: '成功',
      textColor: isDark ? 'text-green-400' : 'text-green-600'
    },
    [NodeStatus.ERROR]: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'bg-red-500',
      label: '错误',
      textColor: isDark ? 'text-red-400' : 'text-red-600'
    },
    [NodeStatus.DISABLED]: {
      icon: <Wand2 className="w-4 h-4" />,
      color: 'bg-gray-300',
      label: '禁用',
      textColor: isDark ? 'text-slate-500' : 'text-gray-400'
    },
  }

  const { color, label, textColor } = config[status] || config[NodeStatus.IDLE]

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-3 h-3 rounded-full', color)} />
      <span className={cn('text-xs', textColor)}>{label}</span>
    </div>
  )
})

StatusIndicator.displayName = 'StatusIndicator'

// ==================== 结果预览 ====================

interface ResultPreviewProps {
  result?: SkillsTaskNodeData['result']
  status: NodeStatus
}

const ResultPreview = memo(({ result, status }: ResultPreviewProps) => {
  if (status === NodeStatus.SUCCESS && result?.images?.length) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {result.images.slice(0, 4).map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
              <img src={img} alt={`生成结果 ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          共生成 {result.images.length} 张图片
        </p>
      </div>
    )
  }

  return null
})

ResultPreview.displayName = 'ResultPreview'

// ==================== 主组件 ====================

const SkillsTaskNode = memo(({ id, data }: { id: string; data: SkillsTaskNodeData }) => {
  const { isDark } = useTheme()
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const [localError, setLocalError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState('validating')
  const [stepProgress, setStepProgress] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // 从上游获取 formData
  const upstreamFormData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      const sourceResult = sourceNode?.data?.result
      if (sourceResult?.formData) return sourceResult.formData
      if (sourceResult?.dynamicParams) return sourceResult.dynamicParams
    }
    return data.params?.formData || {}
  }, [edges, nodes, id, data.params?.formData])

  // 构建提示词
  const buildPrompt = useCallback(() => {
    const fd = upstreamFormData || data.params?.formData || {}
    const entries = Object.entries(fd).filter(([, v]) => v)
    if (entries.length === 0) return ''
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [upstreamFormData, data.params?.formData])

  // 执行生成
  const handleExecute = useCallback(async () => {
    const raw = buildPrompt()
    if (!raw) {
      setLocalError('请先填写模板参数')
      return
    }

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

      const images = await adapter.generateImage(
        {
          prompt: raw,
          size: '1K',
          aspectRatio: 'auto',
          signal: abortController.signal,
        },
        (progress) => {
          setStepProgress(progress)
        },
        (stepInfo: TaskStepInfo) => {
          setCurrentStep(stepInfo.step)
          setStepProgress(stepInfo.progress)
          setStepMessage(stepInfo.message)
        },
      )

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          images,
          imageUrl: images[0],
          rawPrompt: raw,
          prompt: raw,
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
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: errorMsg,
      })
    }
  }, [id, data.params, updateNode, buildPrompt])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    updateNode(id, { status: NodeStatus.IDLE })
    setCurrentStep('cancelled')
  }, [id, updateNode])

  const inputParams = data.params?.formData || {}
  const hasInputs = Object.keys(inputParams).length > 0

  return (
    <BaseNode
      data={data}
      icon={<Wand2 className="w-5 h-5" />}
    >
      <div className="space-y-3">
        {/* 状态指示器 */}
        <div className="flex items-center justify-between">
          <StatusIndicator status={data.status} />
        </div>

        {/* 模板信息 */}
        {data.params?.templateName && (
          <div className={cn(
            'p-2 rounded-lg border text-xs',
            isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
          )}>
            <p className="font-medium text-emerald-500">{data.params.templateName}</p>
          </div>
        )}

        {/* 输入参数预览 */}
        {hasInputs && (
          <div className={cn(
            'p-2 rounded border text-xs',
            isDark ? 'bg-gray-800/50 border-white/5' : 'bg-gray-50 border-gray-100'
          )}>
            <p className="font-medium mb-1.5">输入参数:</p>
            <div className="space-y-0.5">
              {Object.entries(inputParams).slice(0, 5).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{key}:</span>
                  <span className="truncate text-right">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {(localError || data.error) && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {localError || data.error}
          </div>
        )}

        {/* 步骤动画（运行时显示） */}
        {data.status === NodeStatus.RUNNING && (
          <TaskStepAnimation
            currentStep={currentStep}
            progress={stepProgress}
            stepMessage={stepMessage}
          />
        )}

        {/* 结果预览 */}
        <ResultPreview result={data.result} status={data.status} />

        {/* 执行按钮 */}
        {data.status === NodeStatus.RUNNING ? (
          <Button onClick={handleCancel} variant="outline" size="sm" className="w-full mt-2">
            取消
          </Button>
        ) : (
          <Button
            onClick={handleExecute}
            disabled={data.status === NodeStatus.DISABLED}
            size="sm"
            className="w-full mt-2"
          >
            <Play className="w-4 h-4 mr-2" />
            执行生成
          </Button>
        )}

        {/* 提示 */}
        <div className={cn(
          'text-xs p-2 rounded border',
          isDark ? 'bg-gray-800/50 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'
        )}>
          <p>Skills 任务节点</p>
          <p className="mt-0.5">填写参数 → 执行生成</p>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 bg-background"
        id="data-in"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 bg-background"
        id="result-out"
      />
    </BaseNode>
  )
})

SkillsTaskNode.displayName = 'SkillsTaskNode'

export { SkillsTaskNode }
export default SkillsTaskNode
