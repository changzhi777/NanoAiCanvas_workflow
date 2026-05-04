'use client'

import { useCallback } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { BaseNode, ParamEditor } from './BaseNode'

export interface TransitionNodeData extends WorkflowNodeData {
  params: {
    transitionType: 'fade' | 'dissolve' | 'wipe_left' | 'wipe_right' | 'wipe_up' | 'wipe_down' | 'slide' | 'zoom'
    duration: number
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  }
}

const TRANSITION_TYPES = [
  { label: '淡入淡出', value: 'fade', icon: '◯→◯' },
  { label: '溶解', value: 'dissolve', icon: '██→▓▓' },
  { label: '左滑', value: 'wipe_left', icon: '→←' },
  { label: '右滑', value: 'wipe_right', icon: '←→' },
  { label: '上滑', value: 'wipe_up', icon: '↓↑' },
  { label: '下滑', value: 'wipe_down', icon: '↑↓' },
  { label: '滑动', value: 'slide', icon: '⇐⇒' },
  { label: '缩放', value: 'zoom', icon: '⊙→◎' },
]

const EASING_OPTIONS = [
  { label: '线性', value: 'linear' },
  { label: '渐快', value: 'ease-in' },
  { label: '渐慢', value: 'ease-out' },
  { label: '自然', value: 'ease-in-out' },
]

const TRANSITION_OPTIONS = TRANSITION_TYPES.map(t => ({ label: t.label, value: t.value }))
const EASING_OPTIONS2 = EASING_OPTIONS.map(e => ({ label: e.label, value: e.value }))

export const TransitionNode = ({ id, data }: NodeProps<TransitionNodeData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore()

  const paramSchema = [
    {
      key: 'transitionType',
      label: '转场效果',
      type: 'select' as const,
      options: TRANSITION_OPTIONS,
      defaultValue: 'fade',
    },
    {
      key: 'duration',
      label: '转场时长（毫秒）',
      type: 'number' as const,
      defaultValue: 500,
    },
    {
      key: 'easing',
      label: '缓动函数',
      type: 'select' as const,
      options: EASING_OPTIONS2,
      defaultValue: 'ease-in-out',
    },
  ]

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params)
  }, [id, updateNodeParams])

  const handleConfigure = useCallback(() => {
    updateNode(id, { status: NodeStatus.SUCCESS })
  }, [id, updateNode])

  const selectedTransition = TRANSITION_TYPES.find(t => t.value === data.params.transitionType)

  return (
    <BaseNode
      data={data}
      icon={<Sparkles className="w-4 h-4" />}
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      {/* 预览指示 */}
      <div className="flex items-center gap-2 p-2 bg-black/20 rounded text-xs mt-3">
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          镜头 A → <span className="text-primary">{selectedTransition?.label || '淡入淡出'}</span> → 镜头 B
        </span>
      </div>

      <button
        onClick={handleConfigure}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30 mt-2"
      >
        <Sparkles className="w-3 h-3" />
        应用转场
      </button>
    </BaseNode>
  )
}

export const transitionNodeType = 'transition'

export default TransitionNode