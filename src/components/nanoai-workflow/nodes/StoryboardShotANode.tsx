/**
 * 故事板分镜A 节点 — 分镜头流水线版
 * 流程：提示词 → GLM生成分镜头脚本 → 逐镜头生图 → 汇总输出到预览节点
 */

import { memo, useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import {
  ClipboardList, Play, Circle, Timer, CheckCircle2, Ban, Square,
} from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TaskStepAnimation } from '@/components/TaskStepAnimation'
import { getSkillQueueAdapter, type TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'
import {
  DEFAULT_PARAMS, getSizeTier, NODE_DIMENSIONS,
  type AspectRatio, type LayoutDirection, type StoryboardShot,
  generateStoryboardScript,
} from './StoryboardShotA.shared'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => { autoResize(textareaRef.current) }, [editablePrompt, inputText, autoResize])

  // 监听全局终止事件
  useEffect(() => {
    const handler = () => { abortRef.current?.abort() }
    window.addEventListener('workflow:abort-all', handler)
    return () => window.removeEventListener('workflow:abort-all', handler)
  }, [])

  const lastSyncedProgRef = useRef(0)

  const syncStepToStore = useCallback((step: string, progress: number, message: string) => {
    // 节流：进度变化 < 2% 时跳过 store 更新
    if (Math.abs(progress - lastSyncedProgRef.current) < 2) return
    lastSyncedProgRef.current = progress
    updateNode(id, { _stepInfo: { step, progress, message } })
  }, [id, updateNode])

  const emitStep = useCallback((step: string, progress: number, message: string) => {
    setCurrentStep(step)
    setStepProgress(progress)
    setStepMessage(message)
    lastSyncedProgRef.current = progress
    updateNode(id, { _stepInfo: { step, progress, message } })
  }, [id, updateNode])

  const logGenerationTask = useCallback(async (info: { startedAt: string; status: string; error?: string }) => {
    try {
      const token = localStorage.getItem('nanoai_token')
      await fetch(`${API_BASE}/v2/generation-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          node_id: id,
          skill_id: 'gpt_image_2',
          prompt: prompt.substring(0, 500),
          status: info.status,
          error_message: info.error || null,
          started_at: info.startedAt,
          completed_at: new Date().toISOString(),
        }),
      })
    } catch {}
  }, [id, prompt])

  const handleExecute = useCallback(async () => {
    if (!prompt) { setLocalError('请先输入故事描述'); return }

    setLocalError(null)
    window.dispatchEvent(new CustomEvent('properties-panel-toggle', { detail: { open: false } }))
    const startedAt = new Date().toISOString()
    updateNode(id, { status: NodeStatus.RUNNING, error: undefined, result: { ...data.result, startedAt }, _stepInfo: undefined })

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      // ===== 阶段1：生成分镜头脚本 =====
      emitStep('script_generating', 5, '正在生成分镜头脚本...')
      const script = await generateStoryboardScript(prompt, {
        shotCount: params.shotCount,
        model: params.model,
        temperature: params.temperature,
      })

      if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

      const shots = script.shots || []
      if (shots.length === 0) throw new Error('GLM 未返回有效的分镜头脚本')

      emitStep('shot_parsing', 10, `已解析 ${shots.length} 个分镜头`)

      // ===== 阶段2：逐镜头串行生成图片 =====
      const adapter = getSkillQueueAdapter()
      const totalShots = shots.length
      const completedShots: StoryboardShot[] = []
      const allImages: string[] = []

      for (let idx = 0; idx < totalShots; idx++) {
        if (abortController.signal.aborted) throw new DOMException('Task aborted', 'AbortError')

        const shot = shots[idx]
        const shotPrompt = shot.visual_prompt || shot.scene_description
        const startProg = 10 + Math.floor((idx / totalShots) * 85)

        emitStep('shot_generating', startProg, `镜头 P${idx + 1}/${totalShots}: ${shot.scene_description?.substring(0, 30)}...`)

        try {
          const images = await adapter.generateImage(
            { prompt: shotPrompt, size: getSizeTier(params.size), aspectRatio: params.aspectRatio, signal: abortController.signal },
            (progress) => {
              const overall = startProg + Math.floor((progress / 100) * (85 / totalShots))
              setStepProgress(overall)
              syncStepToStore('shot_generating', overall, `P${idx + 1}/${totalShots} 生成中 ${progress}%`)
            },
            (stepInfo: TaskStepInfo) => {
              const overall = startProg + Math.floor((stepInfo.progress / 100) * (85 / totalShots))
              const msg = `P${idx + 1}/${totalShots} ${stepInfo.message}`
              setStepProgress(overall)
              setStepMessage(msg)
              syncStepToStore('shot_generating', overall, msg)
            },
          )

          if (images[0]) {
            completedShots.push({ ...shot, imageUrl: images[0] })
            allImages.push(images[0])
          }
        } catch (shotErr: any) {
          // 单个镜头失败不中断整体流程
          console.warn(`Shot P${idx + 1} failed:`, shotErr.message)
        }
      }

      if (allImages.length === 0) throw new Error('所有镜头生成失败')

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        _stepInfo: undefined,
        result: {
          images: allImages,
          imageUrl: allImages[0],
          rawPrompt,
          optimizedPrompt,
          prompt,
          shots: completedShots,
          scriptTitle: script.title,
          startedAt,
          completedAt: new Date().toISOString(),
        },
      })
      setCurrentStep('completed')
      setStepProgress(100)
      setStepMessage(`完成！${allImages.length}/${totalShots} 个镜头`)
      logGenerationTask({ startedAt, status: 'success' })

    } catch (err: any) {
      if (err.name === 'AbortError') {
        logGenerationTask({ startedAt, status: 'aborted', error: '用户终止' })
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
      logGenerationTask({ startedAt, status: 'failed', error: errorMsg })
    }
  }, [id, updateNode, prompt, rawPrompt, optimizedPrompt, params, emitStep])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    updateNode(id, { status: NodeStatus.IDLE })
    setCurrentStep('cancelled')
  }, [id, updateNode])

  const dims = NODE_DIMENSIONS[params.aspectRatio] || NODE_DIMENSIONS['1:1']

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
              onCancel={handleCancel}
            />
          )}

          {/* 运行时终止按钮（醒目独立按钮） */}
          {data.status === NodeStatus.RUNNING && (
            <Button
              onClick={handleCancel}
              size="sm"
              variant="destructive"
              className="w-full h-7 text-xs"
            >
              <Square className="w-3 h-3 mr-1 fill-current" />
              终止任务
            </Button>
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
