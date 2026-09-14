'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { Video, Play, Pause, Download, Maximize2, Loader2 } from 'lucide-react'
import { NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode'
import { cn } from '@/lib/utils'

export interface VideoGeneratorData extends WorkflowNodeData {
  params: {
    inputImages: string[]
    duration: number
    transition: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'none'
    transitionDuration: number
    fps: number
    resolution: '720p' | '1080p' | '4k'
    outputFormat: 'mp4' | 'webm' | 'gif'
    backgroundMusic?: string
  }
  result?: {
    videoUrl?: string
    format?: string
    duration?: number
    frames?: string[]
  }
}

const TRANSITIONS = [
  { label: '无转场', value: 'none' },
  { label: '淡入淡出', value: 'fade' },
  { label: '溶解', value: 'dissolve' },
  { label: '滑动', value: 'slide' },
  { label: '擦除', value: 'wipe' },
]

const RESOLUTIONS = [
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: '4K', value: '4k' },
]

const OUTPUT_FORMATS = [
  { label: 'MP4', value: 'mp4' },
  { label: 'WebM', value: 'webm' },
  { label: 'GIF', value: 'gif' },
]

const FPS_OPTIONS = [24, 30, 60]

export const VideoGeneratorNode = ({ id, data }: NodeProps<VideoGeneratorData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore()
  const [, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const paramSchema = [
    {
      key: 'duration',
      label: '总时长（秒）',
      type: 'number' as const,
      defaultValue: 10,
    },
    {
      key: 'transition',
      label: '转场效果',
      type: 'select' as const,
      options: TRANSITIONS,
      defaultValue: 'fade',
    },
    {
      key: 'transitionDuration',
      label: '转场时长（毫秒）',
      type: 'number' as const,
      defaultValue: 500,
    },
    {
      key: 'fps',
      label: '帧率',
      type: 'select' as const,
      options: FPS_OPTIONS.map(f => ({ label: `${f} fps`, value: f })),
      defaultValue: 30,
    },
    {
      key: 'resolution',
      label: '分辨率',
      type: 'select' as const,
      options: RESOLUTIONS,
      defaultValue: '1080p',
    },
    {
      key: 'outputFormat',
      label: '输出格式',
      type: 'select' as const,
      options: OUTPUT_FORMATS,
      defaultValue: 'mp4',
    },
  ]

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params)
  }, [id, updateNodeParams])

  const handleExecute = useCallback(async () => {
    if (!data.params.inputImages?.length) {
      alert('请先添加输入图片')
      return
    }

    setIsGenerating(true)
    setProgress(0)
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined })

      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setProgress(i)
      }

      const outputUrl = `blob:${Date.now()}`
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          videoUrl: outputUrl,
          format: data.params.outputFormat,
          duration: data.params.duration,
          frames: data.params.inputImages,
        },
      })
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '生成失败',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [id, data.params, updateNode])

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current && data.result?.duration) {
      const time = videoRef.current.currentTime
      const duration = videoRef.current.duration || data.result.duration
      setCurrentTime(time)
      setProgress((time / duration) * 100)
    }
  }, [data.result?.duration])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pos * (videoRef.current.duration || data.result?.duration || 10)
    }
  }, [data.result?.duration])

  const handleDownload = useCallback(() => {
    if (data.result?.videoUrl) {
      const a = document.createElement('a')
      a.href = data.result.videoUrl
      a.download = `video-${Date.now()}.${data.params.outputFormat || 'mp4'}`
      a.click()
    }
  }, [data.result?.videoUrl, data.params.outputFormat])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [])

  return (
    <BaseNode
      data={data}
      icon={<Video className="w-4 h-4" />}
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      {/* 输入图片预览 */}
      <div className="mt-3">
        <label className="text-xs text-muted-foreground mb-1 block">输入图片</label>
        <div className="flex gap-1 flex-wrap">
          {data.params.inputImages?.map((url, i) => (
            <div key={i} className="w-12 h-12 rounded border border-white/10 overflow-hidden">
              <img src={url} alt={`Input ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {(!data.params.inputImages || data.params.inputImages.length === 0) && (
            <div className="text-xs text-muted-foreground p-2">等待输入...</div>
          )}
        </div>
      </div>

      <ExecuteButton
        onExecute={handleExecute}
        status={data.status}
        label="生成视频"
        loadingLabel="生成中..."
      />

      {/* 视频预览播放器 */}
      {data.result?.videoUrl && (
        <div className="mt-3 space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {/* 视频/帧序列显示 */}
            {data.result.frames?.length ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full">
                  {data.result.frames.map((frame, i) => (
                    <img
                      key={i}
                      src={frame}
                      alt={`Frame ${i + 1}`}
                      className={cn(
                        "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                        data.result && data.result.frames && progress >= (i / data.result.frames.length) * 100 && progress < ((i + 1) / data.result.frames.length) * 100 ? "opacity-100" : "opacity-0"
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={data.result.videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            )}

            {/* 播放控制遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {/* 进度条 */}
                <div
                  className="h-1 bg-white/30 rounded-full cursor-pointer mb-2"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlayPause}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <span className="text-white text-xs">
                      {formatTime(currentTime)} / {formatTime(data.result.duration || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                      title="下载视频"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                      title="全屏"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 生成中状态 */}
            {data.status === NodeStatus.RUNNING && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <span className="text-white text-sm">生成中... {progress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 全屏预览 */}
      {isFullscreen && data.result?.videoUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
          {data.result.frames?.length ? (
            <div className="relative w-full h-full max-w-full max-h-full">
              {data.result.frames.map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt={`Frame ${i + 1}`}
                  className={cn(
                    "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                    data.result && data.result.frames && progress >= (i / data.result.frames.length) * 100 && progress < ((i + 1) / data.result.frames.length) * 100 ? "opacity-100" : "opacity-0"
                  )}
                />
              ))}
            </div>
          ) : (
            <video
              src={data.result.videoUrl}
              className="max-w-full max-h-full"
              autoPlay
              controls
            />
          )}
        </div>
      )}
    </BaseNode>
  )
}

export const videoGeneratorNodeType = 'video-generator'

export default VideoGeneratorNode