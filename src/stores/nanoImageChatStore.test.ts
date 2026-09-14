import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '@/stores/nanoImageChatStore'

// Mock IDB functions
vi.mock('@/lib/db', () => ({
  createSession: vi.fn(async (s) => s),
  getSessions: vi.fn(async () => []),
  getSession: vi.fn(async () => null),
  updateSession: vi.fn(async () => {}),
  deleteSession: vi.fn(async () => {}),
  dbAddMessage: vi.fn(async () => {}),
  dbUpdateMessage: vi.fn(async () => {}),
  dbDeleteMessage: vi.fn(async () => {}),
}))

// Import mocked modules
import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
  dbAddMessage,
  dbUpdateMessage,
  dbDeleteMessage,
} from '@/lib/db'

// Mock remoteStore for auth
vi.mock('@/stores/remoteStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: { id: 'user-1', username: 'test' } })),
  },
}))

describe('nanoImageChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      sessions: [],
      currentSession: null,
      isLoading: false,
      generationMode: 'text-to-image',
      fusionImages: [],
      referenceImage: null,
      error: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useChatStore.getState()
    expect(state.sessions).toEqual([])
    expect(state.currentSession).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.generationMode).toBe('text-to-image')
    expect(state.fusionImages).toEqual([])
    expect(state.referenceImage).toBeNull()
    expect(state.error).toBeNull()
  })

  // ===== Fusion mode =====
  describe('fusion mode', () => {
    it('should set generation mode', () => {
      useChatStore.getState().setGenerationMode('image-to-image')
      expect(useChatStore.getState().generationMode).toBe('image-to-image')
    })

    it('should add fusion images up to 4', () => {
      for (let i = 0; i < 5; i++) {
        useChatStore.getState().addFusionImage({ id: `img-${i}`, url: `${i}.png` } as any)
      }
      expect(useChatStore.getState().fusionImages).toHaveLength(4)
    })

    it('should remove fusion image by id', () => {
      useChatStore.getState().addFusionImage({ id: 'img-1', url: 'a.png' } as any)
      useChatStore.getState().addFusionImage({ id: 'img-2', url: 'b.png' } as any)

      useChatStore.getState().removeFusionImage('img-1')
      expect(useChatStore.getState().fusionImages).toHaveLength(1)
      expect(useChatStore.getState().fusionImages[0].id).toBe('img-2')
    })

    it('should clear all fusion images', () => {
      useChatStore.getState().addFusionImage({ id: '1', url: 'a.png' } as any)
      useChatStore.getState().clearFusionImages()
      expect(useChatStore.getState().fusionImages).toEqual([])
    })
  })

  // ===== Reference image =====
  describe('reference image', () => {
    it('should set and clear reference image', () => {
      const img = { id: 'ref-1', url: 'ref.png', base64: 'abc' }
      useChatStore.getState().setReferenceImage(img as any)
      expect(useChatStore.getState().referenceImage).toEqual(img)

      useChatStore.getState().clearReferenceImage()
      expect(useChatStore.getState().referenceImage).toBeNull()
    })
  })

  // ===== Session management =====
  describe('loadSessions', () => {
    it('should load sessions and select first', async () => {
      const mockSession = {
        id: 's1', userId: 'user-1', title: 'Test', messages: [],
        metadata: {}, createdAt: '', updatedAt: '',
      }
      vi.mocked(getSessions).mockResolvedValue([mockSession] as any)
      vi.mocked(getSession).mockResolvedValue({ ...mockSession, messages: [] } as any)

      await useChatStore.getState().loadSessions()

      expect(useChatStore.getState().sessions).toHaveLength(1)
      expect(useChatStore.getState().currentSession?.id).toBe('s1')
    })

    it('should create new session when none exist', async () => {
      vi.mocked(getSessions).mockResolvedValue([])

      await useChatStore.getState().loadSessions()

      expect(useChatStore.getState().sessions).toHaveLength(1)
      expect(useChatStore.getState().currentSession).toBeTruthy()
    })

    it('should handle load error', async () => {
      vi.mocked(getSessions).mockRejectedValue(new Error('DB error'))

      await useChatStore.getState().loadSessions()

      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('createNewSession', () => {
    it('should create session and set as current', async () => {
      const session = await useChatStore.getState().createNewSession()

      expect(session.id).toBeTruthy()
      expect(useChatStore.getState().currentSession?.id).toBe(session.id)
      expect(useChatStore.getState().sessions).toHaveLength(1)
    })
  })

  describe('addMessage', () => {
    it('should add message to current session', async () => {
      const mockSession = {
        id: 's1', userId: 'user-1', title: 'Test', messages: [],
        metadata: {}, createdAt: '', updatedAt: '',
      }
      useChatStore.setState({ currentSession: mockSession, sessions: [mockSession] })

      const msg = { id: 'm1', role: 'user' as const, content: 'Hello', createdAt: '' }
      await useChatStore.getState().addMessage(msg as any)

      expect(dbAddMessage).toHaveBeenCalledWith('s1', msg)
      expect(useChatStore.getState().currentSession?.messages).toHaveLength(1)
    })

    it('should do nothing without current session', async () => {
      useChatStore.setState({ currentSession: null })
      await useChatStore.getState().addMessage({ id: 'm1' } as any)
      expect(dbAddMessage).not.toHaveBeenCalled()
    })
  })

  describe('updateMessage', () => {
    it('should update message in current session', async () => {
      const msg = { id: 'm1', role: 'user' as const, content: 'Hello', createdAt: '' }
      const session = { id: 's1', messages: [msg] } as any
      useChatStore.setState({ currentSession: session, sessions: [session] })

      await useChatStore.getState().updateMessage('m1', { content: 'Updated' })

      expect(useChatStore.getState().currentSession?.messages[0].content).toBe('Updated')
    })
  })

  describe('deleteMessage', () => {
    it('should remove message from session', async () => {
      const msgs = [
        { id: 'm1', content: 'Hello' },
        { id: 'm2', content: 'World' },
      ]
      const session = { id: 's1', messages: msgs } as any
      useChatStore.setState({ currentSession: session, sessions: [session] })

      await useChatStore.getState().deleteMessage('s1', 'm1')

      expect(useChatStore.getState().currentSession?.messages).toHaveLength(1)
      expect(useChatStore.getState().currentSession?.messages[0].id).toBe('m2')
    })
  })

  describe('renameSession', () => {
    it('should update session title', async () => {
      const session = { id: 's1', title: 'Old', messages: [] } as any
      useChatStore.setState({ currentSession: session, sessions: [session] })

      await useChatStore.getState().renameSession('s1', 'New Title')

      expect(useChatStore.getState().sessions[0].title).toBe('New Title')
      expect(useChatStore.getState().currentSession?.title).toBe('New Title')
    })
  })

  describe('deleteSessionById', () => {
    it('should remove session', async () => {
      const s1 = { id: 's1', messages: [] } as any
      const s2 = { id: 's2', messages: [] } as any
      useChatStore.setState({ sessions: [s1, s2], currentSession: s1 })
      vi.mocked(getSession).mockResolvedValue(s2)

      await useChatStore.getState().deleteSessionById('s1')

      expect(useChatStore.getState().sessions).toHaveLength(1)
    })
  })

  // ===== Error state =====
  describe('error handling', () => {
    it('should set and clear error', () => {
      useChatStore.getState().setError('Something failed')
      expect(useChatStore.getState().error).toBe('Something failed')

      useChatStore.getState().setError(null)
      expect(useChatStore.getState().error).toBeNull()
    })
  })

  describe('refreshSessions', () => {
    it('should reload sessions', async () => {
      const mockSessions = [{ id: 's1', title: 'Test' }]
      vi.mocked(getSessions).mockResolvedValue(mockSessions as any)

      await useChatStore.getState().refreshSessions()

      expect(useChatStore.getState().sessions).toEqual(mockSessions)
    })
  })
})
