/**
 * 消息通知 API 客户端
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
 * 发送通知
 */
export async function sendNotification(data: NotificationCreate): Promise<SendResponse> {
  const response = await client.post<SendResponse>('/api/notifications', data, getToken() || undefined)
  return response
}

/**
 * 获取用户消息列表
 */
export async function getUserNotifications(
  userId: string,
  page = 1,
  pageSize = 20,
  unreadOnly = false
): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (unreadOnly) params.set('unread_only', 'true')

  const response = await client.get<NotificationListResponse>(
    `/api/notifications/user/${userId}?${params}`,
    getToken() || undefined
  )
  return response
}

/**
 * 标记消息为已读
 */
export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  const response = await client.put<{ success: boolean }>(
    `/api/notifications/${notificationId}/read`,
    undefined,
    getToken() || undefined
  )
  return response
}

/**
 * 标记所有消息为已读
 */
export async function markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
  const response = await client.put<{ success: boolean; count: number }>(
    `/api/notifications/read-all/${userId}`,
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

  const response = await client.get<Notification[]>(
    `/api/notifications/records?${params}`,
    getToken() || undefined
  )
  return response
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
