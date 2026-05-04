/**
 * 消息通知状态管理
 */

import { create } from 'zustand'
import type { Notification } from '@/lib/api/notifications-api'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  total: number
  loading: boolean
  wsConnected: boolean

  // Actions
  setNotifications: (notifications: Notification[], total: number, unreadCount: number) => void
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  setLoading: (loading: boolean) => void
  setWsConnected: (connected: boolean) => void
  incrementUnread: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  wsConnected: false,

  setNotifications: (notifications, total, unreadCount) =>
    set({ notifications, total, unreadCount }),

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

  setLoading: (loading) => set({ loading }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
      loading: false,
      wsConnected: false,
    }),
}))
