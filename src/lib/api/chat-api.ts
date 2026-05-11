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

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'mixed'

export interface Attachment {
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail_url?: string | null
  name: string
  prompt?: string | null
  source_asset_id?: string | null
}

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
    message_type?: MessageType
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
  message_type: MessageType
  attachments: Attachment[]
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

export async function deleteConversation(convId: string): Promise<{ success: boolean }> {
  return client.delete<{ success: boolean }>(`/chat/conversations/${convId}`, getToken() || undefined)
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

export async function uploadChatFile(file: File): Promise<Attachment> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const baseUrl = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || '/api'
  const resp = await fetch(`${baseUrl}/chat/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '上传失败' }))
    throw new Error(err.detail || '上传失败')
  }
  return resp.json()
}

export async function saveAttachmentToAssets(data: {
  url: string
  type: string
  name: string
  prompt?: string | null
  thumbnail_url?: string | null
}): Promise<{ asset_id: string; success: boolean }> {
  return client.post<{ asset_id: string; success: boolean }>(
    '/chat/save-attachment',
    data,
    getToken() || undefined,
  )
}

// ============ WebSocket ============

export function getChatWsUrl(userId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const token = typeof window !== 'undefined' ? localStorage.getItem('nanoai_token') : ''
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${protocol}//${host}${base}/api/chat/ws/${userId}?token=${token}`
}
