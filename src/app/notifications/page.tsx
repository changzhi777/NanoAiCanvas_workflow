import { useState, useEffect, useCallback } from 'react'
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications, type Notification } from '@/lib/api/notifications-api'
import { useNotificationStore, PAGE_SIZE, type NotificationFilter } from '@/stores/notificationStore'
import { TYPE_CONFIG, DEFAULT_TYPE_CONFIG, timeAgo } from '@/lib/notification-shared'
import { ArrowLeft, Bell, CheckCheck, Trash2, Loader2, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from '@/lib/next-navigation-shim'

const FILTER_TABS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统' },
  { key: 'points', label: '积分' },
  { key: 'team', label: '团队' },
]

function filterNotifications(notifications: Notification[], filter: NotificationFilter): Notification[] {
  if (filter === 'all') return notifications
  if (filter === 'system') return notifications.filter(n => n.notification_type === 'system' || n.notification_type === 'broadcast')
  if (filter === 'points') return notifications.filter(n => n.notification_type === 'points_grant' || n.notification_type === 'points_deduct')
  if (filter === 'team') return notifications.filter(n => n.notification_type === 'team_invite' || n.notification_type === 'approval' || n.notification_type === 'rejection')
  return notifications
}

export default function NotificationsPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [localLoading, setLocalLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingRead, setDeletingRead] = useState(false)

  const notifications = useNotificationStore(s => s.notifications)
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const total = useNotificationStore(s => s.total)
  const wsConnected = useNotificationStore(s => s.wsConnected)
  const filter = useNotificationStore(s => s.filter)
  const hasMore = useNotificationStore(s => s.hasMore)
  const storeSetNotifications = useNotificationStore(s => s.setNotifications)
  const storeAppendNotifications = useNotificationStore(s => s.appendNotifications)
  const storeMarkAsRead = useNotificationStore(s => s.markAsRead)
  const storeMarkAllAsRead = useNotificationStore(s => s.markAllAsRead)
  const storeDeleteNotification = useNotificationStore(s => s.deleteNotification)
  const storeDeleteReadNotifications = useNotificationStore(s => s.deleteReadNotifications)
  const storeSetFilter = useNotificationStore(s => s.setFilter)
  const storeSetLoading = useNotificationStore(s => s.setLoading)

  useEffect(() => {
    const token = localStorage.getItem('nanoai_token')
    if (!token) {
      setIsLoggedIn(false)
      setLocalLoading(false)
      return
    }
    setIsLoggedIn(true)
  }, [])

  const fetchList = useCallback(async (page: number, append = false) => {
    storeSetLoading(true)
    try {
      const data = await getUserNotifications('', page, PAGE_SIZE)
      if (append) {
        storeAppendNotifications(data.notifications, data.total)
      } else {
        storeSetNotifications(data.notifications, data.total, data.unread_count)
      }
    } catch { /* ignore */ }
    storeSetLoading(false)
    setLocalLoading(false)
  }, [storeSetNotifications, storeAppendNotifications, storeSetLoading])

  useEffect(() => {
    if (isLoggedIn) fetchList(1)
  }, [isLoggedIn, fetchList])

  const handleFilterChange = (key: NotificationFilter) => {
    storeSetFilter(key)
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await markAllAsRead('')
      storeMarkAllAsRead()
    } catch { /* ignore */ }
    setMarkingAll(false)
  }

  const handleDeleteRead = async () => {
    setDeletingRead(true)
    try {
      await deleteReadNotifications()
      storeDeleteReadNotifications()
    } catch { /* ignore */ }
    setDeletingRead(false)
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id)
      storeMarkAsRead(id)
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      storeDeleteNotification(id)
    } catch { /* ignore */ }
  }

  const handleLoadMore = () => {
    const nextPage = Math.floor(notifications.length / PAGE_SIZE) + 1
    fetchList(nextPage, true)
  }

  if (localLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Bell className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">请先登录查看通知</p>
        <button
          onClick={() => router.push('/')}
          className="text-primary hover:text-primary/80 transition-colors text-sm"
        >
          返回首页
        </button>
      </div>
    )
  }

  const filtered = filterNotifications(notifications, filter)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-1.5 rounded-md hover:bg-muted/60 transition-colors"
                aria-label="返回"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold">消息通知</h1>
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', wsConnected ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400')}>
                {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{wsConnected ? '已连接' : '未连接'}</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mt-4">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                )}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {markingAll ? '处理中...' : '全部已读'}
            </button>
            <button
              onClick={handleDeleteRead}
              disabled={deletingRead}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingRead ? '清理中...' : '清空已读'}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto px-4 py-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>暂无通知</p>
          </div>
        ) : (
          <>
            {filtered.map(n => {
              const cfg = TYPE_CONFIG[n.notification_type] || DEFAULT_TYPE_CONFIG
              const isUnread = n.status !== 'read'
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b hover:bg-muted/20 transition-colors group',
                    isUnread && 'bg-primary/5'
                  )}
                >
                  <div className={cn('mt-0.5 shrink-0', cfg.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug', isUnread && 'font-medium')}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-primary transition-all"
                            title="标记已读"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isUnread && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {n.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{n.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {hasMore && notifications.length < total && (
              <div className="py-4 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
