import { create } from 'zustand'
import {
  getAgentAbout,
  startPipeline,
  getPipelineStatus,
  agentChat,
  connectAgentWS,
  type AgentAbout,
  type PipelineStatus,
} from '../lib/api/agent-api'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
  agent?: string
}

interface AgentState {
  about: AgentAbout | null
  loading: boolean
  pipelineStatus: PipelineStatus | null
  pipelineLoading: boolean
  chatMessages: AgentChatMessage[]
  chatLoading: boolean
  ws: WebSocket | null

  fetchAbout: () => Promise<void>
  startPipelineTask: (params: Record<string, unknown>) => Promise<string | null>
  pollPipelineStatus: (taskId: string, intervalMs?: number) => void
  sendChat: (messages: { role: string; content: string }[], agent?: string) => Promise<void>
  connectWS: (userId: string) => void
  disconnectWS: () => void
  clearChat: () => void
}

const POLL_INTERVAL = 3000

export const useAgentStore = create<AgentState>((set, get) => ({
  about: null,
  loading: false,
  pipelineStatus: null,
  pipelineLoading: false,
  chatMessages: [],
  chatLoading: false,
  ws: null,

  fetchAbout: async () => {
    set({ loading: true })
    try {
      const about = await getAgentAbout()
      set({ about })
    } catch {
      set({ about: null })
    } finally {
      set({ loading: false })
    }
  },

  startPipelineTask: async (params) => {
    set({ pipelineLoading: true, pipelineStatus: null })
    try {
      const result = await startPipeline(params)
      get().pollPipelineStatus(result.task_id)
      return result.task_id
    } catch {
      set({ pipelineLoading: false })
      return null
    }
  },

  pollPipelineStatus: (taskId, intervalMs = POLL_INTERVAL) => {
    const timer = setInterval(async () => {
      try {
        const status = await getPipelineStatus(taskId)
        set({ pipelineStatus: status })
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(timer)
          set({ pipelineLoading: false })
        }
      } catch {
        clearInterval(timer)
        set({ pipelineLoading: false })
      }
    }, intervalMs)
  },

  sendChat: async (messages, agent = 'producer') => {
    const last = messages[messages.length - 1]
    // 先追加用户消息，再发送请求
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: 'user', content: last.content }],
      chatLoading: true,
    }))
    try {
      await agentChat(messages, agent)
    } catch {
      set({ chatLoading: false })
    }
  },

  connectWS: (userId) => {
    const existing = get().ws
    if (existing) existing.close()

    const ws = connectAgentWS(userId, (data) => {
      const type = data.type as string

      if (type === 'chat_response') {
        const content = typeof data.response === 'string'
          ? data.response
          : (data.response?.content ?? JSON.stringify(data.response))
        set((s) => ({
          chatMessages: [...s.chatMessages, { role: 'assistant', content, agent: data.agent as string }],
          chatLoading: false,
        }))
      }

      if (type === 'pipeline_progress') {
        set((s) => ({
          pipelineStatus: {
            ...s.pipelineStatus,
            task_id: data.task_id as string,
            status: data.status as string,
            current_stage: data.current_stage as number,
            total_stages: data.total_stages as number,
            stages: data.stages as PipelineStatus['stages'],
          } as PipelineStatus,
        }))
        if (data.status === 'completed' || data.status === 'failed') {
          set({ pipelineLoading: false })
        }
      }
    })

    ws.addEventListener('close', () => {
      if (get().ws === ws) set({ ws: null })
    })

    set({ ws })
  },

  disconnectWS: () => {
    const ws = get().ws
    if (ws) ws.close()
    set({ ws: null })
  },

  clearChat: () => set({ chatMessages: [] }),
}))
