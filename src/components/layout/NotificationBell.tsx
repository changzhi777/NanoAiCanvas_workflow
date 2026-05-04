'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotificationStore } from '@/stores/notificationStore'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import { useAuthStore } from '@/stores/remoteStore'
import { getUserNotifications, markAsRead, markAllAsRead } from '@/lib/api/notifications-api'
import { toast } from 'sonner'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { user } = useAuthStore()
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead: markAsReadStore,
    markAllAsRead: markAllAsReadStore,
  } = useNotificationStore()

  // WebSocket connection
  useNotificationSocket({
    userId: user?.id || null,
    enabled: !!user,
    onNewNotification: () => {
      toast.info('收到新消息')
    },
  })

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getUserNotifications(user.id, 1, 20)
      setNotifications(data.notifications, data.total, data.unread_count)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [user?.id, setNotifications])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
      markAsReadStore(notificationId)
    } catch (error) {
      toast.error('标记失败')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      await markAllAsRead(user.id)
      markAllAsReadStore()
    } catch (error) {
      toast.error('标记失败')
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">消息通知</CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-auto py-1 px-2"
                    onClick={handleMarkAllAsRead}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    全部已读
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
                    暂无消息
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-accent cursor-pointer ${
                          notification.status !== 'read' ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          if (notification.status !== 'read') {
                            handleMarkAsRead(notification.id)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {notification.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          {notification.status !== 'read' && (
                            <Badge variant="default" className="w-2 h-2 p-0 rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
