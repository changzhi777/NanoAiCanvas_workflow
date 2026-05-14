/**
 * 故事板视频+音频合成节点 — TVC 视频专用
 * 样式参照 ImagePreviewNode：card-node + node-type-strip
 * 功能：接收分镜图片 → 并行调用视频API → 可选BGM/配音 → 预览/下载
 * 3节点流程的终端节点：文案/剧本 → 分镜故事板 → 本节点(含输出)
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Video, Download, CheckCircle2, X, Clock,
  ChevronLeft, ChevronRight, ShieldCheck, Loader2,
  Settings, Music, Mic,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/useToast'
import { assets as assetsApi, AssetCreate } from '@/lib/api/client'

// ==================== 类型定义 ====================

type ApiProvider = 'minimax' | 'glm' | 'jimeng'

export interface StoryboardVideoNodeData extends WorkflowNodeData {
  params: {
    apiProvider: ApiProvider
    model?: string
    duration: number
    promptTemplate: string
    enableBgm: boolean
    enableVoiceover: boolean
    enableAssetSave: boolean
    enableDownload: boolean
  }
  result?: {
    videos?: string[]
    videoIds?: string[]
    bgmUrl?: string
    voiceoverUrl?: string
    prompt?: string
    scriptTitle?: string
    savedToAsset?: boolean
    downloaded?: boolean
  }
}

interface VideoItem {
  id: string
  url: string
  thumbnail?: string
  status: 'pending' | 'generating' | 'success' | 'error'
  progress: number
  prompt?: string
}

// ==================== 常量 ====================

const API_PROVIDERS: { label: string; value: ApiProvider }[] = [
  { label: 'MiniMax Hailuo（推荐）', value: 'minimax' },
  { label: '智谱 GLM', value: 'glm' },
  { label: '即梦 Jimeng', value: 'jimeng' },
]

const PROVIDER_MODELS: Record<ApiProvider, { label: string; value: string }[]> = {
  minimax: [
    { label: 'Hailuo-2.3-Fast-768P', value: 'hailuo-2.3-fast-768P' },
    { label: 'Hailuo-2.3-768P', value: 'hailuo-2.3-768P' },
  ],
  glm: [
    { label: 'GLM-CogVideoX', value: 'cogvideox-3' },
  ],
  jimeng: [
    { label: 'Jimeng-Video', value: 'jimeng-video' },
  ],
}

const statusMap: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
  [NodeStatus.IDLE]: { icon: Clock, label: '等待中', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Clock, label: '合成中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: X, label: '失败', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Clock, label: '禁用', cls: 'not-started' },
}

// ==================== 主组件 ====================

export const StoryboardVideoNode = ({ id, data }: NodeProps<StoryboardVideoNodeData>) => {
  const { nodes, edges, updateNode, updateNodeParams } = useNanoaiWorkflowStore()
  const { toast } = useToast()

  const [showSettings, setShowSettings] = useState(false)
  const [videoItems, setVideoItems] = useState<VideoItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bgmStatus, setBgmStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const assetSaveRef = useRef(false)

  const params = useMemo(() => ({
    ...data.params,
    apiProvider: (data.params?.apiProvider || 'minimax') as ApiProvider,
    duration: data.params?.duration ?? 6,
    promptTemplate: data.params?.promptTemplate ?? '',
    enableBgm: data.params?.enableBgm ?? false,
    enableVoiceover: data.params?.enableVoiceover ?? false,
    enableAssetSave: data.params?.enableAssetSave ?? true,
    enableDownload: data.params?.enableDownload ?? true,
  }), [data.params])

  // 上游分镜数据
  const sourceData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return null
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return sourceNode?.data
  }, [edges, nodes, id])

  const sourceImages: string[] = useMemo(() => sourceData?.result?.images || [], [sourceData])
  const sourceShots = sourceData?.result?.shots || []
  const sourceScript = sourceData?.result?.text || sourceData?.params?.inputText || ''
  const scriptTitle = sourceData?.result?.scriptTitle || data.result?.scriptTitle || ''

  const resultVideos: string[] = data.result?.videos || []
  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  const hasUpstream = sourceImages.length > 0
  const count = resultVideos.length || sourceImages.length
  const previewWidth = count <= 1 ? 480 : count <= 4 ? 520 : 560
  const gridCols = count <= 1 ? 1 : count <= 4 ? 2 : 3

  // === 视频API调用封装 ===
  const callVideoApi = useCallback(async (prompt: string, provider: ApiProvider, model?: string, duration?: number, imageUrl?: string) => {
    let requestId: string
    if (provider === 'minimax') {
      const { generateVideo } = await import('@/lib/api/minimax-api')
      requestId = await generateVideo({ prompt, model: model || 'hailuo-2.3-fast-768P', duration: duration || 6 })
      const { pollVideoResult } = await import('@/lib/api/minimax-api')
      return await pollVideoResult(requestId)
    } else if (provider === 'glm') {
      const { generateVideo } = await import('@/lib/api/glm-api')
      requestId = await generateVideo({ prompt, model, imageUrl })
      const { pollVideoResult } = await import('@/lib/api/glm-api')
      return await pollVideoResult(requestId)
    } else {
      const { generateVideo } = await import('@/lib/api/jimeng-api')
      requestId = await generateVideo({ prompt, model })
      const { pollVideoResult } = await import('@/lib/api/jimeng-api')
      return await pollVideoResult(requestId)
    }
  }, [])

  // === 执行视频+音频生成 ===
  const handleExecute = useCallback(async () => {
    if (!hasUpstream) {
      updateNode(id, { status: NodeStatus.ERROR, error: '请先连接分镜图片来源' })
      return
    }

    updateNode(id, { status: NodeStatus.RUNNING })
    assetSaveRef.current = false
    const provider = params.apiProvider

    // 初始化视频项
    const initialItems: VideoItem[] = sourceImages.map((img, i) => ({
      id: `video-${i}-${Date.now()}`,
      url: '',
      thumbnail: img,
      status: 'pending' as const,
      progress: 0,
      prompt: sourceShots[i]?.visual_prompt || params.promptTemplate,
    }))
    setVideoItems(initialItems)

    const videos: string[] = []
    const videoIds: string[] = []
    let bgmUrl: string | undefined
    let voiceoverUrl: string | undefined

    try {
      // 阶段1: 并行生成视频
      const videoResults = await Promise.allSettled(
        sourceImages.map(async (_, index) => {
          setVideoItems(prev => prev.map((item, i) =>
            i === index ? { ...item, status: 'generating', progress: 10 } : item
          ))

          const prompt = sourceShots[index]?.visual_prompt || params.promptTemplate || '基于分镜图片生成视频'
          const videoUrl = await callVideoApi(prompt, provider, params.model, params.duration, sourceImages[index])

          setVideoItems(prev => prev.map((item, i) =>
            i === index ? { ...item, status: 'success', url: videoUrl, progress: 100 } : item
          ))
          return videoUrl
        })
      )

      videoResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          videos.push(result.value)
        } else {
          setVideoItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error' } : item
          ))
        }
      })

      if (videos.length === 0) throw new Error('所有视频生成失败')

      // 阶段2: 音频合成（可选，与视频生成串行避免过度并发）
      if (params.enableBgm) {
        setBgmStatus('generating')
        try {
          const { generateMusic, pollMusicResult } = await import('@/lib/api/minimax-api')
          const bgmPrompt = `${scriptTitle || 'TVC广告'} 背景音乐 30秒`
          const reqId = await generateMusic({ prompt: bgmPrompt })
          bgmUrl = await pollMusicResult(reqId)
          setBgmStatus('success')
        } catch {
          setBgmStatus('error')
        }
      }

      if (params.enableVoiceover && sourceScript) {
        setVoiceStatus('generating')
        try {
          const { generateSpeech } = await import('@/lib/api/minimax-api')
          voiceoverUrl = await generateSpeech({ text: sourceScript })
          setVoiceStatus('success')
        } catch {
          setVoiceStatus('error')
        }
      }

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: { videos, videoIds, bgmUrl, voiceoverUrl, prompt: params.promptTemplate, scriptTitle },
      })
      toast.success(`${videos.length} 个视频${bgmUrl ? ' + BGM' : ''}${voiceoverUrl ? ' + 配音' : ''}生成完成`)

      // 保存视频资产到资产库
      if (params.enableAssetSave && !assetSaveRef.current) {
        assetSaveRef.current = true
        const token = localStorage.getItem('nanoai_token')
        if (token) {
          let savedCount = 0
          for (let i = 0; i < videos.length; i++) {
            try {
              const asset: AssetCreate = {
                type: 'video',
                name: `${scriptTitle || 'TVC'}_P${i + 1}_${Date.now()}`,
                url: videos[i],
                thumbnail_url: sourceImages[i] || undefined,
                category: 'tvc',
                tags: [scriptTitle || 'TVC', `镜头${i + 1}`],
                source_node_id: id,
                version: 'v1',
              }
              await assetsApi.create(asset, token)
              savedCount++
            } catch (err) {
              console.error(`视频 P${i + 1} 保存资产失败:`, err)
            }
          }
          if (savedCount > 0) {
            updateNode(id, {
              result: { videos, videoIds, bgmUrl, voiceoverUrl, prompt: params.promptTemplate, scriptTitle, savedToAsset: true },
            })
            toast.success(`${savedCount} 个视频已保存到资产库`)
          }
        }
      }
    } catch (err: any) {
      updateNode(id, { status: NodeStatus.ERROR, error: err.message || '视频生成失败' })
      toast.error(err.message || '视频生成失败')
    }
  }, [id, hasUpstream, params, sourceImages, sourceShots, sourceScript, scriptTitle, callVideoApi, updateNode, toast])

  // === 单个视频重生成 ===
  const handleRegenerate = useCallback(async (index: number) => {
    if (!sourceImages[index]) return
    setVideoItems(prev => prev.map((item, i) =>
      i === index ? { ...item, status: 'generating', progress: 10 } : item
    ))
    try {
      const prompt = sourceShots[index]?.visual_prompt || params.promptTemplate || '基于分镜图片生成视频'
      const videoUrl = await callVideoApi(prompt, params.apiProvider, params.model, params.duration)
      setVideoItems(prev => prev.map((item, i) =>
        i === index ? { ...item, status: 'success', url: videoUrl, progress: 100 } : item
      ))
      const currentVideos = [...(data.result?.videos || [])]
      currentVideos[index] = videoUrl
      updateNode(id, { result: { ...data.result, videos: currentVideos } })
      toast.success(`视频 P${index + 1} 重新生成完成`)
    } catch (err: any) {
      setVideoItems(prev => prev.map((item, i) =>
        i === index ? { ...item, status: 'error' } : item
      ))
      toast.error(`视频 P${index + 1} 生成失败: ${err.message}`)
    }
  }, [params, sourceImages, sourceShots, data.result, id, callVideoApi, updateNode, toast])

  // === 下载 ===
  const handleDownload = useCallback(async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `TVC_P${index + 1}_${Date.now()}.mp4`
      link.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      const link = document.createElement('a')
      link.href = url
      link.download = `TVC_P${index + 1}.mp4`
      link.click()
    }
  }, [])

  const handleDownloadAll = useCallback(async () => {
    const urls = resultVideos.length > 0 ? resultVideos : videoItems.filter(v => v.url).map(v => v.url)
    for (let i = 0; i < urls.length; i++) {
      await handleDownload(urls[i], i)
      await new Promise(r => setTimeout(r, 300))
    }
  }, [resultVideos, videoItems, handleDownload])

  const openFullscreen = useCallback((idx: number) => {
    setCurrentIndex(idx)
    setIsFullscreen(true)
  }, [])

  const currentVideo = resultVideos[currentIndex] || videoItems[currentIndex]?.url

  const displayVideos = useMemo(() => {
    if (resultVideos.length > 0) {
      return resultVideos.map((url, i) => ({ url, thumbnail: sourceImages[i], status: 'success' as const, index: i }))
    }
    return videoItems.filter(v => v.status === 'success' && v.url).map((v, i) => ({
      url: v.url, thumbnail: v.thumbnail || sourceImages[i], status: v.status, index: i,
    }))
  }, [resultVideos, videoItems, sourceImages])

  const handleParamChange = useCallback((key: string, value: any) => {
    const updates: Record<string, any> = { [key]: value }
    // Auto-switch model when provider changes
    if (key === 'apiProvider') {
      const defaultModel = PROVIDER_MODELS[value as ApiProvider]?.[0]?.value
      if (defaultModel) updates.model = defaultModel
    }
    updateNodeParams(id, updates)
  }, [id, updateNodeParams])

  const providerModels = PROVIDER_MODELS[params.apiProvider] || []

  // 音频状态标签
  const audioLabels = useMemo(() => {
    const labels: string[] = []
    if (params.enableBgm) {
      labels.push(bgmStatus === 'success' ? 'BGM ✓' : bgmStatus === 'generating' ? 'BGM ...' : 'BGM')
    }
    if (params.enableVoiceover) {
      labels.push(voiceStatus === 'success' ? '配音 ✓' : voiceStatus === 'generating' ? '配音 ...' : '配音')
    }
    return labels
  }, [params.enableBgm, params.enableVoiceover, bgmStatus, voiceStatus])

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
          id="video-in"
        />

        <div className="space-y-2 p-3">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">
                {scriptTitle || 'TVC 视频合成'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {data.result?.savedToAsset && (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              )}
              <Badge variant="default" className={cn('status-badge', statusInfo.cls)}>
                <StatusIcon className="w-3 h-3" />
                <span>{statusInfo.label}</span>
              </Badge>
            </div>
          </div>

          <Separator className="my-1" />

          {/* 设置面板 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex items-center gap-1.5 text-xs w-full px-2 py-1.5 rounded-md transition-colors',
              'hover:bg-white/5 text-slate-400'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>合成设置</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {API_PROVIDERS.find(p => p.value === params.apiProvider)?.label}
            </span>
            <span className="text-[10px]">{showSettings ? '▲' : '▼'}</span>
          </button>

          {showSettings && (
            <div className="space-y-2.5 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
              {/* 视频 API */}
              <div>
                <span className="text-[10px] text-muted-foreground">视频 API</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {API_PROVIDERS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleParamChange('apiProvider', opt.value)}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] transition-colors',
                        params.apiProvider === opt.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 模型 */}
              {providerModels.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground">模型</span>
                  <div className="flex gap-1.5 mt-1">
                    {providerModels.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleParamChange('model', opt.value)}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] transition-colors',
                          (params.model || providerModels[0].value) === opt.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 时长 */}
              <div>
                <span className="text-[10px] text-muted-foreground">视频时长: {params.duration}秒</span>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={params.duration}
                  onChange={e => handleParamChange('duration', Number(e.target.value))}
                  className="w-full h-1 mt-1 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>3s</span>
                  <span>10s</span>
                </div>
              </div>

              {/* 音频选项 */}
              <div className="border-t border-white/5 pt-2">
                <span className="text-[10px] text-muted-foreground">音频合成</span>
                <div className="flex gap-2 mt-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.enableBgm}
                      onChange={e => handleParamChange('enableBgm', e.target.checked)}
                      className="rounded"
                    />
                    <Music className="w-3 h-3 text-orange-400" />
                    <span>背景音乐</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.enableVoiceover}
                      onChange={e => handleParamChange('enableVoiceover', e.target.checked)}
                      className="rounded"
                    />
                    <Mic className="w-3 h-3 text-blue-400" />
                    <span>配音旁白</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 状态标签行 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {audioLabels.map((label, i) => (
              <span key={i} className={cn(
                'text-[10px] px-2 py-0.5 rounded-full',
                label.includes('✓')
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : label.includes('...')
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'bg-white/5 text-slate-500'
              )}>
                {label}
              </span>
            ))}
          </div>

          {/* 执行按钮 */}
          <button
            onClick={handleExecute}
            disabled={!hasUpstream || data.status === NodeStatus.RUNNING}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              hasUpstream && data.status !== NodeStatus.RUNNING
                ? 'bg-[#3ecf8e] text-white hover:bg-[#2db87a]'
                : 'bg-white/5 text-slate-500 cursor-not-allowed'
            )}
          >
            {data.status === NodeStatus.RUNNING ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />合成中...</>
            ) : (
              <><Video className="w-3.5 h-3.5" />生成视频{audioLabels.length > 0 ? '+音频' : ''}</>
            )}
          </button>

          {/* 生成中进度网格 */}
          {data.status === NodeStatus.RUNNING && videoItems.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(videoItems.length, 3)}, 1fr)` }}>
              {videoItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="relative rounded-lg overflow-hidden border border-white/10"
                  style={{ aspectRatio: '16/9' }}
                >
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={`P${idx + 1}`} className="w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                    {item.status === 'generating' ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#3ecf8e] animate-spin mb-1" />
                        <span className="text-[9px] text-[#3ecf8e]">P{idx + 1}</span>
                      </>
                    ) : item.status === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500 mb-1" />
                        <span className="text-[9px] text-green-500">P{idx + 1} ✓</span>
                      </>
                    ) : item.status === 'error' ? (
                      <>
                        <X className="w-4 h-4 text-red-500 mb-1" />
                        <span className="text-[9px] text-red-500">P{idx + 1} ✗</span>
                      </>
                    ) : (
                      <span className="text-[9px] text-muted-foreground">P{idx + 1}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 视频网格预览 */}
          {data.status === NodeStatus.SUCCESS && displayVideos.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              {displayVideos.map((video, idx) => (
                <button
                  key={idx}
                  onClick={() => openFullscreen(idx)}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border-2 transition-all duration-200',
                    'hover:border-primary hover:scale-[1.02]',
                    idx === currentIndex ? 'border-primary' : 'border-white/10'
                  )}
                  style={{ aspectRatio: '16/9' }}
                >
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={`P${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
                    P{idx + 1}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="p-1.5 rounded-full bg-white/20">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 加载中占位 */}
          {data.status === NodeStatus.RUNNING && videoItems.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-[#3ecf8e]">准备生成...</span>
            </div>
          )}

          {/* 底部操作栏 */}
          {(data.status === NodeStatus.SUCCESS || data.status === NodeStatus.RUNNING) && count > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">
                {displayVideos.length}/{count} 视频 · {params.duration}s
                {data.result?.bgmUrl && ' · BGM'}
                {data.result?.voiceoverUrl && ' · 配音'}
              </span>
              {data.status === NodeStatus.SUCCESS && displayVideos.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  下载全部
                </button>
              )}
            </div>
          )}

          {/* 无数据 */}
          {data.status !== NodeStatus.RUNNING && displayVideos.length === 0 && videoItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
              <Video className="w-6 h-6 mb-1 opacity-30" />
              <p className="text-[10px]">连接分镜图片以生成视频</p>
            </div>
          )}

          {/* 错误 */}
          {data.status === NodeStatus.ERROR && data.error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {data.error}
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary !border-primary transition-all duration-200"
          id="video-out"
        />
      </div>

      {/* 全屏播放器 */}
      {isFullscreen && currentVideo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => handleDownload(currentVideo, currentIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ecf8e] hover:bg-[#2db87a] text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> 下载
            </button>
            <button
              onClick={() => handleRegenerate(currentIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
            >
              重新生成
            </button>
            <button onClick={() => setIsFullscreen(false)} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="relative w-full max-w-4xl mx-8">
              <video key={currentVideo} src={currentVideo} controls autoPlay className="w-full rounded-lg shadow-2xl" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-sm font-bold bg-black/70 text-white backdrop-blur-sm">
                P{currentIndex + 1}
              </span>
            </div>
          </div>

          {count > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + count) % count) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % count) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

StoryboardVideoNode.displayName = 'StoryboardVideoNode'

export default StoryboardVideoNode
