/**
 * 图片预览节点 — 分镜头绘本版
 * 支持横向/纵向布局，显示场景描述，P编号
 * 自动保存到资产库（storyboard_shot）+ 下载
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  CheckCircle2, X, ChevronLeft, ChevronRight,
  ZoomIn, FileImage, Circle, Clock,
  Download, ShieldCheck, Loader2,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/useToast'
import { createImageAssetApi } from '@/lib/api/image-assets'
import { type AspectRatio, type LayoutDirection, type StoryboardShot } from './StoryboardShotA.shared'

export interface ImagePreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean
    sourceNodeId?: string
    enableAssetSave: boolean
    enableDownload: boolean
    layoutDirection?: LayoutDirection
  }
  result?: {
    images?: string[]
    imageUrl?: string
    prompt?: string
    rawPrompt?: string
    optimizedPrompt?: string
    shots?: StoryboardShot[]
    scriptTitle?: string
    startedAt?: string
    completedAt?: string
    savedToAsset?: boolean
    savedAssetIds?: string[]
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

// 保存状态追踪
interface SaveState {
  [imageIndex: number]: 'idle' | 'saving' | 'saved' | 'error'
}

export const ImagePreviewNode = ({ id, data }: NodeProps<ImagePreviewNodeData>) => {
  const { nodes, edges, updateNode } = useNanoaiWorkflowStore()
  const { toast } = useToast()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [saveStates, setSaveStates] = useState<SaveState>({})
  const autoSaveRef = useRef(false)

  // 上游数据
  const sourceData = useMemo(() => {
    if (data.params.sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId)
      return sourceNode?.data
    }
    const incomingEdge = edges.find(e => e.target === id)
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source)
      return sourceNode?.data
    }
    return data
  }, [edges, nodes, id, data.params.sourceNodeId, data])

  const resultData = sourceData?.result
  const shots: StoryboardShot[] = resultData?.shots || []
  const layoutDir: LayoutDirection = (sourceData?.params as any)?.layoutDirection || data.params.layoutDirection || 'horizontal'
  const upstreamAspectRatio: AspectRatio = (sourceData?.params as any)?.aspectRatio || '16:9'

  const displayImages = useMemo(() => resultData?.images || [], [resultData])
  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon
  const aspectCSS = upstreamAspectRatio.replace(':', '/')

  // === 动态宽度 + 自适应列数 ===
  const count = displayImages.length
  const previewWidth = count <= 1 ? 520 : count <= 4 ? 520 : count <= 9 ? 560 : 600
  const gridCols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4

  // === 自动保存到资产库 ===
  useEffect(() => {
    if (!displayImages.length) return
    if (data.status !== NodeStatus.SUCCESS) return
    if (resultData?.savedToAsset) return
    if (autoSaveRef.current) return

    autoSaveRef.current = true

    const savedIds: string[] = []
    let savedCount = 0

    const saveAll = async () => {
      const initialStates: SaveState = {}
      displayImages.forEach((_: string, i: number) => { initialStates[i] = 'saving' })
      setSaveStates(initialStates)

      for (let i = 0; i < displayImages.length; i++) {
        try {
          const shot = shots[i]
          const result = await createImageAssetApi({
            imageUrl: displayImages[i],
            prompt: shot?.visual_prompt || resultData?.prompt || '',
            enhancedPrompt: shot?.scene_description || '',
            params: {
              type: 'storyboard_shot',
              shotNumber: i + 1,
              cameraAngle: shot?.camera_angle || '',
              mood: shot?.mood || '',
              aspectRatio: upstreamAspectRatio,
              scriptTitle: resultData?.scriptTitle || '',
            },
          })
          if (result.success && result.asset?.id) {
            savedIds.push(result.asset.id)
            initialStates[i] = 'saved'
            savedCount++
          } else {
            initialStates[i] = 'error'
          }
        } catch {
          initialStates[i] = 'error'
        }
        setSaveStates({ ...initialStates })
      }

      // 标记节点结果已保存
      if (savedCount > 0) {
        updateNode(id, {
          result: { ...resultData, savedToAsset: true, savedAssetIds: savedIds },
        } as any)
        toast.success(`${savedCount} 张图片已保存到资产库`)
      }
    }

    saveAll()
  }, [displayImages, data.status, resultData?.savedToAsset])

  // === 下载单张 ===
  const handleDownload = useCallback(async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `nanoai_P${index + 1}_${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `nanoai_P${index + 1}.png`
      link.click()
    }
  }, [])

  // === 下载全部 ===
  const handleDownloadAll = useCallback(async () => {
    for (let i = 0; i < displayImages.length; i++) {
      await handleDownload(displayImages[i], i)
      await new Promise(r => setTimeout(r, 200))
    }
  }, [displayImages, handleDownload])

  // === 全屏查看索引 ===
  const openFullscreen = useCallback((idx: number) => {
    setCurrentIndex(idx)
    setZoomLevel(1)
    setIsFullscreen(true)
  }, [])

  const currentItem = displayImages[currentIndex]

  return (
    <>
      <div
        className="card-node node-appear node-end !overflow-visible"
        style={{
          width: previewWidth,
          minHeight: 160,
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
              <h3 className="font-semibold text-foreground truncate text-xs">
                {resultData?.scriptTitle || '图片预览'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {/* 保存状态 */}
              {resultData?.savedToAsset && (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                  <ShieldCheck className="w-3 h-3" />
                  已保存
                </span>
              )}
              <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
                <StatusIcon className="w-3 h-3" />
                <span>{statusInfo.label}</span>
              </Badge>
            </div>
          </div>

          <Separator className="my-1" />

          {/* 加载中 */}
          {data.status === NodeStatus.RUNNING && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-primary">加载图片...</span>
            </div>
          )}

          {/* === 单图大图模式 === */}
          {data.status !== NodeStatus.RUNNING && count === 1 && displayImages.length > 0 && (
            <button
              onClick={() => openFullscreen(0)}
              className="relative group rounded-lg overflow-hidden border border-white/10 w-full hover:border-primary transition-all duration-200"
              style={{ aspectRatio: aspectCSS }}
            >
              <img src={displayImages[0]} alt="P1" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
                P1
              </span>
              {/* 保存状态指示 */}
              {saveStates[0] === 'saving' && (
                <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-500/80 text-white">
                  <Loader2 className="w-3 h-3 animate-spin" /> 保存中
                </span>
              )}
              {saveStates[0] === 'saved' && (
                <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-green-500/80 text-white">
                  <ShieldCheck className="w-3 h-3" /> 已保存
                </span>
              )}
              {/* Hover 遮罩 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                  <div className="p-2 rounded-full bg-white/20 hover:bg-white/30" onClick={(e) => { e.stopPropagation(); handleDownload(displayImages[0], 0) }}>
                    <Download className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              {/* prompt 叠加 */}
              {resultData?.prompt && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white/80 line-clamp-2">{resultData.prompt}</p>
                </div>
              )}
            </button>
          )}

          {/* === 多图网格模式 === */}
          {data.status !== NodeStatus.RUNNING && count > 1 && displayImages.length > 0 && (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {displayImages.map((img: string, idx: number) => {
                const shot = shots[idx]
                return (
                  <button
                    key={idx}
                    onClick={() => openFullscreen(idx)}
                    className={cn(
                      'relative group rounded-lg overflow-hidden border-2 transition-all duration-200',
                      'hover:border-primary hover:scale-[1.02]',
                      idx === currentIndex ? 'border-primary' : 'border-white/10'
                    )}
                    style={{ aspectRatio: aspectCSS }}
                  >
                    <img src={img} alt={`P${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
                      P{idx + 1}
                    </span>
                    {/* 保存状态小圆点 */}
                    {saveStates[idx] === 'saving' && (
                      <span className="absolute top-1 right-1">
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                      </span>
                    )}
                    {saveStates[idx] === 'saved' && (
                      <span className="absolute top-1 right-1">
                        <ShieldCheck className="w-3 h-3 text-green-400" />
                      </span>
                    )}
                    {/* Hover 遮罩 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1">
                        <div className="p-1.5 rounded-full bg-black/50 hover:bg-black/60">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="p-1.5 rounded-full bg-black/50 hover:bg-black/60" onClick={(e) => { e.stopPropagation(); handleDownload(img, idx) }}>
                          <Download className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                    {/* 场景描述（纵向布局） */}
                    {shot && layoutDir === 'vertical' && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-1.5 py-1">
                        <p className="text-[9px] text-white/90 line-clamp-2">{shot.scene_description}</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* === 底部操作栏 === */}
          {data.status !== NodeStatus.RUNNING && displayImages.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">
                {count} 张 · {upstreamAspectRatio}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  下载全部
                </button>
              </div>
            </div>
          )}

          {/* 无数据 */}
          {data.status !== NodeStatus.RUNNING && displayImages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
              <FileImage className="w-6 h-6 mb-1 opacity-30" />
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

      {/* ====== 全屏灯箱 ====== */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1) }}
        >
          {/* 顶部工具栏 */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
            <div className="flex-1 mr-4">
              {resultData?.prompt && (
                <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-200 max-w-md truncate">
                  <span className="text-blue-400 font-medium mr-1">Prompt:</span>{resultData.prompt}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 缩放 */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                <button onClick={() => setZoomLevel(p => Math.max(0.25, p - 0.5))} className="px-1.5 hover:text-blue-400">−</button>
                <button onClick={() => setZoomLevel(1)} className="px-2 hover:text-blue-400">{Math.round(zoomLevel * 100)}%</button>
                <button onClick={() => setZoomLevel(p => Math.min(4, p + 0.5))} className="px-1.5 hover:text-blue-400">+</button>
              </div>
              {/* 下载 */}
              <button
                onClick={() => handleDownload(currentItem, currentIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ecf8e] hover:bg-[#2db87a] text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                下载
              </button>
              {/* 保存状态 */}
              {saveStates[currentIndex] === 'saved' && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/80 text-white text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> 已保存
                </span>
              )}
              <button onClick={() => { setIsFullscreen(false); setZoomLevel(1) }} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 图片区域 */}
          <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoomLevel(p => Math.max(0.25, Math.min(4, p + (e.deltaY > 0 ? -0.15 : 0.15)))) }}
          >
            <div className="relative">
              <img src={currentItem} alt="预览" className="rounded-lg shadow-2xl transition-transform duration-150" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }} draggable={false} />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-sm font-bold bg-black/70 text-white backdrop-blur-sm">{count > 1 ? `P${currentIndex + 1}` : 'P1'}</span>
              {shots[currentIndex] && (
                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400 font-bold text-sm">P{currentIndex + 1}</span>
                    <span className="text-white/60 text-xs">{shots[currentIndex].camera_angle}</span>
                  </div>
                  <p className="text-white/90 text-xs line-clamp-3">{shots[currentIndex].scene_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* 导航箭头 */}
          {count > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + count) % count); setZoomLevel(1) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % count); setZoomLevel(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
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
