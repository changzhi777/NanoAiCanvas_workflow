/**
 * 分镜头故事板节点 — 集成图片+视频+BGM 全流程
 * 参考 ImagePreviewNode 样式：card-node + 灯箱
 * TVC 模式：首帧+尾帧 → 视频 → BGM 三阶段顺序执行
 * 所有参数配置在 WorkflowPropertiesPanel 属性面板中
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Film, Video, Music, X, ChevronLeft, ChevronRight,
  ZoomIn, Clock, Download, ShieldCheck, Loader2, Play,
  CheckCircle2,
} from 'lucide-react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/useToast'
import {
  generateNanoaiImageWithPolling,
  buildStoryboardPrompt,
} from '@/lib/api/suchuang-api'
import { TvcShot } from '@/lib/api/tvc-api'
import { assets as assetsApi } from '@/lib/api/client'

export type VideoProvider = 'minimax' | 'glm' | 'jimeng'

export interface StoryboardGeneratorData extends WorkflowNodeData {
  params: {
    // 图片参数
    dataSource: string
    style: string
    aspectRatio: string
    quality: 'standard' | 'hd'
    count: number
    referenceAssets: string[]
    characterRefs: Array<{ id: string; name: string; imageUrl: string; traits: string[] }>
    // 视频参数
    videoProvider: VideoProvider
    videoModel: string
    videoDuration: number
    // 音频参数
    enableBgm: boolean
    enableVoiceover: boolean
    // 资产保存
    enableAssetSave: boolean
  }
}

type Phase = 'idle' | 'images' | 'videos' | 'bgm' | 'done'

const statusMap: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
  [NodeStatus.IDLE]: { icon: Clock, label: '等待中', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Loader2, label: '执行中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: X, label: '失败', cls: 'blocked' },
}

export const StoryboardGeneratorNode = ({ id, data }: NodeProps<StoryboardGeneratorData>) => {
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const assetSaveRef = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  // 上游数据
  const { upstreamText, upstreamShots } = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return { upstreamText: '', upstreamShots: [] as TvcShot[] }
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    const r = sourceNode?.data?.result
    if (r?.text) return { upstreamText: r.text, upstreamShots: [] as TvcShot[] }
    if (r?.script?.shots?.length) {
      const script = r.script
      return {
        upstreamText: script.shots.map((s: TvcShot) => s.scene_description || '').join('\n'),
        upstreamShots: script.shots as TvcShot[],
      }
    }
    return { upstreamText: '', upstreamShots: [] as TvcShot[] }
  }, [edges, nodes, id])

  const scriptText = upstreamText || data.params.dataSource || ''
  const isTvcMode = upstreamShots.length > 0

  const fullPrompt = useMemo(() => {
    let rp = ''
    if (data.params.referenceAssets?.length > 0)
      rp = '\n\n参考图风格要求：' + data.params.referenceAssets.length + '张参考图用于保持视觉一致性'
    let cp = ''
    if (data.params.characterRefs?.length > 0) {
      const names = data.params.characterRefs.map(c => c.name).join('、')
      const traits = data.params.characterRefs[0]?.traits?.join('、') || ''
      cp = traits ? `\n\n角色一致性要求：${names}，保持以下特征：${traits}` : `\n\n角色一致性要求：${names}`
    }
    return buildStoryboardPrompt(scriptText || 'storyboard scene', data.params.style, { mood: 'cinematic', lighting: 'professional' }) + rp + cp
  }, [scriptText, data.params.style, data.params.referenceAssets, data.params.characterRefs])

  // 预览数据
  const shotImages = data.result?.shotImages as Array<{ shot: TvcShot; start_url: string; end_url: string }> | undefined
  const displayImages: string[] = useMemo(() => data.result?.images || [], [data.result])
  const resultVideos: string[] = data.result?.videos || []
  const bgmUrl = data.result?.bgmUrl

  // 灯箱列表（首帧+尾帧合并）
  const allImages = useMemo(() => {
    if (!shotImages?.length) return displayImages
    const merged: string[] = []
    for (const item of shotImages) {
      if (item.start_url) merged.push(item.start_url)
      if (item.end_url) merged.push(item.end_url)
    }
    return merged
  }, [shotImages, displayImages])

  const shotCount = isTvcMode ? upstreamShots.length : displayImages.length
  const videoCount = resultVideos.length
  const previewWidth = shotCount <= 1 ? 480 : shotCount <= 4 ? 520 : 560

  const statusInfo = statusMap[data.status] || statusMap[NodeStatus.IDLE]
  const StatusIcon = statusInfo.icon

  // === 视频API ===
  const callVideoApi = useCallback(async (
    prompt: string, provider: VideoProvider,
    model?: string, duration?: number,
    imageUrl?: string, lastImageUrl?: string,
  ) => {
    let reqId: string
    if (provider === 'minimax') {
      const { generateVideo } = await import('@/lib/api/minimax-api')
      reqId = await generateVideo({ prompt, model: model || 'hailuo-2.3-fast-768P', duration: duration || 6, imageUrl, lastImageUrl })
      const { pollVideoResult } = await import('@/lib/api/minimax-api')
      return await pollVideoResult(reqId)
    } else if (provider === 'glm') {
      const { generateVideo } = await import('@/lib/api/glm-api')
      const combined = lastImageUrl ? [imageUrl, lastImageUrl] as [string, string] : imageUrl
      reqId = await generateVideo({ prompt, model, imageUrl: combined })
      const { pollVideoResult } = await import('@/lib/api/glm-api')
      return await pollVideoResult(reqId)
    } else {
      const { generateVideo } = await import('@/lib/api/jimeng-api')
      reqId = await generateVideo({ prompt, model })
      const { pollVideoResult } = await import('@/lib/api/jimeng-api')
      return await pollVideoResult(reqId)
    }
  }, [])

  // === 全流程执行 ===
  const handleExecute = useCallback(async () => {
    const params = dataRef.current.params
    const prevResult = dataRef.current.result
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined })
      assetSaveRef.current = false

      const genOpts = {
        size: params.quality === 'hd' ? '2K' : '1K',
        aspectRatio: params.aspectRatio as '16:9' | '9:16' | '4:3' | '1:1',
      }

      // ========== Phase 1: 生图 ==========
      setPhase('images')
      setProgress(0)
      setProgressMessage('阶段1/3: 生成分镜图片...')

      let generatedImages: string[] = []
      let shotResults: Array<{ shot: TvcShot; start_url: string; end_url: string }> = []

      if (upstreamShots.length > 0) {
        const totalFrames = upstreamShots.length * 2
        for (let i = 0; i < upstreamShots.length; i++) {
          const shot = upstreamShots[i]
          setProgressMessage(`阶段1: 镜头 ${i + 1}/${upstreamShots.length} 首帧...`)
          setProgress(Math.round((i * 2 / totalFrames) * 100))

          const startImgs = await generateNanoaiImageWithPolling(
            { prompt: shot.start_frame_prompt || shot.scene_description, ...genOpts }, () => {},
          )
          const startUrl = startImgs[0] || ''

          setProgressMessage(`阶段1: 镜头 ${i + 1}/${upstreamShots.length} 尾帧...`)
          setProgress(Math.round(((i * 2 + 1) / totalFrames) * 100))
          const endImgs = await generateNanoaiImageWithPolling(
            { prompt: shot.end_frame_prompt || shot.scene_description, ...genOpts }, () => {},
          )
          const endUrl = endImgs[0] || ''

          generatedImages.push(startUrl)
          shotResults.push({ shot, start_url: startUrl, end_url: endUrl })
        }
      } else {
        const images = await generateNanoaiImageWithPolling(
          { prompt: fullPrompt, ...genOpts },
          (msg, p) => { setProgressMessage(msg); setProgress(p) },
        )
        generatedImages = images
      }

      // 保存中间结果
      updateNode(id, {
        result: {
          ...prevResult,
          images: generatedImages,
          shots: upstreamShots,
          shotImages: shotResults,
          text: scriptText,
          count: generatedImages.length,
          prompt: fullPrompt,
        },
      })

      // ========== Phase 2: 生视频 ==========
      setPhase('videos')
      setProgress(0)
      setProgressMessage('阶段2/3: 生成视频...')

      const videos: string[] = []
      const vCount = shotResults.length > 0 ? shotResults.length : generatedImages.length
      const provider = params.videoProvider || 'minimax'

      for (let i = 0; i < vCount; i++) {
        setProgressMessage(`阶段2: 视频 ${i + 1}/${vCount} 生成中...`)
        setProgress(Math.round((i / vCount) * 100))

        const shot = shotResults[i]?.shot || upstreamShots[i]
        const prompt = shot?.video_prompt || '基于分镜图片生成视频'
        const firstUrl = shotResults[i]?.start_url || generatedImages[i]
        const lastUrl = shotResults[i]?.end_url || undefined

        try {
          const videoUrl = await callVideoApi(prompt, provider, params.videoModel, params.videoDuration, firstUrl, lastUrl)
          videos.push(videoUrl)
        } catch (err) {
          console.error(`视频 ${i + 1} 生成失败:`, err)
        }
      }

      // ========== Phase 3: BGM ==========
      let generatedBgmUrl: string | undefined

      if (params.enableBgm) {
        setPhase('bgm')
        setProgress(0)
        setProgressMessage('阶段3/3: 生成BGM...')
        try {
          const { generateMusic, pollMusicResult } = await import('@/lib/api/minimax-api')
          const bgmMoods = upstreamShots.map(s => s.bgm_mood).filter(Boolean)
          const bgmBase = bgmMoods.length > 0
            ? bgmMoods.slice(0, 3).join('、')
            : 'TVC广告背景音乐'
          const bgmPrompt = `${bgmBase}，无歌词，${params.videoDuration * vCount || 30}秒`
          const reqId = await generateMusic({ prompt: bgmPrompt })
          generatedBgmUrl = await pollMusicResult(reqId)
        } catch {
          // BGM 生成失败不阻断流程
        }
      }

      // ========== 完成 ==========
      setPhase('done')
      setProgress(100)

      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          ...prevResult,
          images: generatedImages,
          shots: upstreamShots,
          shotImages: shotResults,
          videos,
          bgmUrl: generatedBgmUrl,
          text: scriptText,
          count: generatedImages.length,
          prompt: fullPrompt,
        },
      })

      toast.success(`${generatedImages.length} 张图 + ${videos.length} 个视频${generatedBgmUrl ? ' + BGM' : ''} 生成完成`)

      // 保存资产
      if (params.enableAssetSave) {
        assetSaveRef.current = true
        const token = localStorage.getItem('nanoai_token')
        if (token) {
          let saved = 0
          for (let i = 0; i < videos.length; i++) {
            try {
              await assetsApi.create({
                type: 'video',
                name: `TVC_P${i + 1}_${Date.now()}`,
                url: videos[i],
                thumbnail_url: generatedImages[i],
                category: 'tvc',
                tags: ['TVC', `镜头${i + 1}`],
                source_node_id: id,
                version: 'v1',
              }, token)
              saved++
            } catch {}
          }
          if (saved > 0) toast.success(`${saved} 个视频已保存到资产库`)
        }
      }
    } catch (error) {
      updateNode(id, { status: NodeStatus.ERROR, error: error instanceof Error ? error.message : '生成失败' })
      setPhase('idle')
      toast.error('生成失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [id, updateNode, fullPrompt, upstreamShots, scriptText, callVideoApi, toast])

  // === 下载 ===
  const handleDownload = useCallback(async (url: string, idx: number, ext = 'png') => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `nanoai_${idx + 1}_${Date.now()}.${ext}`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      const a = document.createElement('a')
      a.href = url
      a.download = `nanoai_${idx + 1}.${ext}`
      a.click()
    }
  }, [])

  const handleDownloadAll = useCallback(async () => {
    const items = allImages.length > 0 ? allImages : displayImages
    for (let i = 0; i < items.length; i++) {
      await handleDownload(items[i], i)
      await new Promise(r => setTimeout(r, 200))
    }
  }, [allImages, displayImages, handleDownload])

  const handleDownloadAllVideos = useCallback(async () => {
    for (let i = 0; i < resultVideos.length; i++) {
      await handleDownload(resultVideos[i], i, 'mp4')
      await new Promise(r => setTimeout(r, 300))
    }
  }, [resultVideos, handleDownload])

  const openFullscreen = useCallback((idx: number) => {
    setCurrentIndex(idx)
    setZoomLevel(1)
    setIsFullscreen(true)
  }, [])

  const currentItem = allImages[currentIndex]

  // 阶段标签
  const phaseLabels: Record<Phase, string> = {
    idle: '', images: '生图', videos: '视频', bgm: 'BGM', done: '',
  }
  const phaseOrder: Phase[] = ['images', 'videos', 'bgm']

  return (
    <>
      <div
        className="card-node node-appear !overflow-visible"
        style={{
          width: previewWidth,
          minHeight: 120,
          willChange: 'auto',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div className="node-type-strip" />

        <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="text-in" />

        <div className="space-y-2 p-3">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Film className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate text-xs">分镜头故事板</h3>
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

          {/* 执行按钮（空闲/错误） */}
          {(data.status === NodeStatus.IDLE || data.status === NodeStatus.ERROR) && (
            <div className="flex flex-col items-center gap-2 py-2">
              {data.status === NodeStatus.ERROR && (
                <p className="text-[10px] text-red-400 text-center line-clamp-2 max-w-[280px]">{data.error}</p>
              )}
              <button
                onClick={handleExecute}
                disabled={!scriptText.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
                  'text-white shadow-lg shadow-blue-500/25',
                )}
              >
                <Play className="w-3.5 h-3.5" />
                一键生成全部
              </button>
              {!scriptText.trim() && <p className="text-[10px] text-muted-foreground">等待上游脚本数据</p>}
            </div>
          )}

          {/* 执行进度 */}
          {data.status === NodeStatus.RUNNING && (
            <div className="flex flex-col items-center gap-1.5 py-2">
              {/* 阶段指示器 */}
              <div className="flex items-center gap-1">
                {phaseOrder.map((p, i) => (
                  <span key={p} className={cn(
                    'flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full',
                    phase === p ? 'bg-blue-500/20 text-blue-400' :
                    phaseOrder.indexOf(phase) > i ? 'bg-green-500/20 text-green-400' :
                    'bg-white/5 text-muted-foreground',
                  )}>
                    {phaseOrder.indexOf(phase) > i ? <CheckCircle2 className="w-2.5 h-2.5" /> : <span>{i + 1}</span>}
                    {phaseLabels[p]}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-medium text-primary">{progressMessage}</span>
              <div className="w-full max-w-[300px] bg-primary/20 rounded-full h-1">
                <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* === TVC 配对图片预览 === */}
          {data.status !== NodeStatus.RUNNING && isTvcMode && shotImages && shotImages.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Film className="w-3 h-3" />
                <span>分镜图片</span>
                <span className="ml-auto">{shotImages.length} 镜头</span>
              </div>
              {shotImages.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => openFullscreen(idx)}
                  className="relative group rounded-lg overflow-hidden border-2 border-white/10 hover:border-primary transition-all duration-200"
                >
                  <div className="flex" style={{ aspectRatio: '2/1' }}>
                    <div className="flex-1 relative">
                      <img src={item.start_url} alt={`S${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">S{idx + 1}</span>
                    </div>
                    <div className="w-px bg-white/20" />
                    <div className="flex-1 relative">
                      <img src={item.end_url} alt={`E${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">E{idx + 1}</span>
                    </div>
                  </div>
                  {item.shot?.scene_description && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white/80 truncate">{item.shot.scene_description}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="p-1.5 rounded-full bg-black/50"><ZoomIn className="w-3.5 h-3.5 text-white" /></div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* === 通用图片网格 === */}
          {data.status !== NodeStatus.RUNNING && !isTvcMode && displayImages.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Film className="w-3 h-3" /> <span>{displayImages.length} 张分镜</span>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${displayImages.length <= 1 ? 1 : displayImages.length <= 4 ? 2 : 3}, 1fr)` }}>
                {displayImages.map((img, idx) => (
                  <button key={idx} onClick={() => openFullscreen(idx)}
                    className="relative group rounded-lg overflow-hidden border-2 border-white/10 hover:border-primary transition-all duration-200"
                    style={{ aspectRatio: (data.params.aspectRatio || '16:9').replace(':', '/') }}
                  >
                    <img src={img} alt={`P${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">P{idx + 1}</span>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1.5 rounded-full bg-black/50"><ZoomIn className="w-3.5 h-3.5 text-white" /></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === 视频预览 === */}
          {videoCount > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Video className="w-3 h-3" /> <span>合成视频</span>
                <span className="ml-auto">{videoCount} 个 · {data.params.videoDuration}s</span>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${videoCount <= 1 ? 1 : 2}, 1fr)` }}>
                {resultVideos.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10" style={{ aspectRatio: '16/9' }}>
                    <video src={url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => {
                        setCurrentIndex(idx)
                        setIsFullscreen(true)
                      }}
                    >
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">V{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BGM 预览 === */}
          {bgmUrl && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <Music className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <audio src={bgmUrl} controls className="flex-1 h-6" style={{ minWidth: 0 }} />
              <button onClick={() => handleDownload(bgmUrl, 0, 'mp3')} className="p-1 rounded hover:bg-white/10">
                <Download className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* 底部操作栏 */}
          {data.status === NodeStatus.SUCCESS && (
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {allImages.length > 0 && (
                <button onClick={handleDownloadAll}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30 transition-colors"
                >
                  <Download className="w-3 h-3" /> 下载图片
                </button>
              )}
              {videoCount > 0 && (
                <button onClick={handleDownloadAllVideos}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  <Download className="w-3 h-3" /> 下载视频
                </button>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {shotCount}图{videoCount > 0 ? ` ${videoCount}视频` : ''}{bgmUrl ? ' BGM' : ''}
              </span>
            </div>
          )}

          {/* 无数据 */}
          {data.status === NodeStatus.IDLE && !scriptText.trim() && (
            <div className="flex flex-col items-center justify-center py-3 text-muted-foreground">
              <Film className="w-5 h-5 mb-1 opacity-30" />
              <p className="text-[10px]">等待上游脚本数据</p>
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="result-out" />
      </div>

      {/* ====== 灯箱 ====== */}
      {isFullscreen && (currentItem || resultVideos[currentIndex]) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1) }}
        >
          {/* 工具栏 */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {currentItem && !resultVideos[currentIndex] && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                <button onClick={() => setZoomLevel(p => Math.max(0.25, p - 0.5))} className="px-1.5 hover:text-blue-400">-</button>
                <button onClick={() => setZoomLevel(1)} className="px-2 hover:text-blue-400">{Math.round(zoomLevel * 100)}%</button>
                <button onClick={() => setZoomLevel(p => Math.min(4, p + 0.5))} className="px-1.5 hover:text-blue-400">+</button>
              </div>
            )}
            <button onClick={() => handleDownload(
              resultVideos[currentIndex] || currentItem, currentIndex,
              resultVideos[currentIndex] ? 'mp4' : 'png',
            )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ecf8e] hover:bg-[#2db87a] text-white text-xs font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> 下载
            </button>
            <button onClick={() => { setIsFullscreen(false); setZoomLevel(1) }} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容 */}
          <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoomLevel(p => Math.max(0.25, Math.min(4, p + (e.deltaY > 0 ? -0.15 : 0.15)))) }}
          >
            {resultVideos[currentIndex] ? (
              <div className="relative w-full max-w-4xl mx-8">
                <video key={resultVideos[currentIndex]} src={resultVideos[currentIndex]} controls autoPlay className="w-full rounded-lg shadow-2xl" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-sm font-bold bg-black/70 text-white">V{currentIndex + 1}</span>
              </div>
            ) : currentItem && (
              <div className="relative">
                <img src={currentItem} alt="预览" className="rounded-lg shadow-2xl transition-transform duration-150" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }} draggable={false} />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-sm font-bold bg-black/70 text-white">
                  {isTvcMode ? `S${currentIndex + 1}` : `P${currentIndex + 1}`}
                </span>
                {upstreamShots[currentIndex] && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white/90 text-xs line-clamp-3">{upstreamShots[currentIndex].scene_description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 导航 */}
          {(allImages.length > 1 || resultVideos.length > 1) && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + Math.max(allImages.length, resultVideos.length)) % Math.max(allImages.length, resultVideos.length)); setZoomLevel(1) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % Math.max(allImages.length, resultVideos.length)); setZoomLevel(1) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

StoryboardGeneratorNode.displayName = 'StoryboardGeneratorNode'

export default StoryboardGeneratorNode
