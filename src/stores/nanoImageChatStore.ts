import { create } from 'zustand'
import type { ChatSession, ChatMessage, GenerationMode, FusionImage, ReferenceImage } from '@/types'
import {
  createSession as dbCreateSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
  dbAddMessage,
  dbUpdateMessage,
  dbDeleteMessage,
} from '@/lib/db'
import { useAuthStore } from '@/stores/remoteStore'

// Helper: create a new ChatSession object and persist it
async function createNewChatSession(userId: string): Promise<ChatSession> {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    userId,
    title: '新会话',
    messages: [],
    metadata: {
      totalImages: 0,
      mode: 'text-to-image',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await dbCreateSession(session)
  return session
}

interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  isLoading: boolean

  // Fusion mode state
  generationMode: GenerationMode
  fusionImages: FusionImage[]

  // Reference image state (for image-to-prompt feature)
  referenceImage: ReferenceImage | null

  loadSessions: () => Promise<void>
  createNewSession: () => Promise<ChatSession>
  selectSession: (sessionId: string) => Promise<void>
  addMessage: (message: ChatMessage) => Promise<void>
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => Promise<void>
  deleteMessage: (sessionId: string, messageId: string) => Promise<void>
  deleteSessionById: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
  refreshSessions: () => Promise<void>

  // Fusion actions
  setGenerationMode: (mode: GenerationMode) => void
  addFusionImage: (image: FusionImage) => void
  removeFusionImage: (id: string) => void
  clearFusionImages: () => void

  // Reference image actions
  setReferenceImage: (image: ReferenceImage | null) => void
  clearReferenceImage: () => void

  // Error state
  error: string | null
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,

  // Fusion mode state
  generationMode: 'text-to-image',
  fusionImages: [],

  // Reference image state
  referenceImage: null,

  // Error state
  error: null,
  setError: (error) => set({ error }),

  loadSessions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true })

    try {
      const sessions = await getSessions(user.id)
      set({ sessions, isLoading: false })

      // Select the first session if exists, or create a new one
      if (sessions.length > 0) {
        const firstSession = await getSession(sessions[0].id)
        if (firstSession) {
          set({ currentSession: firstSession })
        }
      } else {
        const newSession = await createNewChatSession(user.id)
        set({
          sessions: [newSession],
          currentSession: newSession,
        })
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      set({ isLoading: false })
    }
  },

  createNewSession: async () => {
    const user = useAuthStore.getState().user
    console.log('[createNewSession] user state:', user)
    if (!user?.id) {
      console.error('[createNewSession] User not authenticated, state:', useAuthStore.getState())
      throw new Error('User not authenticated')
    }

    const session = await createNewChatSession(user.id)
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSession: session,
    }))

    return session
  },

  selectSession: async (sessionId) => {
    const session = await getSession(sessionId)
    if (session) {
      set({ currentSession: session })
    }
  },

  addMessage: async (message) => {
    const { currentSession } = get()
    if (!currentSession) return

    await dbAddMessage(currentSession.id, message)

    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, messages: [...state.currentSession.messages, message] }
        : null,
      sessions: state.sessions.map((s) =>
        s.id === currentSession.id
          ? { ...s, messages: [...s.messages, message] }
          : s
      ),
    }))
  },

  updateMessage: async (messageId, updates) => {
    const { currentSession } = get()
    if (!currentSession) return

    await dbUpdateMessage(currentSession.id, messageId, updates)

    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            messages: state.currentSession.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          }
        : null,
      sessions: state.sessions.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            }
          : s
      ),
    }))
  },

  deleteSessionById: async (sessionId) => {
    await deleteSession(sessionId)

    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId)
      let currentSession = state.currentSession

      if (currentSession?.id === sessionId) {
        currentSession = sessions.length > 0 ? null : null
      }

      return { sessions, currentSession }
    })

    // Select next session
    const { sessions } = get()
    if (sessions.length > 0) {
      await get().selectSession(sessions[0].id)
    }
  },

  renameSession: async (sessionId, title) => {
    const { currentSession, sessions } = get()
    const session = sessions.find((s) => s.id === sessionId) || currentSession
    if (session && session.id === sessionId) {
      await updateSession({ ...session, title })
    }

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
      currentSession:
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, title }
          : state.currentSession,
    }))
  },

  // Fusion actions
  setGenerationMode: (mode) => {
    set({ generationMode: mode })
  },

  addFusionImage: (image) => {
    set((state) => {
      // Max 4 images
      if (state.fusionImages.length >= 4) {
        return state
      }
      return { fusionImages: [...state.fusionImages, image] }
    })
  },

  removeFusionImage: (id) => {
    set((state) => ({
      fusionImages: state.fusionImages.filter((img) => img.id !== id),
    }))
  },

  clearFusionImages: () => {
    set({ fusionImages: [] })
  },

  // Reference image actions
  setReferenceImage: (image) => {
    set({ referenceImage: image })
  },

  clearReferenceImage: () => {
    set({ referenceImage: null })
  },

  deleteMessage: async (sessionId: string, messageId: string) => {
    await dbDeleteMessage(sessionId, messageId)

    set((state) => {
      const updatedSessions = state.sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.filter((m) => m.id !== messageId),
          }
        }
        return s
      })

      let updatedCurrentSession = state.currentSession
      if (state.currentSession?.id === sessionId) {
        updatedCurrentSession = {
          ...state.currentSession,
          messages: state.currentSession.messages.filter((m) => m.id !== messageId),
        }
      }

      return { sessions: updatedSessions, currentSession: updatedCurrentSession }
    })
  },

  refreshSessions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    const sessions = await getSessions(user.id)
    set({ sessions })
  },
}))
