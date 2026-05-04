'use client'

import { useCallback } from 'react'
import { Image, Link } from 'lucide-react'
import { NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode'

export interface GPTImage2Data extends WorkflowNodeData {
  params: {
    prompt: string
    size: string
    aspectRatio: string
    quality: 'standard' | 'hd'
    style: string
    referenceUrls: string[]  // 参考图URLs，用于溶图
    mode: 'text-to-image' | 'inpaint'  // 模式：文生图 / 溶图
  }
}

const IMAGE_SIZES = [
  { label: 'auto', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '3:2', value: '3:2' },
  { label: '2:3', value: '2:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '21:9', value: '21:9' },
  { label: '9:21', value: '9:21' },
  { label: '1:3', value: '1:3' },
  { label: '3:1', value: '3:1' },
  { label: '2:1', value: '2:1' },
  { label: '1:2', value: '1:2' },
]

const IMAGE_QUALITIES = [
  { label: '标准', value: 'standard' },
  { label: '高清', value: 'hd' },
]

export const GPTImage2Node = ({ id, data }: NodeProps<GPTImage2Data>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore()

  const paramSchema = [
    {
      key: 'prompt',
      label: '图片描述',
      type: 'textarea' as const,
      placeholder: '请输入AI绘图提示词...',
      required: true,
    },
    {
      key: 'size',
      label: '图片比例',
      type: 'select' as const,
      options: IMAGE_SIZES,
      defaultValue: 'auto',
    },
    {
      key: 'quality',
      label: '图片质量',
      type: 'select' as const,
      options: IMAGE_QUALITIES,
      defaultValue: 'standard',
    },
  ]

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params)
  }, [id, updateNodeParams])

  const handleNodeExecute = useCallback(() => {
    executeNode(id)
  }, [id, executeNode])

  // 处理参考图URL
  const handleReferenceUrlChange = useCallback((value: string) => {
    const urls = value.split('\n').filter((u: string) => u.trim())
    updateNodeParams(id, { referenceUrls: urls })
  }, [id, updateNodeParams])

  const currentUrls = data.params.referenceUrls || []
  const hasReferenceImages = currentUrls.length > 0

  return (
    <BaseNode
      data={data}
      icon={<Image className="w-5 h-5" />}
    >
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />

      {/* 参考图URL输入（用于溶图） */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-3 h-3 text-muted-foreground" />
          <label className="text-xs text-muted-foreground">
            参考图URL（用于溶图，每行一个）
          </label>
          {hasReferenceImages && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
              溶图模式
            </span>
          )}
        </div>
        <textarea
          value={currentUrls.join('\n')}
          onChange={(e) => handleReferenceUrlChange(e.target.value)}
          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
          className="w-full h-16 px-2 py-1.5 bg-background border border-white/10 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="text-[10px] text-muted-foreground mt-1">
          已有 {currentUrls.length} 张参考图
        </div>
      </div>

      <ExecuteButton
        onExecute={handleNodeExecute}
        status={data.status}
        label={hasReferenceImages ? '溶图生成' : '文生图'}
      />
    </BaseNode>
  )
}

export default GPTImage2Node