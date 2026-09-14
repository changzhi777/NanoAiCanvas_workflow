import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '@/stores/notificationStore'

const mockNotification = (id: string, status: 'read' | 'unread' = 'unread') => ({
  id,
  type: 'system' as const,
  title: `Test ${id}`,
  message: `Message ${id}`,
  status,
  created_at: new Date().toISOString(),
})

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().reset()
  })

  describe('setNotifications', () => {
    it('should set notifications and calculate hasMore', () => {
      const notifications = Array.from({ length: 5 }, (_, i) => mockNotification(`n${i}`))
      useNotificationStore.getState().setNotifications(notifications, 10, 3)
      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(5)
      expect(state.total).toBe(10)
      expect(state.unreadCount).toBe(3)
      expect(state.hasMore).toBe(true)
    })

    it('should set hasMore=false when all loaded', () => {
      const notifications = Array.from({ length: 10 }, (_, i) => mockNotification(`n${i}`))
      useNotificationStore.getState().setNotifications(notifications, 10, 0)
      expect(useNotificationStore.getState().hasMore).toBe(false)
    })
  })

  describe('appendNotifications', () => {
    it('should append new notifications and update total', () => {
      const first = [mockNotification('n1')]
      useNotificationStore.getState().setNotifications(first, 3, 1)
      const more = [mockNotification('n2'), mockNotification('n3')]
      useNotificationStore.getState().appendNotifications(more, 3)
      expect(useNotificationStore.getState().notifications).toHaveLength(3)
      expect(useNotificationStore.getState().hasMore).toBe(false)
    })
  })

  describe('addNotification', () => {
    it('should prepend notification and increment counters', () => {
      useNotificationStore.getState().setNotifications([mockNotification('n1')], 1, 1)
      useNotificationStore.getState().addNotification(mockNotification('n2'))
      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(2)
      expect(state.notifications[0].id).toBe('n2')
      expect(state.total).toBe(2)
      expect(state.unreadCount).toBe(2)
    })
  })

  describe('markAsRead', () => {
    it('should mark single notification as read', () => {
      useNotificationStore.getState().setNotifications([mockNotification('n1')], 1, 1)
      useNotificationStore.getState().markAsRead('n1')
      const state = useNotificationStore.getState()
      expect(state.notifications[0].status).toBe('read')
      expect(state.unreadCount).toBe(0)
    })

    it('should not go below 0 unread', () => {
      useNotificationStore.getState().setNotifications([], 0, 0)
      useNotificationStore.getState().markAsRead('nonexistent')
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all as read', () => {
      const ns = [mockNotification('n1'), mockNotification('n2')]
      useNotificationStore.getState().setNotifications(ns, 2, 2)
      useNotificationStore.getState().markAllAsRead()
      const state = useNotificationStore.getState()
      expect(state.notifications.every(n => n.status === 'read')).toBe(true)
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('should remove notification by id', () => {
      const ns = [mockNotification('n1'), mockNotification('n2')]
      useNotificationStore.getState().setNotifications(ns, 2, 2)
      useNotificationStore.getState().deleteNotification('n1')
      expect(useNotificationStore.getState().notifications).toHaveLength(1)
      expect(useNotificationStore.getState().total).toBe(1)
    })
  })

  describe('deleteReadNotifications', () => {
    it('should remove all read notifications', () => {
      const ns = [mockNotification('n1', 'read'), mockNotification('n2', 'unread')]
      useNotificationStore.getState().setNotifications(ns, 2, 1)
      useNotificationStore.getState().deleteReadNotifications()
      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0].id).toBe('n2')
      expect(state.total).toBe(1)
    })
  })

  describe('setFilter', () => {
    it('should change filter and reset page', () => {
      useNotificationStore.getState().setPage(3)
      useNotificationStore.getState().setFilter('system')
      expect(useNotificationStore.getState().filter).toBe('system')
      expect(useNotificationStore.getState().page).toBe(1)
    })
  })

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      const ns = [mockNotification('n1')]
      useNotificationStore.getState().setNotifications(ns, 1, 1)
      useNotificationStore.getState().setFilter('points')
      useNotificationStore.getState().reset()
      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(0)
      expect(state.total).toBe(0)
      expect(state.unreadCount).toBe(0)
      expect(state.filter).toBe('all')
      expect(state.page).toBe(1)
      expect(state.hasMore).toBe(true)
    })
  })
})
