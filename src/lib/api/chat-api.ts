/**
 * 即时聊天 API 客户端
 * 后端路由: /api/chat (chat.py)
 */

import { client } from './client'

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

// ============ 类型 ============

export interface ChatUser {
  id: string
  username: string
  avatar_url: string | null
  online: boolean
}

export interface ConversationInfo {
  id: string
  type: string
  name: string | null
  other_user: {
    id: string
    username: string
    avatar_url: string | null
    online: boolean
  } | null
  last_message: {
    id: string
    sender_id: string | null
    content: string
    created_at: string
  } | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string | null
  sender_avatar: string | null
  content: string
  is_read: boolean
  created_at: string
}

// ============ REST ============

export async function getConversations(): Promise<ConversationInfo[]> {
  return client.get<ConversationInfo[]>('/chat/conversations', getToken() || undefined)
}

export async function createConversation(userId: string): Promise<{ id: string; type: string }> {
  return client.post<{ id: string; type: string }>('/chat/conversations', { user_id: userId }, getToken() || undefined)
}

export async function getMessages(
  convId: string,
  limit = 50,
  before?: string,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (before) params.set('before', before)
  return client.get<ChatMessage[]>(
    `/chat/conversations/${convId}/messages?${params}`,
    getToken() || undefined,
  )
}

export async function markConversationRead(convId: string): Promise<{ success: boolean }> {
  return client.post<{ success: boolean }>(
    `/chat/conversations/${convId}/read`,
    undefined,
    getToken() || undefined,
  )
}

export async function getChatUsers(): Promise<{ users: ChatUser[] }> {
  return client.get<{ users: ChatUser[] }>('/chat/users', getToken() || undefined)
}

export async function getOnlineUsers(): Promise<{ user_ids: string[] }> {
  return client.get<{ user_ids: string[] }>('/chat/online-users', getToken() || undefined)
}

// ============ WebSocket ============

export function getChatWsUrl(userId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const token = typeof window !== 'undefined' ? localStorage.getItem('nanoai_token') : ''
  return `${protocol}//${host}/api/chat/ws/${userId}?token=${token}`
}
