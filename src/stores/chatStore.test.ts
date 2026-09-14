import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '@/stores/chatStore'
import type { ChatMessage, ConversationInfo } from '@/lib/api/chat-api'

const mockConv = (id: string, unread = 0): ConversationInfo => ({
  id,
  type: 'private',
  other_user: { id: `u-${id}`, username: `User ${id}`, online: false, avatar: null },
  last_message: null,
  unread_count: unread,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const mockMsg = (id: string, sender = 'me'): ChatMessage => ({
  id,
  conversation_id: 'conv1',
  sender_id: sender,
  content: `Message ${id}`,
  message_type: 'text',
  created_at: new Date().toISOString(),
  read_by: [],
})

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset()
  })

  describe('setConversations', () => {
    it('should set conversations and compute totalUnread', () => {
      const convs = [mockConv('c1', 2), mockConv('c2', 3)]
      useChatStore.getState().setConversations(convs)
      expect(useChatStore.getState().conversations).toHaveLength(2)
      expect(useChatStore.getState().totalUnread).toBe(5)
    })

    it('should calculate totalUnread as 0 when no unread', () => {
      useChatStore.getState().setConversations([mockConv('c1'), mockConv('c2')])
      expect(useChatStore.getState().totalUnread).toBe(0)
    })
  })

  describe('setCurrentConvId', () => {
    it('should set current conversation and clear messages', () => {
      useChatStore.getState().setMessages([mockMsg('m1')])
      useChatStore.getState().setCurrentConvId('c1')
      expect(useChatStore.getState().currentConvId).toBe('c1')
      expect(useChatStore.getState().messages).toHaveLength(0)
    })
  })

  describe('message management', () => {
    it('addMessage should append to messages', () => {
      useChatStore.getState().setMessages([mockMsg('m1')])
      useChatStore.getState().addMessage(mockMsg('m2'))
      expect(useChatStore.getState().messages).toHaveLength(2)
    })

    it('prependMessages should prepend older messages', () => {
      useChatStore.getState().setMessages([mockMsg('m3')])
      useChatStore.getState().prependMessages([mockMsg('m1'), mockMsg('m2')])
      const msgs = useChatStore.getState().messages
      expect(msgs).toHaveLength(3)
      expect(msgs[0].id).toBe('m1')
      expect(msgs[2].id).toBe('m3')
    })
  })

  describe('online status', () => {
    it('setOnlineUserIds should set online users', () => {
      useChatStore.getState().setOnlineUserIds(['u1', 'u2'])
      expect(useChatStore.getState().onlineUserIds.has('u1')).toBe(true)
      expect(useChatStore.getState().onlineUserIds.has('u3')).toBe(false)
    })

    it('updateOnlineStatus should add/remove user', () => {
      useChatStore.getState().setOnlineUserIds(['u1'])
      useChatStore.getState().updateOnlineStatus('u2', true)
      expect(useChatStore.getState().onlineUserIds.has('u2')).toBe(true)
      useChatStore.getState().updateOnlineStatus('u1', false)
      expect(useChatStore.getState().onlineUserIds.has('u1')).toBe(false)
    })

    it('updateOnlineStatus should update conversation user', () => {
      useChatStore.getState().setConversations([mockConv('c1')])
      useChatStore.getState().updateOnlineStatus('u-c1', true)
      const conv = useChatStore.getState().conversations[0]
      expect(conv.other_user?.online).toBe(true)
    })
  })

  describe('updateConvLastMessage', () => {
    it('should update last message and sort by updated_at', () => {
      const c1 = mockConv('c1')
      c1.updated_at = '2026-01-01T00:00:00Z'
      const c2 = mockConv('c2')
      c2.updated_at = '2026-01-02T00:00:00Z'
      useChatStore.getState().setConversations([c1, c2])

      const msg: ChatMessage = {
        id: 'm1', conversation_id: 'c1', sender_id: 'me',
        content: 'Hello', message_type: 'text',
        created_at: '2026-01-03T00:00:00Z', read_by: [],
      }
      useChatStore.getState().updateConvLastMessage('c1', msg)

      // c1 should now be first (most recent updated_at)
      const convs = useChatStore.getState().conversations
      expect(convs[0].id).toBe('c1')
      expect(convs[0].last_message?.content).toBe('Hello')
    })
  })

  describe('decrementUnread', () => {
    it('should clear unread for a conversation', () => {
      useChatStore.getState().setConversations([mockConv('c1', 5), mockConv('c2', 3)])
      useChatStore.getState().decrementUnread('c1')
      const state = useChatStore.getState()
      expect(state.totalUnread).toBe(3)
      expect(state.conversations.find(c => c.id === 'c1')?.unread_count).toBe(0)
    })

    it('should handle zero unread gracefully', () => {
      useChatStore.getState().setConversations([mockConv('c1', 0)])
      useChatStore.getState().decrementUnread('c1')
      expect(useChatStore.getState().totalUnread).toBe(0)
    })
  })

  describe('removeConversation', () => {
    it('should remove conversation and adjust totalUnread', () => {
      useChatStore.getState().setConversations([mockConv('c1', 3), mockConv('c2', 1)])
      useChatStore.getState().removeConversation('c1')
      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.totalUnread).toBe(1)
    })

    it('should clear currentConvId if removed', () => {
      useChatStore.getState().setConversations([mockConv('c1')])
      useChatStore.getState().setCurrentConvId('c1')
      useChatStore.getState().removeConversation('c1')
      expect(useChatStore.getState().currentConvId).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset all state', () => {
      useChatStore.getState().setConversations([mockConv('c1', 1)])
      useChatStore.getState().addMessage(mockMsg('m1'))
      useChatStore.getState().reset()
      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(0)
      expect(state.messages).toHaveLength(0)
      expect(state.currentConvId).toBeNull()
      expect(state.totalUnread).toBe(0)
    })
  })
})
