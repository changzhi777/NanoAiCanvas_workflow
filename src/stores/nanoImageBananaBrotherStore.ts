/**
 * 香蕉哥哥 AI 助手状态管理
 */

import { create } from 'zustand'

// 消息类型
export interface BananaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 状态接口
interface BananaBrotherState {
  // 对话框状态
  isOpen: boolean

  // 连接状态
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean
  isProcessing: boolean

  // 消息历史
  messages: BananaMessage[]
  currentTranscript: string

  // 提示词总结
  summarizedPrompt: string
  referenceImageUrl: string | null

  // 错误
  error: string | null

  // Actions
  openDialog: () => void
  closeDialog: () => void
  setConnected: (connected: boolean) => void
  setRecording: (recording: boolean) => void
  setSpeaking: (speaking: boolean) => void
  setProcessing: (processing: boolean) => void
  addMessage: (message: Omit<BananaMessage, 'id' | 'timestamp'>) => void
  appendTranscript: (text: string) => void
  clearTranscript: () => void
  setSummarizedPrompt: (prompt: string) => void
  setReferenceImageUrl: (url: string | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

// 生成唯一 ID
const generateId = () => crypto.randomUUID()

export const useBananaBrotherStore = create<BananaBrotherState>((set) => ({
  // 初始状态
  isOpen: false,
  isConnected: false,
  isRecording: false,
  isSpeaking: false,
  isProcessing: false,
  messages: [],
  currentTranscript: '',
  summarizedPrompt: '',
  referenceImageUrl: null,
  error: null,

  // Actions
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),

  setConnected: (connected) => set({ isConnected: connected }),
  setRecording: (recording) => set({ isRecording: recording }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setProcessing: (processing) => set({ isProcessing: processing }),

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

  setSummarizedPrompt: (prompt) => set({ summarizedPrompt: prompt }),

  setReferenceImageUrl: (url) => set({ referenceImageUrl: url }),

  setError: (error) => set({ error }),

  reset: () => set({
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    isProcessing: false,
    messages: [],
    currentTranscript: '',
    summarizedPrompt: '',
    referenceImageUrl: null,
    error: null,
  }),
}))

// 香蕉哥哥角色指令
export const BANANA_BROTHER_INSTRUCTIONS = `你是"香蕉哥哥"，一个亲切友好的AI绘图助手，形象是一位年轻的大学生哥哥。

你的核心任务：
1. 通过自然对话了解用户想要生成什么样的图片
2. 主动询问画面细节：主体、风格、构图、光影、氛围等
3. 将用户的描述归纳总结成专业的AI绘图提示词（英文）
4. 提示词结构建议：[主体描述], [风格], [构图], [光影], [氛围], [技术参数]

对话风格：
- 亲切友好，像大哥哥一样耐心引导
- 用简单易懂的语言交流，避免专业术语堆砌
- 适时给出建议和创意灵感
- 每次回复控制在80字以内，语音友好

当用户说"总结一下"或"生成提示词"时，输出格式：
---PROMPT---
[英文提示词内容]
---END---

请始终保持温暖、专业的形象。`
