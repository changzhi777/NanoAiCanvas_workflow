'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Loader2,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useBananaBrotherStore,
  type BananaMessage,
} from '@/stores/nanoImageBananaBrotherStore'
import {
  RealtimeVoiceClient,
} from '@/lib/api/realtime-voice'
import {
  AudioPlayer,
  AudioRecorder,
} from '@/lib/audio-processor'
import {
  summarizePromptWithVision,
  getBananaBrotherSessionConfig,
} from '@/lib/api/banana-brother'

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface BananaBrotherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  onPromptGenerated?: (prompt: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BananaBrotherDialog({
  open,
  onOpenChange,
  apiKey,
  onPromptGenerated,
}: BananaBrotherDialogProps) {
  // Store
  const {
    isConnected,
    isRecording,
    isSpeaking,
    isProcessing,
    messages,
    currentTranscript,
    summarizedPrompt,
    referenceImageUrl,
    setConnected,
    setRecording,
    setSpeaking,
    setProcessing,
    addMessage,
    appendTranscript,
    clearTranscript,
    setSummarizedPrompt,
    setReferenceImageUrl,
    setError,
    reset,
  } = useBananaBrotherStore()

  // Local state
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Refs
  const clientRef = useRef<RealtimeVoiceClient | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const transcriptBufferRef = useRef<string>('')

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTranscript])

  // 初始化客户端
  const initClient = useCallback(() => {
    if (clientRef.current) return

    clientRef.current = new RealtimeVoiceClient()

    clientRef.current.onSessionCreated = () => {
      console.log('[BananaBrother] Session created')
      setConnected(true)
      toast.success('香蕉哥哥已上线~')
    }

    clientRef.current.onSessionUpdated = () => {
      console.log('[BananaBrother] Session updated')
    }

    clientRef.current.onSpeechStarted = () => {
      console.log('[BananaBrother] User speech started')
    }

    clientRef.current.onSpeechStopped = () => {
      console.log('[BananaBrother] User speech stopped')
      setRecording(false)
    }

    clientRef.current.onResponseCreated = () => {
      console.log('[BananaBrother] Response creating')
      setSpeaking(true)
      setProcessing(true)
      transcriptBufferRef.current = ''
    }

    clientRef.current.onResponseDone = () => {
      console.log('[BananaBrother] Response done')
      setSpeaking(false)
      setProcessing(false)

      // 保存转录文本
      const fullTranscript = transcriptBufferRef.current
      if (fullTranscript) {
        addMessage({
          role: 'assistant',
          content: fullTranscript,
        })
        clearTranscript()
      }
    }

    clientRef.current.onAudioDelta = (audioBase64) => {
      if (playerRef.current) {
        playerRef.current.play(audioBase64)
      }
    }

    clientRef.current.onAudioTranscriptDelta = (text) => {
      transcriptBufferRef.current += text
      appendTranscript(text)
    }

    clientRef.current.onTextDelta = (text) => {
      transcriptBufferRef.current += text
      appendTranscript(text)
    }

    clientRef.current.onError = (err) => {
      console.error('[BananaBrother] Error:', err)
      setError(err.message)
      toast.error(`错误: ${err.message}`)
    }

    clientRef.current.onDisconnected = () => {
      setConnected(false)
      setRecording(false)
      setSpeaking(false)
      toast.info('已断开连接')
    }
  }, [setConnected, setRecording, setSpeaking, setProcessing, addMessage, appendTranscript, clearTranscript, setError])

  // 连接
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      toast.error('请先配置智谱 API Key')
      return
    }

    try {
      initClient()

      if (!playerRef.current) {
        playerRef.current = new AudioPlayer()
        await playerRef.current.init()
      }

      await clientRef.current!.connect(apiKey)

      // 使用香蕉哥哥配置
      const config = getBananaBrotherSessionConfig()
      clientRef.current!.updateSession(config)
    } catch (err) {
      console.error('[BananaBrother] Connect failed:', err)
      setError(err instanceof Error ? err.message : '连接失败')
      toast.error('连接失败，请检查网络')
    }
  }, [apiKey, initClient, setError])

  // 断开连接
  const handleDisconnect = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
      recorderRef.current.dispose()
      recorderRef.current = null
    }
    if (playerRef.current) {
      playerRef.current.stop()
      playerRef.current.dispose()
      playerRef.current = null
    }
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    reset()
  }, [reset])

  // 开始录音
  const handleStartRecording = useCallback(async () => {
    if (!isConnected || !clientRef.current) {
      toast.error('请先连接服务')
      return
    }

    try {
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorder()
        await recorderRef.current.init()
      }

      setRecording(true)

      await recorderRef.current.start((audioBase64) => {
        clientRef.current?.sendAudio(audioBase64)
      })
    } catch (err) {
      console.error('[BananaBrother] Start recording failed:', err)
      setRecording(false)
      toast.error('无法启动麦克风')
    }
  }, [isConnected, setRecording])

  // 停止录音
  const handleStopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
    }
    setRecording(false)
  }, [setRecording])

  // 上传参考图
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setReferenceImageUrl(url)
      toast.success('参考图已上传')
    }
    reader.readAsDataURL(file)
  }, [setReferenceImageUrl])

  // AI 总结提示词
  const handleSummarize = useCallback(async () => {
    if (!apiKey) {
      toast.error('请先配置 API Key')
      return
    }

    if (messages.length === 0) {
      toast.error('暂无对话内容可总结')
      return
    }

    setIsSummarizing(true)
    try {
      const result = await summarizePromptWithVision({
        apiKey,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        referenceImageUrl,
      })

      if (result.success && result.prompt) {
        setSummarizedPrompt(result.prompt)
        toast.success('提示词已生成！')
      } else {
        toast.error(result.error || '总结失败')
      }
    } catch (error) {
      console.error('[BananaBrother] Summarize error:', error)
      toast.error('总结失败')
    } finally {
      setIsSummarizing(false)
    }
  }, [apiKey, messages, referenceImageUrl, setSummarizedPrompt])

  // 复制提示词
  const handleCopy = useCallback(async () => {
    if (!summarizedPrompt) return

    try {
      await navigator.clipboard.writeText(summarizedPrompt)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }, [summarizedPrompt])

  // 应用提示词
  const handleApply = useCallback(() => {
    if (!summarizedPrompt) return
    onPromptGenerated?.(summarizedPrompt)
    onOpenChange(false)
    toast.success('提示词已填充到输入框')
  }, [summarizedPrompt, onPromptGenerated, onOpenChange])

  // 对话框关闭时清理
  useEffect(() => {
    if (!open) {
      handleDisconnect()
    }
  }, [open, handleDisconnect])

  // 渲染消息
  const renderMessage = (msg: BananaMessage) => (
    <div
      key={msg.id}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          msg.role === 'user'
            ? 'bg-amber-500/20 text-foreground'
            : 'bg-muted/50 text-foreground'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2">
          <span className="text-2xl">🍌</span>
          <span>香蕉哥哥 - 绘图助手</span>
          <span className="text-xs text-muted-foreground ml-2">音色：精英大学生</span>
        </DialogTitle>

        <div className="grid grid-cols-3 gap-4">
          {/* 左侧：语音对话区 */}
          <div className="col-span-2 space-y-3">
            {/* 连接状态 */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? '已连接' : '未连接'}
                </span>
                {isProcessing && (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                )}
              </div>
              <Button
                variant={isConnected ? 'destructive' : 'default'}
                size="sm"
                className="h-7 px-3"
                onClick={isConnected ? handleDisconnect : handleConnect}
              >
                {isConnected ? (
                  <>
                    <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
                    断开
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                    连接
                  </>
                )}
              </Button>
            </div>

            {/* 消息区域 */}
            <ScrollArea className="h-[260px] rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="space-y-2">
                {messages.length === 0 && !currentTranscript && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <p className="text-3xl mb-2">🍌</p>
                    <p>点击连接开始与香蕉哥哥对话</p>
                    <p className="text-xs mt-1 opacity-70">告诉他你想画什么~</p>
                  </div>
                )}
                {messages.map(renderMessage)}
                {currentTranscript && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted/50 text-foreground">
                      {currentTranscript}
                      <span className="animate-pulse">▌</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 录音控制 */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isRecording ? 'destructive' : 'secondary'}
                size="lg"
                className={`rounded-full w-14 h-14 ${
                  isRecording ? '' : 'bg-amber-500/20 hover:bg-amber-500/30'
                }`}
                disabled={!isConnected}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                {isRecording ? (
                  <MicOff className="w-6 h-6 text-amber-500" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* 状态提示 */}
            <div className="text-center text-xs text-muted-foreground">
              {isRecording && '正在听你说...'}
              {isSpeaking && '香蕉哥哥正在说话...'}
              {isProcessing && !isSpeaking && '思考中...'}
              {!isRecording && !isSpeaking && !isProcessing && isConnected && '点击麦克风开始说话'}
            </div>
          </div>

          {/* 右侧：参考图和提示词 */}
          <div className="space-y-3">
            {/* 参考图上传 */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">参考图（可选）</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-24 rounded-lg border border-dashed border-white/20 bg-black/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors overflow-hidden"
              >
                {referenceImageUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={referenceImageUrl}
                      alt="参考图"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReferenceImageUrl(null)
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">点击上传</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* 总结按钮 */}
            <Button
              onClick={handleSummarize}
              disabled={isSummarizing || messages.length === 0}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  总结中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成提示词
                </>
              )}
            </Button>

            {/* 提示词输出 */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">生成的提示词</label>
              <ScrollArea className="h-[120px] rounded-lg border border-white/10 bg-black/20 p-2">
                {summarizedPrompt ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{summarizedPrompt}</p>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    提示词将在这里显示
                  </p>
                )}
              </ScrollArea>
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!summarizedPrompt}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    复制
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!summarizedPrompt}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                应用
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}