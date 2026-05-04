'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic, Square, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'

interface VoiceClonePanelProps {
  apiKey: string
}

export function VoiceClonePanel({ apiKey }: VoiceClonePanelProps) {
  const [mode, setMode] = useState<'upload' | 'record'>('upload')
  const [voiceName, setVoiceName] = useState('')
  const [sampleText, setSampleText] = useState('你好，欢迎使用音色克隆功能。')
  const [isRecording, setIsRecording] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { cloneVoiceFromAudio } = useStoryboardVoiceStore()

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      chunksRef.current = []
      setRecordedDuration(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)

        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)

      // 计时器
      timerRef.current = setInterval(() => {
        setRecordedDuration(d => d + 1)
      }, 1000)

    } catch (error: any) {
      toast.error('无法访问麦克风: ' + error.message)
    }
  }, [])

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  // 文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('audio/')) {
      toast.error('请上传音频文件')
      return
    }

    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('音频文件不能超过 10MB')
      return
    }

    const url = URL.createObjectURL(file)
    setAudioBlob(file)
    setAudioUrl(url)
    toast.success('音频文件已加载')
  }, [])

  // 开始克隆
  const handleClone = useCallback(async () => {
    if (!audioBlob) {
      toast.error('请先上传或录制音频')
      return
    }

    if (!voiceName.trim()) {
      toast.error('请输入音色名称')
      return
    }

    if (!sampleText.trim()) {
      toast.error('请输入样本文本')
      return
    }

    if (!apiKey) {
      toast.error('请先配置智谱 API Key')
      return
    }

    setIsCloning(true)

    try {
      await cloneVoiceFromAudio(apiKey, audioBlob, voiceName.trim(), sampleText.trim())
      toast.success('音色克隆成功！')

      // 重置表单
      setVoiceName('')
      setAudioBlob(null)
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
    } catch (error: any) {
      toast.error(error.message || '音色克隆失败')
    } finally {
      setIsCloning(false)
    }
  }, [audioBlob, voiceName, sampleText, apiKey, cloneVoiceFromAudio, audioUrl])

  // 清理音频
  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordedDuration(0)
  }, [audioUrl])

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <span className="text-cyan-400">●</span>
        音色克隆
      </h3>

      <div className="text-xs text-muted-foreground">
        上传音频文件或录制 3-10 秒语音样本，即可克隆专属音色
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('upload'); clearAudio() }}
          className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors ${
            mode === 'upload'
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10'
          }`}
        >
          <Upload className="w-3 h-3 inline mr-1" />
          上传音频
        </button>
        <button
          onClick={() => { setMode('record'); clearAudio() }}
          className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors ${
            mode === 'record'
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10'
          }`}
        >
          <Mic className="w-3 h-3 inline mr-1" />
          录制语音
        </button>
      </div>

      {/* 上传模式 */}
      {mode === 'upload' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="w-3 h-3 mr-2" />
            选择音频文件
          </Button>
          <div className="text-[10px] text-muted-foreground text-center">
            支持 WAV、MP3、M4A 等格式，建议 3-10 秒
          </div>
        </div>
      )}

      {/* 录音模式 */}
      {mode === 'record' && (
        <div className="space-y-3">
          <div className="flex justify-center">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
              >
                <Mic className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 animate-pulse"
              >
                <Square className="w-6 h-6" />
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="text-center">
              <div className="text-lg font-mono text-red-400">
                {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {recordedDuration < 3
                  ? `还需录制 ${3 - recordedDuration} 秒`
                  : recordedDuration > 10
                    ? '建议控制在 10 秒以内'
                    : '可以停止录制'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* 音频预览 */}
      {audioUrl && (
        <div className="p-2 rounded-lg bg-white/10 flex items-center gap-2">
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <button
            onClick={clearAudio}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* 克隆表单 */}
      <div className="space-y-2">
        <Input
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="音色名称（如：陈平安的声音）"
          className="h-8"
        />
        <Input
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          placeholder="音频对应的文本内容"
          className="h-8"
        />
      </div>

      {/* 克隆按钮 */}
      <Button
        onClick={handleClone}
        disabled={!audioBlob || !voiceName.trim() || isCloning}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
      >
        {isCloning ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            正在克隆...
          </>
        ) : (
          <>
            <CheckCircle className="w-3 h-3 mr-2" />
            开始克隆
          </>
        )}
      </Button>

      <div className="text-[10px] text-muted-foreground flex items-start gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>克隆的音色将保存在本地，可用于后续的语音合成</span>
      </div>
    </div>
  )
}
