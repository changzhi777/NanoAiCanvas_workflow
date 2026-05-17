/**
 * TVC 视频合成节点 — FFmpeg 后台合成 + 预览
 * 接收上游分镜视频 + BGM → 调用后端 FFmpeg 合成 → 预览/下载完整 TVC
 * 样式：card-node + 全屏播放器
 * 参数在 WorkflowPropertiesPanel 属性面板
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Video, Download, X, Clock,
  ShieldCheck, Loader2, Play, Music, Film,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/useToast'
import { client } from '@/lib/api/client'

export interface StoryboardVideoNodeData extends WorkflowNodeData {
  params: {
    transition: string
    outputFormat: string
    resolution: string
    enableBgmMix: boolean
    bgmVolume: number
  }
  result?: {
    composedUrl?: string
    duration?: number
    shotCount?: number
    savedToAsset?: boolean
  }
}

const statusMap: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
  [NodeStatus.IDLE]: { icon: Clock, label: '等待中', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Loader2, label: '合成中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: ShieldCheck, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: X, label: '失败', cls: 'blocked' },
}

export const StoryboardVideoNode = ({ id, data }: NodeProps<StoryboardVideoNodeData>) => {
  const { nodes, edges, updateNode } = useNanoaiWorkflowStore()
  const { toast } = useToast()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 上游数据
  const sourceData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return null
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return sourceNode?.data
  }, [edges, nodes, id])

  const sourceVideos: string[] = useMemo(() => sourceData?.result?.videos || [], [sourceData])
  const sourceBgm = sourceData?.result?.bgmUrl
  const hasUpstream = sourceVideos.length > 0

  const composedUrl = data.result?.composedUrl
  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  // === FFmpeg 合成 ===
  const handleCompose = useCallback(async () => {
    if (!hasUpstream) {
      toast.error('请先等待上游分镜视频生成完成')
      return
    }

    updateNode(id, { status: NodeStatus.RUNNING, error: undefined })

    try {
      const response = await client.post<{ url: string; duration: number }>('/v2/tvc-tasks/compose', {
        video_urls: sourceVideos,
        bgm_url: data.params.enableBgmMix ? sourceBgm : undefined,
        bgm_volume: data.params.bgmVolume,
        transition: data.params.transition,
        resolution: data.params.resolution,
        output_format: data.params.outputFormat,
      })

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          composedUrl: response.url,
          duration: response.duration,
          shotCount: sourceVideos.length,
        },
      })
      toast.success(`TVC 合成完成：${sourceVideos.length} 个镜头，${Math.round(response.duration)}秒`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '合成失败'
      updateNode(id, { status: NodeStatus.ERROR, error: message })
      toast.error(`合成失败: ${message}`)
    }
  }, [id, hasUpstream, sourceVideos, sourceBgm, data.params, updateNode, toast])

  // === 下载 ===
  const handleDownload = useCallback(async () => {
    if (!composedUrl) return
    try {
      const resp = await fetch(composedUrl)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TVC_Complete_${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const a = document.createElement('a')
      a.href = composedUrl
      a.download = `TVC_Complete.mp4`
      a.click()
    }
  }, [composedUrl])

  const previewWidth = 520

  return (
    <>
      <div
        className="card-node node-appear node-end !overflow-visible"
        style={{
          width: previewWidth,
          minHeight: 140,
          willChange: 'auto',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div className="node-type-strip" />

        <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="video-in" />

        <div className="space-y-2 p-3">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">{data?.label || "TVC 视频合成"}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {data.result?.savedToAsset && <ShieldCheck className="w-3 h-3 text-green-500" />}
              <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
                <StatusIcon className={cn('w-3 h-3', data.status === NodeStatus.RUNNING && 'animate-spin')} />
                <span>{statusInfo.label}</span>
              </Badge>
            </div>
          </div>

          <Separator className="my-1" />

          {/* 等待合成 */}
          {(data.status === NodeStatus.IDLE || data.status === NodeStatus.ERROR) && (
            <div className="flex flex-col items-center gap-2 py-3">
              {/* 上游状态摘要 */}
              {hasUpstream ? (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Film className="w-3 h-3" />
                    <span>{sourceVideos.length} 个镜头视频就绪</span>
                    {sourceBgm && <><span>·</span><Music className="w-3 h-3 text-orange-400" /><span>BGM</span></>}
                  </div>
                  <button
                    onClick={handleCompose}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    合成完整 TVC
                  </button>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mb-1 opacity-30" />
                  <p className="text-[10px] text-muted-foreground">等待上游视频生成完成</p>
                </>
              )}
              {data.status === NodeStatus.ERROR && (
                <p className="text-[10px] text-red-400 text-center line-clamp-2 max-w-[280px]">{data.error}</p>
              )}
            </div>
          )}

          {/* 合成中 */}
          {data.status === NodeStatus.RUNNING && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs font-medium text-primary">FFmpeg 合成中...</span>
              <span className="text-[10px] text-muted-foreground">拼接 {sourceVideos.length} 个镜头 + 混音</span>
            </div>
          )}

          {/* 合成完成 — 预览 */}
          {data.status === NodeStatus.SUCCESS && composedUrl && (
            <div className="flex flex-col gap-2">
              <div className="relative rounded-lg overflow-hidden border border-white/10" style={{ aspectRatio: '16/9' }}>
                <video src={composedUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Play className="w-8 h-8 text-white" />
                </div>
                <span className="absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold bg-black/70 text-white">
                  {data.result?.shotCount || sourceVideos.length} 镜头 · {data.result?.duration ? `${Math.round(data.result.duration)}s` : ''}
                </span>
              </div>

              {/* 底部操作 */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  <Play className="w-3 h-3" /> 全屏播放
                </button>
                <button onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30 transition-colors"
                >
                  <Download className="w-3 h-3" /> 下载 TVC
                </button>
              </div>
            </div>
          )}

          {/* 镜头时间线缩略 */}
          {hasUpstream && sourceVideos.length > 0 && data.status !== NodeStatus.RUNNING && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">镜头素材</span>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(sourceVideos.length, 4)}, 1fr)` }}>
                {sourceVideos.slice(0, 8).map((url, idx) => (
                  <div key={idx} className="relative rounded overflow-hidden border border-white/10" style={{ aspectRatio: '16/9' }}>
                    <video src={url} className="w-full h-full object-cover" muted />
                    <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] bg-black/60 text-white">V{idx + 1}</span>
                  </div>
                ))}
              </div>
              {sourceVideos.length > 8 && (
                <span className="text-[9px] text-muted-foreground text-center">+{sourceVideos.length - 8} 个镜头</span>
              )}
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="video-out" />
      </div>

      {/* ====== 全屏播放器 ====== */}
      {isFullscreen && composedUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ecf8e] hover:bg-[#2db87a] text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> 下载
            </button>
            <button onClick={() => setIsFullscreen(false)} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="relative w-full max-w-5xl mx-8">
              <video key={composedUrl} src={composedUrl} controls autoPlay className="w-full rounded-lg shadow-2xl" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-sm font-bold bg-black/70 text-white backdrop-blur-sm">
                TVC 完整视频 · {data.result?.shotCount || sourceVideos.length} 镜头
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

StoryboardVideoNode.displayName = 'StoryboardVideoNode'

export default StoryboardVideoNode
