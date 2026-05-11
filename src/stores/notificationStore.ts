/**
 * 消息通知状态管理
 */

import { create } from 'zustand'
import type { Notification } from '@/lib/api/notifications-api'

export type NotificationFilter = 'all' | 'system' | 'points' | 'team'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  total: number
  loading: boolean
  wsConnected: boolean
  filter: NotificationFilter
  page: number
  hasMore: boolean

  // Actions
  setNotifications: (notifications: Notification[], total: number, unreadCount: number) => void
  appendNotifications: (notifications: Notification[], total: number) => void
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
  deleteReadNotifications: () => void
  setLoading: (loading: boolean) => void
  setWsConnected: (connected: boolean) => void
  incrementUnread: () => void
  setUnreadInfo: (total: number, unreadCount: number) => void
  setFilter: (filter: NotificationFilter) => void
  setPage: (page: number) => void
  setHasMore: (hasMore: boolean) => void
  reset: () => void
}

const PAGE_SIZE = 20

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  wsConnected: false,
  filter: 'all',
  page: 1,
  hasMore: true,

  setNotifications: (notifications, total, unreadCount) =>
    set({ notifications, total, unreadCount, page: 1, hasMore: notifications.length < total }),

  appendNotifications: (newItems, total) =>
    set((state) => ({
      notifications: [...state.notifications, ...newItems],
      total,
      hasMore: state.notifications.length + newItems.length < total,
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      total: state.total + 1,
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, status: 'read' as const } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, status: 'read' as const })),
      unreadCount: 0,
    })),

  deleteNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      total: Math.max(0, state.total - 1),
    })),

  deleteReadNotifications: () =>
    set((state) => {
      const remaining = state.notifications.filter((n) => n.status !== 'read')
      return {
        notifications: remaining,
        total: remaining.length,
      }
    }),

  setLoading: (loading) => set({ loading }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  setUnreadInfo: (total, unreadCount) => set({ total, unreadCount }),

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  setFilter: (filter) => set({ filter, page: 1 }),

  setPage: (page) => set({ page }),

  setHasMore: (hasMore) => set({ hasMore }),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
      loading: false,
      wsConnected: false,
      filter: 'all',
      page: 1,
      hasMore: true,
    }),
}))

export { PAGE_SIZE }
