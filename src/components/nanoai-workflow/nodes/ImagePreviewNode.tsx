/**
 * 图片预览+输出 节点 — CardNode end 风格（融合 OutputNode）
 * 样式：end 类型彩色条 + 完成状态胶囊 + 毛玻璃背景
 * 功能：图片画廊 + 灯箱全屏 + 提示词展示 + 下载 + 保存到资产库
 */

import { useCallback, useState, useMemo } from 'react'
import {
  CheckCircle2, Download, X, ChevronLeft, ChevronRight,
  ZoomIn, Copy, Clock, Calendar, FileImage, ShieldCheck, Circle,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ==================== 类型定义 ====================

export interface ImagePreviewItem {
  id: string
  url: string
  thumbnail?: string
  title?: string
  prompt?: string
  width?: number
  height?: number
  generatedAt?: string
}

export interface ImagePreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean
    sourceNodeId?: string
    thumbnailSize: 'small' | 'medium' | 'large'
    gridColumns: 2 | 3 | 4
    enableAssetSave: boolean
    enableDownload: boolean
  }
  result?: {
    images?: string[]
    imageUrl?: string
    prompt?: string
    rawPrompt?: string
    optimizedPrompt?: string
    items?: ImagePreviewItem[]
    startedAt?: string
    completedAt?: string
    savedToAsset?: boolean
    downloaded?: boolean
  }
}

const generateId = () => `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatDateTime(isoStr: string): string {
  try { return new Date(isoStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }
  catch { return isoStr }
}

const statusMap: Record<string, { icon: typeof Circle; label: string; cls: string }> = {
  [NodeStatus.IDLE]: { icon: Circle, label: '等待中', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Clock, label: '加载中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: X, label: '失败', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Circle, label: '禁用', cls: 'not-started' },
}

// ==================== 主组件 ====================

export const ImagePreviewNode = ({ id, data }: NodeProps<ImagePreviewNodeData>) => {
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [copied, setCopied] = useState(false)

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

  // 提取图片列表
  const displayItems = useMemo(() => {
    if (!resultData) return []
    const items: ImagePreviewItem[] = []
    if (resultData.images?.length) {
      resultData.images.forEach((url: string, i: number) => {
        items.push({ id: generateId(), url, title: `图片 ${i + 1}`, prompt: resultData.prompt, generatedAt: resultData.completedAt })
      })
    }
    if (resultData.imageUrl && items.length === 0) {
      items.push({ id: generateId(), url: resultData.imageUrl, title: '图片', prompt: resultData.prompt, generatedAt: resultData.completedAt })
    }
    return items
  }, [resultData])

  const promptText = resultData?.prompt || ''
  const currentItem = displayItems[currentIndex]
  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  // 生成用时
  const generationTime = useMemo(() => {
    if (resultData?.startedAt && resultData?.completedAt) {
      return formatDuration(new Date(resultData.completedAt).getTime() - new Date(resultData.startedAt).getTime())
    }
    return ''
  }, [resultData])

  // 下载
  const handleDownload = useCallback(() => {
    const item = displayItems[currentIndex] || displayItems[0]
    if (!item?.url) return
    const link = document.createElement('a')
    link.href = item.url
    link.download = `nanoai-${item.id}.png`
    link.click()
  }, [displayItems, currentIndex])

  // 保存到资产库
  const handleSaveToAsset = useCallback(() => {
    updateNode(id, { result: { ...data.result, savedToAsset: true } as any })
  }, [id, updateNode, data.result])

  // 复制提示词
  const handleCopyPrompt = useCallback(() => {
    if (!promptText) return
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [promptText])


  return (
    <div
      className="card-node node-appear node-end"
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
        id="image-in"
      />

      {/* 卡片内容 */}
      <div className="space-y-2 p-3" style={{ minWidth: 280, maxWidth: 340 }}>
        {/* 头部：图标 + 标题 + 状态胶囊 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-sm">图片预览+输出</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </Badge>
        </div>

        <Separator className="my-2" />

        {/* 加载中 */}
        {data.status === NodeStatus.RUNNING && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-primary">加载图片...</span>
          </div>
        )}

        {/* 图片网格 */}
        {data.status !== NodeStatus.RUNNING && displayItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {displayItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentIndex(index); setIsFullscreen(true); setZoomLevel(1) }}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border-2 transition-all duration-200',
                    'hover:border-primary hover:shadow-lg hover:scale-[1.02]',
                    index === currentIndex ? 'border-primary' : 'border-white/10'
                  )}
                >
                  <div className="aspect-square">
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-full bg-black/50">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 提示词 */}
            {promptText && (
              <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-400">提示词</span>
                  <button onClick={handleCopyPrompt} className="p-1 rounded hover:bg-white/10 text-muted-foreground">
                    <Copy className="w-3 h-3" />
                    {copied && <span className="ml-1 text-[10px] text-green-500">已复制</span>}
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed break-all max-h-20 overflow-y-auto">{promptText}</p>
              </div>
            )}

            {/* 生成信息 */}
            <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileImage className="w-3.5 h-3.5 text-purple-400" />
                生成信息
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {generationTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-green-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">用时</div>
                      <div className="text-xs font-medium text-slate-200">{generationTime}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <FileImage className="w-3 h-3 text-orange-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">数量</div>
                    <div className="text-xs font-medium text-slate-200">{displayItems.length} 张</div>
                  </div>
                </div>
                {resultData?.completedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">时间</div>
                      <div className="text-xs font-medium text-slate-200">{formatDateTime(resultData.completedAt)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作栏 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30"
              >
                <Download className="w-3.5 h-3.5" />
                下载
              </button>
              <button
                onClick={handleSaveToAsset}
                disabled={data.result?.savedToAsset}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                  data.result?.savedToAsset
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {data.result?.savedToAsset ? '已保存' : '保存到资产库'}
              </button>
            </div>
          </>
        )}

        {/* 无数据 */}
        {data.status !== NodeStatus.RUNNING && displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileImage className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">暂无图片</p>
          </div>
        )}

        {/* 底部 */}
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          画廊预览 + 下载/保存
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary transition-all duration-200"
        id="data-out"
      />

      {/* 全屏灯箱 */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1) }}
        >
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
            <div className="flex-1 mr-4">
              {promptText && (
                <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-200 max-w-md truncate">
                  <span className="text-blue-400 font-medium mr-1">Prompt:</span>{promptText}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                <button onClick={() => setZoomLevel(p => Math.max(0.25, p - 0.5))} className="px-1.5 hover:text-blue-400">−</button>
                <button onClick={() => setZoomLevel(1)} className="px-2 hover:text-blue-400">{Math.round(zoomLevel * 100)}%</button>
                <button onClick={() => setZoomLevel(p => Math.min(4, p + 0.5))} className="px-1.5 hover:text-blue-400">+</button>
              </div>
              <button onClick={handleDownload} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => { setIsFullscreen(false); setZoomLevel(1) }} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoomLevel(p => Math.max(0.25, Math.min(4, p + (e.deltaY > 0 ? -0.15 : 0.15)))) }}
          >
            <img src={currentItem.url} alt={currentItem.title} className="rounded-lg shadow-2xl transition-transform duration-150" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }} draggable={false} />
          </div>

          {displayItems.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + displayItems.length) % displayItems.length); setZoomLevel(1) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % displayItems.length); setZoomLevel(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

ImagePreviewNode.displayName = 'ImagePreviewNode'

export default ImagePreviewNode
