import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  markConversationRead,
  getChatUsers,
  getOnlineUsers,
  saveAttachmentToAssets,
  getChatWsUrl,
} from '@/lib/api/chat-api'

describe('chat-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConversations', () => {
    it('should GET conversations list', async () => {
      mockFetchResponse([
        { id: 'c1', type: 'private', name: null, other_user: { id: 'u2', username: 'Bob', avatar_url: null, online: true }, last_message: null, unread_count: 2, created_at: '', updated_at: '' },
      ])

      const result = await getConversations()

      expect(result).toHaveLength(1)
      expect(result[0].unread_count).toBe(2)
      expect(lastFetchUrl()).toContain('/api/chat/conversations')
    })
  })

  describe('createConversation', () => {
    it('should POST to create conversation', async () => {
      mockFetchResponse({ id: 'c2', type: 'private' })

      const result = await createConversation('user-2')

      expect(result.id).toBe('c2')
    })
  })

  describe('deleteConversation', () => {
    it('should DELETE conversation', async () => {
      mockFetchResponse({ success: true })

      const result = await deleteConversation('c1')

      expect(result.success).toBe(true)
    })
  })

  describe('getMessages', () => {
    it('should GET messages with pagination', async () => {
      mockFetchResponse([
        { id: 'm1', conversation_id: 'c1', sender_id: 'u1', content: 'Hi', message_type: 'text', attachments: [], is_read: true, created_at: '' },
      ])

      const result = await getMessages('c1', 20, 'cursor-123')

      expect(result).toHaveLength(1)
      expect(lastFetchUrl()).toContain('limit=20')
      expect(lastFetchUrl()).toContain('before=cursor-123')
    })
  })

  describe('markConversationRead', () => {
    it('should POST to mark as read', async () => {
      mockFetchResponse({ success: true })

      const result = await markConversationRead('c1')

      expect(result.success).toBe(true)
      expect(lastFetchUrl()).toContain('/read')
    })
  })

  describe('getChatUsers', () => {
    it('should GET users list', async () => {
      mockFetchResponse({
        users: [
          { id: 'u1', username: 'Alice', avatar_url: null, online: true },
        ],
      })

      const result = await getChatUsers()

      expect(result.users).toHaveLength(1)
    })
  })

  describe('getOnlineUsers', () => {
    it('should GET online user IDs', async () => {
      mockFetchResponse({ user_ids: ['u1', 'u2'] })

      const result = await getOnlineUsers()

      expect(result.user_ids).toHaveLength(2)
    })
  })

  describe('saveAttachmentToAssets', () => {
    it('should POST to save attachment', async () => {
      mockFetchResponse({ asset_id: 'a1', success: true })

      const result = await saveAttachmentToAssets({
        url: 'https://img.png',
        type: 'image',
        name: 'test.png',
      })

      expect(result.success).toBe(true)
      expect(result.asset_id).toBe('a1')
    })
  })

  describe('getChatWsUrl', () => {
    it('should generate WebSocket URL with token', () => {
      localStorage.setItem('nanoai_token', 'test-jwt')
      const url = getChatWsUrl('user-1')

      expect(url).toContain('/api/chat/ws/user-1')
      expect(url).toContain('token=test-jwt')
    })
  })
})
