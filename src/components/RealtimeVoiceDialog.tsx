'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  Phone,
  PhoneOff,
  Settings,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRealtimeVoiceStore, type VoiceMessage } from '@/stores/nanoImageRealtimeVoiceStore'
import {
  RealtimeVoiceClient,
  VOICE_TEMPLATES,
  DEFAULT_SESSION_CONFIG,
  type SessionConfig,
} from '@/lib/api/realtime-voice'
import { AudioPlayer, AudioRecorder, VOICE_OPTIONS } from '@/lib/audio-processor'

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface RealtimeVoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  modelId?: string
  onTextGenerated?: (text: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RealtimeVoiceDialog({
  open,
  onOpenChange,
  apiKey,
  modelId = 'glm-realtime-flash',
  onTextGenerated,
}: RealtimeVoiceDialogProps) {
  // Store
  const {
    isConnected,
    isRecording,
    isSpeaking,
    isProcessing,
    selectedTemplate,
    selectedVoice,
    messages,
    currentTranscript,
    error,
    setConnected,
    setRecording,
    setSpeaking,
    setProcessing,
    setTemplate,
    setVoice,
    addMessage,
    appendTranscript,
    clearTranscript,
    setError,
    setRateLimit,
    clearMessages,
    reset,
  } = useRealtimeVoiceStore()

  // Local state
  const [textInput, setTextInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Refs
  const clientRef = useRef<RealtimeVoiceClient | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 当前模板
  const activeTemplate = VOICE_TEMPLATES.find((t) => t.id === selectedTemplate) || VOICE_TEMPLATES[0]
  const activeVoice = VOICE_OPTIONS.find((v) => v.id === selectedVoice) || VOICE_OPTIONS[0]

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTranscript])

  // 初始化客户端
  const initClient = useCallback(() => {
    if (clientRef.current) return

    clientRef.current = new RealtimeVoiceClient()

    // 设置回调
    clientRef.current.onSessionCreated = () => {
      console.log('[RealtimeVoice] Session created')
      setConnected(true)
      toast.success('已连接到语音服务')
    }

    clientRef.current.onSessionUpdated = () => {
      console.log('[RealtimeVoice] Session updated')
    }

    clientRef.current.onSpeechStarted = () => {
      console.log('[RealtimeVoice] User speech started')
    }

    clientRef.current.onSpeechStopped = () => {
      console.log('[RealtimeVoice] User speech stopped')
      setRecording(false)
    }

    clientRef.current.onResponseCreated = () => {
      console.log('[RealtimeVoice] Response creating')
      setSpeaking(true)
      setProcessing(true)
    }

    clientRef.current.onResponseDone = () => {
      console.log('[RealtimeVoice] Response done')
      setSpeaking(false)
      setProcessing(false)

      // 保存转录文本到消息
      if (currentTranscript) {
        addMessage({
          role: 'assistant',
          content: currentTranscript,
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
      appendTranscript(text)
    }

    clientRef.current.onTextDelta = (text) => {
      appendTranscript(text)
    }

    clientRef.current.onError = (err) => {
      console.error('[RealtimeVoice] Error:', err)
      setError(err.message)
      toast.error(`错误: ${err.message}`)
    }

    clientRef.current.onDisconnected = () => {
      setConnected(false)
      setRecording(false)
      setSpeaking(false)
      toast.info('已断开连接')
    }

    clientRef.current.onRateLimitsUpdated = (limits) => {
      setRateLimit(limits.remaining)
    }
  }, [setConnected, setRecording, setSpeaking, setProcessing, addMessage, appendTranscript, clearTranscript, setError, setRateLimit, currentTranscript])

  // 连接
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      toast.error('请先配置智谱 API Key')
      return
    }

    try {
      initClient()

      // 初始化音频播放器
      if (!playerRef.current) {
        playerRef.current = new AudioPlayer()
        await playerRef.current.init()
      }

      // 连接 WebSocket
      await clientRef.current!.connect(apiKey)

      // 更新会话配置
      const config: SessionConfig = {
        ...DEFAULT_SESSION_CONFIG,
        model: modelId as 'glm-realtime-flash' | 'glm-realtime-air',
        voice: selectedVoice,
        instructions: activeTemplate.instructions,
      }
      clientRef.current!.updateSession(config)
    } catch (err) {
      console.error('[RealtimeVoice] Connect failed:', err)
      setError(err instanceof Error ? err.message : '连接失败')
      toast.error('连接失败，请检查网络或 API Key')
    }
  }, [apiKey, modelId, selectedVoice, activeTemplate.instructions, initClient, setError])

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
      console.error('[RealtimeVoice] Start recording failed:', err)
      setRecording(false)
      toast.error('无法启动麦克风，请检查权限')
    }
  }, [isConnected, setRecording])

  // 停止录音
  const handleStopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop()
    }
    setRecording(false)
  }, [setRecording])

  // 发送文本
  const handleSendText = useCallback(() => {
    if (!textInput.trim() || !isConnected || !clientRef.current) return

    const text = textInput.trim()
    addMessage({
      role: 'user',
      content: text,
    })
    clientRef.current.sendText(text)
    setTextInput('')
  }, [textInput, isConnected, addMessage])

  // 对话框关闭时清理
  useEffect(() => {
    if (!open) {
      handleDisconnect()
    }
  }, [open, handleDisconnect])

  // 渲染消息
  const renderMessage = (msg: VoiceMessage) => (
    <div
      key={msg.id}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          msg.role === 'user'
            ? 'bg-primary/20 text-foreground'
            : 'bg-muted/50 text-foreground'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            语音对话
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTitle>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-3 p-3 border border-white/10 rounded-lg bg-black/20">
            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">对话模式</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setTemplate(tpl.id)
                      // 如果已连接，更新配置
                      if (isConnected && clientRef.current) {
                        clientRef.current.updateSession({
                          ...DEFAULT_SESSION_CONFIG,
                          model: modelId as 'glm-realtime-flash' | 'glm-realtime-air',
                          voice: selectedVoice,
                          instructions: tpl.instructions,
                        })
                      }
                    }}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      selectedTemplate === tpl.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{tpl.icon}</span>
                      <span className="text-xs font-medium">{tpl.label}</span>
                    </div>
                    <p className="text-[10px] opacity-70">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">音色</label>
              <div className="grid grid-cols-3 gap-1.5">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVoice(v.id)
                      if (isConnected && clientRef.current) {
                        clientRef.current.updateSession({
                          ...DEFAULT_SESSION_CONFIG,
                          model: modelId as 'glm-realtime-flash' | 'glm-realtime-air',
                          voice: v.id,
                          instructions: activeTemplate.instructions,
                        })
                      }
                    }}
                    className={`rounded border px-2 py-1.5 text-xs transition-colors ${
                      selectedVoice === v.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
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
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
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

        {/* Messages Area */}
        <ScrollArea className="h-[280px] rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="space-y-2">
            {messages.length === 0 && !currentTranscript && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>点击连接按钮开始语音对话</p>
                <p className="text-xs mt-1 opacity-70">或使用下方文本输入</p>
              </div>
            )}
            {messages.map(renderMessage)}
            {currentTranscript && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted/50 text-foreground">
                  {currentTranscript}
                  <span className="animate-pulse">▌</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isRecording ? 'destructive' : 'secondary'}
            size="lg"
            className="rounded-full w-14 h-14"
            disabled={!isConnected}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
          {isSpeaking && (
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => clientRef.current?.cancelResponse()}
            >
              <VolumeX className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="text-center text-xs text-muted-foreground">
          {isRecording && '正在录音...'}
          {isSpeaking && 'AI 正在说话...'}
          {isProcessing && !isSpeaking && '处理中...'}
          {!isRecording && !isSpeaking && !isProcessing && isConnected && '点击麦克风开始说话'}
        </div>

        {/* Text Input */}
        <div className="flex gap-2">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="或输入文字消息..."
            className="flex-1 min-h-[36px] max-h-[72px] resize-none bg-transparent border-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendText()
              }
            }}
            disabled={!isConnected}
          />
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!isConnected || !textInput.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg">
          <span>{activeTemplate.icon} {activeTemplate.label}</span>
          <span>音色: {activeVoice.label}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
