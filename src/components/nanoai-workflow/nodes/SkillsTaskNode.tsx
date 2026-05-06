/**
 * Skills 任务节点
 * 功能：接收数据节点输出 → 提示词优化（GLM-4.5-Air）→ 入队后台生成 → 输出结果
 */

import { memo, useCallback, useState, useRef, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Wand2, Loader2, CheckCircle2, AlertCircle, Play, Sparkles, RotateCcw } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useTheme } from '../ui/Theme'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter, type TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'
import { GLM_CONFIG } from '@/config/glm'
import { IMERawTextarea } from '../ui/IMEInput'

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
    optimizedPrompt?: string
    prompt?: string
    startedAt?: string
    completedAt?: string
  }
  error?: string
}

// ==================== 提示词优化 ====================

const OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的 AI 图片生成提示词优化专家。根据用户提供的主题、风格、构图等信息，生成高质量 GPT-Image 提示词。

优化规则：
1. 保留用户原始意图和核心内容
2. 添加详细画面描述（主体细节、背景环境、氛围）
3. 指定光影效果（光线方向、色温、明暗对比）
4. 描述色彩风格和调色方案
5. 添加构图信息（视角、景别、透视）
6. 使用中文输出
7. 只输出优化后的提示词，不要添加解释或前缀`

async function optimizePromptWithGLM(rawPrompt: string, templateName?: string): Promise<string> {
  const apiKey = GLM_CONFIG.API_KEY
  if (!apiKey) throw new Error('GLM API Key 未配置（VITE_GLM_API_KEY）')

  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-air',
      messages: [
        { role: 'system', content: OPTIMIZE_SYSTEM_PROMPT },
        { role: 'user', content: `模板类型：${templateName || '通用'}\n原始提示词：${rawPrompt}\n\n请优化以上提示词，使其适合 GPT-Image 高质量图片生成。` },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`GLM API 错误 ${response.status}: ${err}`)
  }
  const data = await response.json()
  const optimized = data.choices?.[0]?.message?.content?.trim()
  if (!optimized) throw new Error('GLM 返回为空')
  return optimized
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

  // 提示词优化状态
  const [rawPrompt, setRawPrompt] = useState('')
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [editablePrompt, setEditablePrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)

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

  // 构建原始提示词
  const buildRawPrompt = useCallback(() => {
    const fd = upstreamFormData || data.params?.formData || {}
    const entries = Object.entries(fd).filter(([, v]) => v)
    if (entries.length === 0) return ''
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
  }, [upstreamFormData, data.params?.formData])

  // 提示词优化
  const handleOptimize = useCallback(async () => {
    const raw = buildRawPrompt()
    if (!raw) {
      setLocalError('请先在数据输入节点填写模板参数')
      return
    }

    setRawPrompt(raw)
    setIsOptimizing(true)
    setLocalError(null)

    try {
      const optimized = await optimizePromptWithGLM(raw, data.params.templateName)
      setOptimizedPrompt(optimized)
      setEditablePrompt(optimized)
    } catch (err: any) {
      setLocalError('提示词优化失败: ' + (err.message || '未知错误'))
    } finally {
      setIsOptimizing(false)
    }
  }, [buildRawPrompt, data.params.templateName])

  // 重置优化提示词
  const handleResetPrompt = useCallback(() => {
    setOptimizedPrompt('')
    setEditablePrompt('')
    setRawPrompt('')
  }, [])

  // 执行生成
  const handleExecute = useCallback(async () => {
    const raw = buildRawPrompt()
    if (!raw) {
      setLocalError('请先填写模板参数')
      return
    }

    // 使用编辑后的优化提示词，或原始提示词
    const finalPrompt = editablePrompt || raw

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
          prompt: finalPrompt,
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
          optimizedPrompt: optimizedPrompt || '',
          prompt: finalPrompt,
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
  }, [id, data.params, updateNode, editablePrompt, buildRawPrompt, optimizedPrompt])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    updateNode(id, { status: NodeStatus.IDLE })
    setCurrentStep('cancelled')
  }, [id, updateNode])

  const inputParams = data.params?.formData || {}
  const hasInputs = Object.keys(inputParams).length > 0
  const hasOptimized = !!optimizedPrompt

  const sectionCls = cn(
    'p-2.5 rounded-lg border space-y-2',
    isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
  )

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
        {hasInputs && !hasOptimized && (
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

        {/* 原始提示词 */}
        {rawPrompt && (
          <div className={sectionCls}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>原始提示词</span>
            </div>
            <p className={cn('text-xs break-all max-h-16 overflow-y-auto', isDark ? 'text-slate-400' : 'text-gray-600')}>
              {rawPrompt}
            </p>
          </div>
        )}

        {/* 提示词优化区域 */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>提示词优化</span>
              <span className="text-[10px] text-muted-foreground">GLM-4-Air</span>
            </div>
            <div className="flex items-center gap-1">
              {hasOptimized && (
                <button
                  onClick={handleResetPrompt}
                  className={cn('p-1 rounded text-[10px] transition-colors', isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-200 text-gray-500')}
                  title="重置"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !buildRawPrompt()}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  isOptimizing || !buildRawPrompt()
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                )}
              >
                {isOptimizing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />优化中...</>
                ) : (
                  <><Sparkles className="w-3 h-3" />{hasOptimized ? '重新优化' : '优化提示词'}</>
                )}
              </button>
            </div>
          </div>

          {/* 优化后的提示词（可编辑） */}
          {hasOptimized && (
            <div className="space-y-1.5">
              <IMERawTextarea
                value={editablePrompt}
                onChange={(v) => setEditablePrompt(v)}
                rows={4}
                className={cn(
                  'w-full text-xs resize-none rounded-md border px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  isDark ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                )}
                placeholder="优化后的提示词（可编辑）"
              />
              {editablePrompt !== optimizedPrompt && (
                <p className="text-[10px] text-amber-500">提示词已手动修改</p>
              )}
            </div>
          )}
        </div>

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
            {hasOptimized ? '使用优化提示词生成' : '执行生成'}
          </Button>
        )}

        {/* 提示 */}
        <div className={cn(
          'text-xs p-2 rounded border',
          isDark ? 'bg-gray-800/50 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'
        )}>
          <p>Skills 任务节点</p>
          <p className="mt-0.5">填写参数 → 优化提示词 → 执行生成</p>
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
