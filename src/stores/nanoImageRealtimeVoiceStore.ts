/**
 * 实时语音对话状态管理
 */

import { create } from 'zustand'

// 消息类型
export interface VoiceMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  audioUrl?: string  // 可选的音频 URL
}

// 状态接口
interface RealtimeVoiceState {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean

  // 通话状态
  isRecording: boolean
  isSpeaking: boolean
  isProcessing: boolean

  // 配置
  selectedTemplate: string
  selectedVoice: string

  // 消息历史
  messages: VoiceMessage[]
  currentTranscript: string

  // 错误
  error: string | null

  // 速率限制
  rateLimitRemaining: number

  // Actions
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setRecording: (recording: boolean) => void
  setSpeaking: (speaking: boolean) => void
  setProcessing: (processing: boolean) => void
  setTemplate: (templateId: string) => void
  setVoice: (voiceId: string) => void
  addMessage: (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => void
  appendTranscript: (text: string) => void
  clearTranscript: () => void
  setError: (error: string | null) => void
  setRateLimit: (remaining: number) => void
  clearMessages: () => void
  reset: () => void
}

// 生成唯一 ID
const generateId = () => crypto.randomUUID()

export const useRealtimeVoiceStore = create<RealtimeVoiceState>((set) => ({
  // 初始状态
  isConnected: false,
  isConnecting: false,
  isRecording: false,
  isSpeaking: false,
  isProcessing: false,
  selectedTemplate: 'general',
  selectedVoice: 'tongtong',
  messages: [],
  currentTranscript: '',
  error: null,
  rateLimitRemaining: 5,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setRecording: (recording) => set({ isRecording: recording }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setTemplate: (templateId) => set({ selectedTemplate: templateId }),
  setVoice: (voiceId) => set({ selectedVoice: voiceId }),

  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: generateId(),
        timestamp: Date.now(),
      },
    ],
  })),

  appendTranscript: (text) => set((state) => ({
    currentTranscript: state.currentTranscript + text,
  })),

  clearTranscript: () => set({ currentTranscript: '' }),

  setError: (error) => set({ error }),

  setRateLimit: (remaining) => set({ rateLimitRemaining: remaining }),

  clearMessages: () => set({ messages: [], currentTranscript: '' }),

  reset: () => set({
    isConnected: false,
    isConnecting: false,
    isRecording: false,
    isSpeaking: false,
    isProcessing: false,
    messages: [],
    currentTranscript: '',
    error: null,
  }),
}))
