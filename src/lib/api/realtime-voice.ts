/**
 * GLM-Realtime WebSocket API 客户端
 * 用于实时语音对话功能
 */

// 会话配置
export interface SessionConfig {
  model: 'glm-realtime-flash' | 'glm-realtime-air'
  voice?: string
  inputAudioFormat?: 'wav' | 'pcm'
  outputAudioFormat?: 'pcm'
  turnDetection?: {
    type: 'server_vad'
    create_response?: boolean
    interrupt_response?: boolean
    threshold?: number
    prefix_padding_ms?: number
    silence_duration_ms?: number
  }
  instructions?: string
  temperature?: number
  maxResponseOutputTokens?: string
  chatMode?: 'audio' | 'video_passive'
  greetingConfig?: {
    enable?: boolean
    content?: string
  }
}

// 事件类型
export type ClientEventType =
  | 'session.update'
  | 'input_audio_buffer.append'
  | 'input_audio_buffer.commit'
  | 'input_audio_buffer.clear'
  | 'input_audio_buffer.append_video_frame'
  | 'conversation.item.create'
  | 'response.create'
  | 'response.cancel'

export type ServerEventType =
  | 'session.created'
  | 'session.updated'
  | 'error'
  | 'input_audio_buffer.committed'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'response.created'
  | 'response.done'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.text.delta'
  | 'response.text.done'
  | 'conversation.item.created'
  | 'rate_limits.updated'
  | 'heartbeat'

// 事件数据结构
export interface BaseEvent {
  event_id?: string
  client_timestamp?: number
  type: string
}

export interface SessionUpdateEvent extends BaseEvent {
  type: 'session.update'
  session: {
    model?: string
    modalities?: string[]
    voice?: string
    input_audio_format?: string
    output_audio_format?: string
    input_audio_noise_reduction?: { type: 'far_field' | 'near_field' }
    turn_detection?: SessionConfig['turnDetection']
    instructions?: string
    temperature?: number
    max_response_output_tokens?: string
    tools?: unknown[]
    beta_fields?: {
      chat_mode?: string
      tts_source?: string
      auto_search?: boolean
      greeting_config?: SessionConfig['greetingConfig']
    }
  }
}

export interface AudioAppendEvent extends BaseEvent {
  type: 'input_audio_buffer.append'
  audio: string  // Base64 encoded audio
}

export interface AudioCommitEvent extends BaseEvent {
  type: 'input_audio_buffer.commit'
}

export interface ResponseCreateEvent extends BaseEvent {
  type: 'response.create'
}

export interface ResponseCancelEvent extends BaseEvent {
  type: 'response.cancel'
}

export interface ConversationItemCreateEvent extends BaseEvent {
  type: 'conversation.item.create'
  item: {
    type: 'message'
    role: 'user'
    content: Array<{
      type: 'input_text'
      text: string
    }>
  }
}

// 服务端事件
export interface ServerEvent {
  event_id: string
  type: ServerEventType
  [key: string]: unknown
}

export interface AudioDeltaEvent extends ServerEvent {
  type: 'response.audio.delta'
  delta: string  // Base64 PCM audio
  response_id: string
  item_id: string
  output_index: number
  content_index: number
}

export interface AudioTranscriptDeltaEvent extends ServerEvent {
  type: 'response.audio_transcript.delta'
  delta: string
  response_id: string
  item_id: string
}

export interface TextDeltaEvent extends ServerEvent {
  type: 'response.text.delta'
  delta: string
  response_id: string
  item_id: string
}

export interface ErrorEvent extends ServerEvent {
  type: 'error'
  error: {
    type: string
    code: string
    message: string
  }
}

/**
 * GLM-Realtime 客户端
 */
export class RealtimeVoiceClient {
  private ws: WebSocket | null = null
  private _reconnectAttempts = 0
  private isConnecting = false

  // 回调函数
  public onSessionCreated?: () => void
  public onSessionUpdated?: () => void
  public onAudioDelta?: (audioBase64: string) => void
  public onAudioTranscriptDelta?: (text: string) => void
  public onTextDelta?: (text: string) => void
  public onSpeechStarted?: () => void
  public onSpeechStopped?: () => void
  public onResponseCreated?: () => void
  public onResponseDone?: () => void
  public onError?: (error: { code: string; message: string }) => void
  public onDisconnected?: () => void
  public onRateLimitsUpdated?: (limits: { remaining: number }) => void

  /**
   * 建立 WebSocket 连接
   */
  async connect(apiKey: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[RealtimeVoice] Already connected')
      return
    }

    if (this.isConnecting) {
      console.log('[RealtimeVoice] Connection in progress')
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        // 浏览器 WebSocket 通过 URL query string 传递 token
        const wsUrl = `wss://open.bigmodel.cn/api/paas/v4/realtime?token=${encodeURIComponent(apiKey)}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('[RealtimeVoice] WebSocket connected')
          this.isConnecting = false
          this._reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[RealtimeVoice] WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('[RealtimeVoice] WebSocket closed:', event.code, event.reason)
          this.isConnecting = false
          this.onDisconnected?.()
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 处理服务端消息
   */
  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as ServerEvent
      console.log('[RealtimeVoice] Received event:', event.type)

      switch (event.type) {
        case 'session.created':
          this.onSessionCreated?.()
          break

        case 'session.updated':
          this.onSessionUpdated?.()
          break

        case 'input_audio_buffer.speech_started':
          this.onSpeechStarted?.()
          break

        case 'input_audio_buffer.speech_stopped':
          this.onSpeechStopped?.()
          break

        case 'response.created':
          this.onResponseCreated?.()
          break

        case 'response.done':
          this.onResponseDone?.()
          break

        case 'response.audio.delta':
          const audioEvent = event as AudioDeltaEvent
          this.onAudioDelta?.(audioEvent.delta)
          break

        case 'response.audio_transcript.delta':
          const transcriptEvent = event as AudioTranscriptDeltaEvent
          this.onAudioTranscriptDelta?.(transcriptEvent.delta)
          break

        case 'response.text.delta':
          const textEvent = event as TextDeltaEvent
          this.onTextDelta?.(textEvent.delta)
          break

        case 'rate_limits.updated':
          const rateEvent = event as ServerEvent & { rate_limits: Array<{ remaining: number }> }
          if (rateEvent.rate_limits?.[0]) {
            this.onRateLimitsUpdated?.({ remaining: rateEvent.rate_limits[0].remaining })
          }
          break

        case 'error':
          const errorEvent = event as ErrorEvent
          this.onError?.({
            code: errorEvent.error?.code || 'unknown',
            message: errorEvent.error?.message || 'Unknown error',
          })
          break

        case 'heartbeat':
          // 心跳事件，无需处理
          break

        default:
          console.log('[RealtimeVoice] Unhandled event type:', event.type)
      }
    } catch (error) {
      console.error('[RealtimeVoice] Failed to parse message:', error)
    }
  }

  /**
   * 发送事件
   */
  private send(event: BaseEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[RealtimeVoice] WebSocket not connected')
      return
    }

    const payload = JSON.stringify({
      ...event,
      event_id: event.event_id || crypto.randomUUID(),
      client_timestamp: event.client_timestamp || Date.now(),
    })

    this.ws.send(payload)
  }

  /**
   * 更新会话配置
   */
  updateSession(config: SessionConfig): void {
    const event: SessionUpdateEvent = {
      type: 'session.update',
      session: {
        model: config.model,
        voice: config.voice || 'tongtong',
        input_audio_format: config.inputAudioFormat || 'wav',
        output_audio_format: config.outputAudioFormat || 'pcm',
        turn_detection: config.turnDetection || {
          type: 'server_vad',
          create_response: true,
          interrupt_response: true,
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        instructions: config.instructions,
        temperature: config.temperature ?? 0.7,
        max_response_output_tokens: config.maxResponseOutputTokens || 'inf',
        beta_fields: {
          chat_mode: config.chatMode || 'audio',
        },
      },
    }

    if (config.greetingConfig) {
      event.session.beta_fields!.greeting_config = config.greetingConfig
    }

    this.send(event)
  }

  /**
   * 发送音频数据
   */
  sendAudio(audioBase64: string): void {
    const event: AudioAppendEvent = {
      type: 'input_audio_buffer.append',
      audio: audioBase64,
    }
    this.send(event)
  }

  /**
   * 提交音频（Client VAD 模式使用）
   */
  commitAudio(): void {
    const event: AudioCommitEvent = {
      type: 'input_audio_buffer.commit',
    }
    this.send(event)
  }

  /**
   * 发送文本消息
   */
  sendText(text: string): void {
    // 先创建对话项
    const createEvent: ConversationItemCreateEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text,
        }],
      },
    }
    this.send(createEvent)

    // 然后触发响应
    setTimeout(() => {
      this.createResponse()
    }, 100)
  }

  /**
   * 创建响应
   */
  createResponse(): void {
    const event: ResponseCreateEvent = {
      type: 'response.create',
    }
    this.send(event)
  }

  /**
   * 取消响应
   */
  cancelResponse(): void {
    const event: ResponseCancelEvent = {
      type: 'response.cancel',
    }
    this.send(event)
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 模板配置
export const VOICE_TEMPLATES = [
  {
    id: 'general',
    label: '智能助手',
    description: '通用语音对话助手',
    icon: '🎙️',
    instructions: '你是一个友好、专业的AI语音助手。请用简洁、清晰的语言回答用户问题，每次回复控制在50字以内。',
  },
  {
    id: 'oral-practice',
    label: '口语陪练',
    description: '英语口语练习',
    icon: '🗣️',
    instructions: 'You are an English speaking practice partner. Help users practice English conversation. Correct their pronunciation and grammar gently. Keep responses short and encourage them to speak more. Use simple vocabulary for beginners.',
  },
  {
    id: 'translator',
    label: '实时翻译',
    description: '中英文实时翻译',
    icon: '🌐',
    instructions: '你是一个专业的翻译助手。用户说话后，请立即翻译成另一种语言（中文翻译成英文，英文翻译成中文）。只输出翻译结果，不要添加解释。',
  },
  {
    id: 'interview',
    label: '面试模拟',
    description: '模拟面试场景',
    icon: '💼',
    instructions: '你是一个专业的面试官。根据用户的背景，提问相关的面试问题。每次只问一个问题，等待用户回答后再继续。给予简短的反馈和鼓励。',
  },
]

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  model: 'glm-realtime-flash',
  voice: 'tongtong',
  inputAudioFormat: 'wav',
  outputAudioFormat: 'pcm',
  turnDetection: {
    type: 'server_vad',
    create_response: true,
    interrupt_response: true,
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
  chatMode: 'audio',
  greetingConfig: {
    enable: true,
    content: '你好，我是你的语音助手，有什么可以帮助你的吗？',
  },
}
