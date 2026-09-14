'use client'

import { useCallback, useRef, useState } from 'react'
import { Music, Volume2, Play, Pause, Upload, ExternalLink, X, Loader2, CheckCircle2 } from 'lucide-react'
import { NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode'

export interface BackgroundMusicData extends WorkflowNodeData {
  params: {
    source: 'upload'
    volume: number
    fadeIn: number
    fadeOut: number
  }
  result?: {
    musicUrl: string
    fileName: string
    fileSize: number
    duration?: number
  }
}

const PARAM_SCHEMA = [
  { key: 'volume', label: '音量（%）', type: 'number' as const, defaultValue: 80 },
  { key: 'fadeIn', label: '淡入（秒）', type: 'number' as const, defaultValue: 2 },
  { key: 'fadeOut', label: '淡出（秒）', type: 'number' as const, defaultValue: 3 },
]

const MINIMAX_AUDIO_URL = 'https://www.minimaxi.com/audio'
const ACCEPT = '.mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg'
const MAX_BYTES = 20 * 1024 * 1024

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export const BackgroundMusicNode = ({ id, data }: NodeProps<BackgroundMusicData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>(data.result?.musicUrl ? 'done' : 'idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params)
  }, [id, updateNodeParams])

  const getAudioDuration = (url: string): Promise<number | undefined> => {
    return new Promise(resolve => {
      const a = new Audio(url)
      a.addEventListener('loadedmetadata', () => resolve(a.duration), { once: true })
      a.addEventListener('error', () => resolve(undefined), { once: true })
    })
  }

  const doUpload = useCallback(async (file: File) => {
    setErrorMsg('')
    if (file.size > MAX_BYTES) {
      setErrorMsg(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB > 20MB）`)
      setState('error')
      return
    }
    setState('uploading')
    setProgress(10)
    try {
      const form = new FormData()
      form.append('file', file)
      const xhr = new XMLHttpRequest()
      const uploadPromise = new Promise<{ url: string; name: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 80) + 10)
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const r = JSON.parse(xhr.responseText)
              resolve({ url: r.url || r.file_url || '', name: r.name || file.name })
            } catch (e) { reject(new Error('响应解析失败')) }
          } else {
            reject(new Error(`上传失败: HTTP ${xhr.status}`))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('网络错误')))
        xhr.open('POST', '/nanoai/api/chat/upload')
        const token = localStorage.getItem('nanoai_token')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(form)
      })
      const r = await uploadPromise
      setProgress(95)
      const duration = await getAudioDuration(r.url)
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          musicUrl: r.url,
          fileName: r.name,
          fileSize: file.size,
          duration,
        },
      })
      setProgress(100)
      setState('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '上传失败')
      setState('error')
    }
  }, [id, updateNode])

  const handleFileSelect = useCallback((file?: File) => {
    if (!file) return
    doUpload(file)
  }, [doUpload])

  const handleClear = useCallback(() => {
    updateNode(id, { result: undefined, status: NodeStatus.IDLE })
    setState('idle')
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [id, updateNode])

  const handlePlayToggle = useCallback(() => {
    if (!data.result?.musicUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(data.result.musicUrl)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
    }
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [data.result?.musicUrl, isPlaying])

  return (
    <BaseNode data={data} icon={<Music className="w-4 h-4" />}>
      <div className="space-y-3">
        {/* MiniMax Audio 引导横幅 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 text-[11px] text-amber-200/90 leading-relaxed">
          <div className="flex items-start gap-1.5">
            <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">BGM 需手动上传</div>
              <div>
                1.{' '}
                <a
                  href={MINIMAX_AUDIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-100"
                  onClick={e => e.stopPropagation()}
                >
                  打开 MiniMax Audio
                </a>
                {' '}生成音乐 → 2. 下载 mp3 → 3. 上传到此
              </div>
            </div>
          </div>
        </div>

        {/* 上传区 */}
        {state === 'idle' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-white/15 hover:border-primary/50 rounded-md p-4 flex flex-col items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => {
              e.preventDefault()
              e.stopPropagation()
              handleFileSelect(e.dataTransfer.files?.[0])
            }}
          >
            <Upload className="w-5 h-5" />
            <span>点击或拖拽 mp3 / wav / m4a / ogg</span>
            <span className="text-[10px] opacity-60">最大 20MB</span>
          </button>
        )}

        {state === 'uploading' && (
          <div className="border border-white/10 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>上传中... {progress}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-md p-3 space-y-2">
            <div className="text-xs text-red-300">{errorMsg}</div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/15 rounded"
              >
                重试
              </button>
              <button
                onClick={handleClear}
                className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 rounded"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {state === 'done' && data.result && (
          <div className="border border-green-500/20 bg-green-500/5 rounded-md p-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayToggle}
                className="w-7 h-7 flex items-center justify-center bg-primary/20 rounded-full hover:bg-primary/30 flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                  {data.result.fileName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {(data.result.fileSize / 1024).toFixed(0)} KB
                  {data.result.duration ? ` · ${data.result.duration.toFixed(1)}s` : ''}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/15 rounded"
              >
                替换
              </button>
              <button
                onClick={handleClear}
                className="text-[10px] p-1 bg-white/5 hover:bg-white/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />

        {/* 参数（淡入/淡出/音量）*/}
        {state === 'done' && (
          <ParamEditor
            params={data.params}
            onChange={handleParamsChange}
            schema={PARAM_SCHEMA}
          />
        )}
      </div>
    </BaseNode>
  )
}

export const backgroundMusicNodeType = 'background-music'
