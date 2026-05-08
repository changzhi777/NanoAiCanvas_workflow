/**
 * 图片预览节点 — 精简版（左→右连线）
 * 节点：图片预览 + 放大灯箱
 * 属性面板：下载、保存、提示词、生成信息
 */

import { useState, useMemo } from 'react'
import {
  CheckCircle2, X, ChevronLeft, ChevronRight,
  ZoomIn, FileImage, Circle, Clock,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NODE_DIMENSIONS, type AspectRatio } from './StoryboardShotA.shared'

export interface ImagePreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean
    sourceNodeId?: string
    enableAssetSave: boolean
    enableDownload: boolean
  }
  result?: {
    images?: string[]
    imageUrl?: string
    prompt?: string
    rawPrompt?: string
    optimizedPrompt?: string
    startedAt?: string
    completedAt?: string
    savedToAsset?: boolean
    downloaded?: boolean
  }
}

const statusMap: Record<string, { icon: typeof Circle; label: string; cls: string }> = {
  [NodeStatus.IDLE]: { icon: Circle, label: '等待中', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Clock, label: '加载中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: X, label: '失败', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Circle, label: '禁用', cls: 'not-started' },
}

export const ImagePreviewNode = ({ id, data }: NodeProps<ImagePreviewNodeData>) => {
  const { nodes, edges } = useNanoaiWorkflowStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)

  // 上游数据
  const resultData = useMemo(() => {
    if (data.params.sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId)
      return sourceNode?.data?.result
    }
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      return sourceNode?.data?.result
    }
    return data.result
  }, [edges, nodes, id, data.params.sourceNodeId, data.result])

  // 上游节点的 aspectRatio
  const upstreamAspectRatio = useMemo(() => {
    if (data.params.sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId)
      return (sourceNode?.data?.params as any)?.aspectRatio || '1:1'
    }
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      return (sourceNode?.data?.params as any)?.aspectRatio || '1:1'
    }
    return '1:1'
  }, [edges, nodes, id, data.params.sourceNodeId])

  const displayImages = useMemo(() => resultData?.images || [], [resultData])
  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon
  const currentItem = displayImages[currentIndex]
  const dims = NODE_DIMENSIONS[upstreamAspectRatio as AspectRatio] || NODE_DIMENSIONS['1:1']

  // 图片容器的 aspect-ratio CSS 值
  const aspectCSS = upstreamAspectRatio.replace(':', '/')

  return (
    <>
      <div
        className="card-node node-appear node-end"
        style={{
          width: dims.width,
          minHeight: dims.height,
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
          id="image-in"
        />

        <div className="space-y-2 p-3">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileImage className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">图片预览</h3>
            </div>
            <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </Badge>
          </div>

          <Separator className="my-1" />

          {/* 加载中 */}
          {data.status === NodeStatus.RUNNING && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-primary">加载图片...</span>
            </div>
          )}

          {/* 图片预览 */}
          {data.status !== NodeStatus.RUNNING && displayImages.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: displayImages.length === 1 ? '1fr' : 'repeat(2, 1fr)' }}>
              {displayImages.slice(0, 4).map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => { setCurrentIndex(idx); setIsFullscreen(true); setZoomLevel(1) }}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border-2 transition-all duration-200',
                    'hover:border-primary hover:scale-[1.02]',
                    idx === currentIndex ? 'border-primary' : 'border-white/10'
                  )}
                  style={{ aspectRatio: aspectCSS }}
                >
                  <img src={img} alt={`图片 ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-full bg-black/50">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 无数据 */}
          {data.status !== NodeStatus.RUNNING && displayImages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground" style={{ aspectRatio: aspectCSS }}>
              <FileImage className="w-8 h-8 mb-1 opacity-30" />
              <p className="text-[10px]">暂无图片</p>
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary !border-primary transition-all duration-200"
          id="data-out"
        />
      </div>

      {/* 全屏灯箱 */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1) }}
        >
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
            <div className="flex-1 mr-4">
              {resultData?.prompt && (
                <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-200 max-w-md truncate">
                  <span className="text-blue-400 font-medium mr-1">Prompt:</span>{resultData.prompt}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                <button onClick={() => setZoomLevel(p => Math.max(0.25, p - 0.5))} className="px-1.5 hover:text-blue-400">−</button>
                <button onClick={() => setZoomLevel(1)} className="px-2 hover:text-blue-400">{Math.round(zoomLevel * 100)}%</button>
                <button onClick={() => setZoomLevel(p => Math.min(4, p + 0.5))} className="px-1.5 hover:text-blue-400">+</button>
              </div>
              <button onClick={() => { setIsFullscreen(false); setZoomLevel(1) }} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoomLevel(p => Math.max(0.25, Math.min(4, p + (e.deltaY > 0 ? -0.15 : 0.15)))) }}
          >
            <img src={currentItem} alt="预览" className="rounded-lg shadow-2xl transition-transform duration-150" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }} draggable={false} />
          </div>

          {displayImages.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + displayImages.length) % displayImages.length); setZoomLevel(1) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % displayImages.length); setZoomLevel(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

ImagePreviewNode.displayName = 'ImagePreviewNode'

export default ImagePreviewNode
