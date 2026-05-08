import { create } from 'zustand'
import type { ConversationInfo, ChatMessage, ChatUser } from '@/lib/api/chat-api'

interface ChatState {
  conversations: ConversationInfo[]
  currentConvId: string | null
  messages: ChatMessage[]
  users: ChatUser[]
  onlineUserIds: Set<string>
  totalUnread: number

  setConversations: (convs: ConversationInfo[]) => void
  setCurrentConvId: (id: string | null) => void
  setMessages: (msgs: ChatMessage[]) => void
  addMessage: (msg: ChatMessage) => void
  prependMessages: (msgs: ChatMessage[]) => void
  setUsers: (users: ChatUser[]) => void
  setOnlineUserIds: (ids: string[]) => void
  updateOnlineStatus: (userId: string, online: boolean) => void
  updateConvLastMessage: (convId: string, msg: ChatMessage) => void
  decrementUnread: (convId: string) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConvId: null,
  messages: [],
  users: [],
  onlineUserIds: new Set<string>(),
  totalUnread: 0,

  setConversations: (convs) => set({
    conversations: convs,
    totalUnread: convs.reduce((sum, c) => sum + c.unread_count, 0),
  }),

  setCurrentConvId: (id) => set({ currentConvId: id, messages: [] }),

  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  prependMessages: (msgs) => set((s) => ({ messages: [...msgs, ...s.messages] })),

  setUsers: (users) => set({ users }),

  setOnlineUserIds: (ids) => set({ onlineUserIds: new Set(ids) }),

  updateOnlineStatus: (userId, online) => set((s) => {
    const next = new Set(s.onlineUserIds)
    if (online) next.add(userId); else next.delete(userId)
    const conversations = s.conversations.map(c => {
      if (c.other_user?.id === userId) {
        return { ...c, other_user: { ...c.other_user, online } }
      }
      return c
    })
    const users = s.users.map(u => u.id === userId ? { ...u, online } : u)
    return { onlineUserIds: next, conversations, users }
  }),

  updateConvLastMessage: (convId, msg) => set((s) => ({
    conversations: s.conversations.map(c =>
      c.id === convId ? { ...c, last_message: { id: msg.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at }, updated_at: msg.created_at } : c
    ).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  })),

  decrementUnread: (convId) => set((s) => {
    const conv = s.conversations.find(c => c.id === convId)
    if (!conv || conv.unread_count === 0) return s
    return {
      conversations: s.conversations.map(c => c.id === convId ? { ...c, unread_count: 0 } : c),
      totalUnread: Math.max(0, s.totalUnread - conv.unread_count),
    }
  }),

  reset: () => set({
    conversations: [],
    currentConvId: null,
    messages: [],
    users: [],
    onlineUserIds: new Set<string>(),
    totalUnread: 0,
  }),
}))
