import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationRecords,
  getWebSocketUrl,
} from '@/lib/api/notifications-api'

describe('notifications-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendNotification', () => {
    it('should POST notification', async () => {
      mockFetchResponse({ success: true, notification_id: 'n1', recipients_count: 5 })

      const result = await sendNotification({
        title: 'Test',
        content: 'Hello',
        notification_type: 'system',
      })

      expect(result.success).toBe(true)
      expect(lastFetchUrl()).toContain('/notifications')
    })
  })

  describe('getUserNotifications', () => {
    it('should GET notifications with pagination', async () => {
      mockFetchResponse({
        notifications: [
          { id: 1, title: 'Test', content: 'Msg', notification_type: 'system', status: 'read', receiver_id: 'u1', created_at: '' },
        ],
        total: 1,
        unread_count: 0,
      })

      const result = await getUserNotifications('user-1', 1, 20)

      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].status).toBe('read')
      expect(result.total).toBe(1)
      expect(lastFetchUrl()).toContain('limit=20')
      expect(lastFetchUrl()).toContain('offset=0')
    })

    it('should normalize status to read/delivered', async () => {
      mockFetchResponse({
        notifications: [
          { id: 1, title: 'A', status: 'READ', receiver_id: '', created_at: '' },
          { id: 2, title: 'B', status: 'pending', receiver_id: '', created_at: '' },
        ],
        total: 2,
        unread_count: 1,
      })

      const result = await getUserNotifications('u1')
      expect(result.notifications[0].status).toBe('read')
      expect(result.notifications[1].status).toBe('delivered')
    })
  })

  describe('markAsRead', () => {
    it('should POST to mark single notification as read', async () => {
      mockFetchResponse({ success: true })

      const result = await markAsRead('n1')
      expect(result.success).toBe(true)
      expect(lastFetchUrl()).toContain('/notifications/read/n1')
    })
  })

  describe('markAllAsRead', () => {
    it('should POST to mark all as read', async () => {
      mockFetchResponse({ success: true })

      const result = await markAllAsRead('user-1')
      expect(result.success).toBe(true)
      expect(lastFetchUrl()).toContain('/notifications/read-all')
    })
  })

  describe('deleteNotification', () => {
    it('should DELETE single notification', async () => {
      mockFetchResponse({ success: true })

      const result = await deleteNotification('n1')
      expect(result.success).toBe(true)
    })
  })

  describe('getNotificationRecords', () => {
    it('should GET records with pagination and type filter', async () => {
      mockFetchResponse([
        { id: 1, title: 'Rec', content: 'C', notification_type: 'system', status: 'sent', receiver_id: '', created_at: '', sender_name: 'Admin' },
      ])

      const records = await getNotificationRecords(1, 50, 'system')

      expect(records).toHaveLength(1)
      expect(records[0].sender_name).toBe('Admin')
      expect(lastFetchUrl()).toContain('notification_type=system')
    })
  })

  describe('getWebSocketUrl', () => {
    it('should generate WebSocket URL', () => {
      const url = getWebSocketUrl('user-1')
      expect(url).toContain('/api/notifications/ws/user-1')
      expect(url).toMatch(/^wss?:/)
    })
  })
})
