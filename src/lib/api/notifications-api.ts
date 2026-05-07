/**
 * 消息通知 API 客户端
 * 后端路由: /api/notifications (notifications.py)
 */

import { client } from './client'

export interface Notification {
  id: string
  sender_id: string | null
  receiver_id: string | null
  team_id: string | null
  title: string
  content: string
  notification_type: 'system' | 'broadcast' | 'team' | 'user'
  status: 'pending' | 'sent' | 'delivered' | 'read'
  created_at: string
  delivered_at: string | null
  read_at: string | null
  sender_name?: string
}

export interface NotificationCreate {
  title: string
  content: string
  notification_type: 'system' | 'broadcast' | 'team' | 'user'
  receiver_id?: string
  team_id?: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  unread_count: number
}

export interface SendResponse {
  success: boolean
  notification_id: string
  recipients_count: number
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

/**
 * 发送通知（管理端）
 */
export async function sendNotification(data: NotificationCreate): Promise<SendResponse> {
  const response = await client.post<SendResponse>('/api/notifications', {
    title: data.title,
    content: data.content,
    notification_type: data.notification_type,
    receiver_id: data.receiver_id,
    team_id: data.team_id,
  }, getToken() || undefined)
  return response
}

/**
 * 获取用户消息列表
 */
export async function getUserNotifications(
  _userId: string,
  page = 1,
  pageSize = 20,
): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  params.set('limit', String(pageSize))
  params.set('offset', String((page - 1) * pageSize))

  const items = await client.get<any[]>(
    `/api/notifications?${params}`,
    getToken() || undefined
  )
  return {
    notifications: items.map(n => ({
      id: String(n.id),
      sender_id: null,
      receiver_id: String(n.user_id || ''),
      team_id: null,
      title: n.title,
      content: n.message || '',
      notification_type: (n.type || 'system') as Notification['notification_type'],
      status: n.is_read ? 'read' : 'delivered',
      created_at: n.created_at,
      delivered_at: null,
      read_at: null,
    })),
    total: items.length,
    unread_count: items.filter((n: any) => !n.is_read).length,
  }
}

/**
 * 标记消息为已读
 */
export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  const response = await client.post<{ success: boolean }>(
    `/api/notifications/read/${notificationId}`,
    undefined,
    getToken() || undefined
  )
  return response
}

/**
 * 标记所有消息为已读
 */
export async function markAllAsRead(_userId: string): Promise<{ success: boolean }> {
  const response = await client.post<{ success: boolean }>(
    '/api/notifications/read-all',
    undefined,
    getToken() || undefined
  )
  return response
}

/**
 * 获取消息发送记录（管理端）
 */
export async function getNotificationRecords(
  page = 1,
  pageSize = 50,
  notificationType?: string
): Promise<Notification[]> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (notificationType) params.set('notification_type', notificationType)

  const records = await client.get<any[]>(
    `/api/notifications/records?${params}`,
    getToken() || undefined
  )
  return records.map(r => ({
    id: String(r.id),
    sender_id: null,
    receiver_id: String(r.user_id),
    team_id: null,
    title: r.title,
    content: r.message || '',
    notification_type: (r.type || 'system') as Notification['notification_type'],
    status: r.is_read ? 'read' : 'delivered',
    created_at: r.created_at,
    delivered_at: null,
    read_at: null,
    sender_name: r.sender_name || '系统',
  }))
}

/**
 * 获取 WebSocket URL
 */
export function getWebSocketUrl(userId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'
  const wsBase = baseUrl.replace(/^http/, '')
  return `${protocol}${wsBase}/api/notifications/ws/${userId}`
}
