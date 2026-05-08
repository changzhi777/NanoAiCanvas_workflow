/**
 * 故事板分镜A 节点 — CardNode task 风格
 * 样式：类型彩色条 + 状态胶囊 + 毛玻璃背景 + 分隔线
 * 功能：文本输入 → 提示词优化（GLM-4.5-Air）→ 后台生成 → 输出分镜图片
 */

import { memo, useCallback, useState, useRef, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import {
  ClipboardList, Loader2, CheckCircle2, Play,
  Sparkles, RotateCcw, Circle, Timer, Ban,
} from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter, type TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'
import { GLM_CONFIG } from '@/config/glm'
import { IMERawTextarea } from '../ui/IMEInput'
import { VoiceInput } from '../ui/VoiceInput'

// ==================== 类型定义 ====================

export interface StoryboardShotAData extends WorkflowNodeData {
  params: {
    inputText: string
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

const STORYBOARD_OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的故事板分镜提示词优化专家。根据用户提供的故事描述、场景设定等信息，生成高质量的分镜图片提示词。

优化规则：
1. 保留用户原始意图和核心故事内容
2. 添加详细画面描述（角色动作、表情、构图）
3. 指定光影效果和氛围（光线方向、色温、情绪基调）
4. 描述镜头语言（景别、视角、运动方向）
5. 明确画面风格（写实/动画/漫画等）和色调
6. 使用中文输出
7. 只输出优化后的提示词，不要添加解释或前缀`

async function optimizePromptWithGLM(rawPrompt: string): Promise<string> {
  const apiKey = GLM_CONFIG.API_KEY
  if (!apiKey) throw new Error('GLM API Key 未配置（VITE_GLM_API_KEY）')

  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'glm-4.5-air',
      messages: [
        { role: 'system', content: STORYBOARD_OPTIMIZE_SYSTEM_PROMPT },
        { role: 'user', content: `请优化以下故事描述，生成分镜图片提示词：\n${rawPrompt}` },
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
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [editablePrompt, setEditablePrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)

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
  const hasOptimized = !!optimizedPrompt
  const statusInfo = statusConfig[data.status] || statusConfig[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  const handleOptimize = useCallback(async () => {
    if (!rawPrompt) { setLocalError('请先输入故事描述或连接上游文本节点'); return }
    setIsOptimizing(true)
    setLocalError(null)
    try {
      const optimized = await optimizePromptWithGLM(rawPrompt)
      setOptimizedPrompt(optimized)
      setEditablePrompt(optimized)
    } catch (err: any) {
      setLocalError('提示词优化失败: ' + (err.message || '未知错误'))
    } finally {
      setIsOptimizing(false)
    }
  }, [rawPrompt])

  const handleResetPrompt = useCallback(() => {
    setOptimizedPrompt('')
    setEditablePrompt('')
  }, [])

  const handleExecute = useCallback(async () => {
    const prompt = editablePrompt || rawPrompt
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

      const images = await adapter.generateImage(
        { prompt, size: '1K', aspectRatio: 'auto', signal: abortController.signal },
        (progress) => { setStepProgress(progress) },
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
          rawPrompt,
          optimizedPrompt: optimizedPrompt || '',
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
  }, [id, updateNode, editablePrompt, rawPrompt, optimizedPrompt])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    updateNode(id, { status: NodeStatus.IDLE })
    setCurrentStep('cancelled')
  }, [id, updateNode])

  const resultImages = data.result?.images || []

  return (
    <div
      className="card-node node-appear node-task"
      style={{
        transform: 'none',
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
      {/* 类型顶部彩色条 */}
      <div className="node-type-strip" />

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary transition-all duration-200"
        id="text-in"
      />

      {/* 卡片内容 */}
      <div className="space-y-2 p-3" style={{ minWidth: 260, maxWidth: 320 }}>
        {/* 头部：图标 + 标题 + 状态胶囊 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ClipboardList className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-sm">故事板分镜A</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </Badge>
        </div>

        <Separator className="my-2" />

        {/* 文本输入（无上游时显示） */}
        {!upstreamText && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">故事描述</span>
            <div className="flex items-start gap-1.5">
              <IMERawTextarea
                value={inputText}
                onChange={(v) => {
                  setInputText(v)
                  updateNode(id, { params: { ...data.params, inputText: v } })
                }}
                rows={3}
                className="flex-1 text-xs resize-none rounded-md border px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
                placeholder="输入故事描述、场景设定..."
              />
              <VoiceInput onResult={setInputText} currentValue={inputText} size="sm" />
            </div>
          </div>
        )}

        {/* 上游文本预览 */}
        {upstreamText && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">上游输入</span>
            <p className="text-xs break-all max-h-16 overflow-y-auto text-muted-foreground">{upstreamText}</p>
          </div>
        )}

        {/* 提示词优化 */}
        <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>提示词优化</span>
              <span className="text-[10px] text-muted-foreground">GLM-4.5-Air</span>
            </div>
            <div className="flex items-center gap-1">
              {hasOptimized && (
                <button onClick={handleResetPrompt} className="p-1 rounded text-[10px] transition-colors hover:bg-white/10 text-slate-400">
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !rawPrompt}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  isOptimizing || !rawPrompt
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                )}
              >
                {isOptimizing
                  ? <><Loader2 className="w-3 h-3 animate-spin" />优化中...</>
                  : <><Sparkles className="w-3 h-3" />{hasOptimized ? '重新优化' : '优化提示词'}</>}
              </button>
            </div>
          </div>
          {hasOptimized && (
            <div className="space-y-1.5">
              <IMERawTextarea
                value={editablePrompt}
                onChange={(v) => setEditablePrompt(v)}
                rows={3}
                className="w-full text-xs resize-none rounded-md border px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary bg-white/5 border-white/10 text-slate-100"
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

        {/* 运行时步骤动画 */}
        {data.status === NodeStatus.RUNNING && (
          <TaskStepAnimation currentStep={currentStep} progress={stepProgress} stepMessage={stepMessage} />
        )}

        {/* 结果预览 */}
        {data.status === NodeStatus.SUCCESS && resultImages.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {resultImages.slice(0, 4).map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img src={img} alt={`分镜 ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">共生成 {resultImages.length} 张分镜</p>
          </div>
        )}

        {/* 执行按钮 */}
        {data.status === NodeStatus.RUNNING ? (
          <Button onClick={handleCancel} variant="outline" size="sm" className="w-full">取消</Button>
        ) : (
          <Button
            onClick={handleExecute}
            disabled={data.status === NodeStatus.DISABLED || !rawPrompt}
            size="sm"
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {hasOptimized ? '使用优化提示词生成' : '执行生成'}
          </Button>
        )}

        {/* 底部提示 */}
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          输入描述 → 优化提示词 → 生成分镜
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary transition-all duration-200"
        id="result-out"
      />
    </div>
  )
})

StoryboardShotANode.displayName = 'StoryboardShotANode'

export default StoryboardShotANode
