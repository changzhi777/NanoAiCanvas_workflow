import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/lib/api/notifications-api';
import { useNotificationStore } from '@/stores/notificationStore';
import { TYPE_CONFIG, DEFAULT_TYPE_CONFIG, timeAgo } from '@/lib/notification-shared';
import { Bell, CheckCheck, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from '@/lib/next-navigation-shim';

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [popoverItems, setPopoverItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const wsConnected = useNotificationStore((s) => s.wsConnected);
  const unread = useNotificationStore((s) => s.unreadCount);
  const storeSetUnreadInfo = useNotificationStore((s) => s.setUnreadInfo);
  const ref = useRef<HTMLDivElement>(null);
  const [bounce, setBounce] = useState(false);
  const router = useRouter();

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUserNotifications('', 1, 1);
      storeSetUnreadInfo(data.total, data.unread_count);
    } catch { /* ignore */ }
  }, [storeSetUnreadInfo]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserNotifications('', 1, 20);
      setPopoverItems(data.notifications);
      storeSetUnreadInfo(data.total, data.unread_count);
    } catch { /* ignore */ }
    setLoading(false);
  }, [storeSetUnreadInfo]);

  useEffect(() => { fetchUnread(); const t = setInterval(fetchUnread, 30000); return () => clearInterval(t); }, [fetchUnread]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevUnread = useRef(unread);
  useEffect(() => {
    if (unread > prevUnread.current) {
      setBounce(true);
      setTimeout(() => setBounce(false), 600);
    }
    prevUnread.current = unread;
  }, [unread]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setPopoverItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n)));
      storeSetUnreadInfo(0, Math.max(0, unread - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead('');
      setPopoverItems((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
      storeSetUnreadInfo(0, 0);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setPopoverItems((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted/60 transition-colors',
          bounce && 'animate-bounce',
        )}
        aria-label="通知"
      >
        <Bell className={cn('h-4 w-4', unread > 0 ? 'text-primary' : 'text-muted-foreground')} />
        <span className={cn(
          'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background',
          wsConnected ? 'bg-green-500' : 'bg-gray-400',
        )} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-in zoom-in fade-in duration-200">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="text-sm font-semibold">通知</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                <CheckCheck className="h-3 w-3" />全部已读
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
            ) : popoverItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无通知</div>
            ) : (
              popoverItems.map((n) => {
                const cfg = TYPE_CONFIG[n.notification_type] || DEFAULT_TYPE_CONFIG;
                const isUnread = n.status !== 'read';
                const Icon = cfg.icon;
                return (
                  <div key={n.id} className={cn('flex gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors group', isUnread && 'bg-primary/5')}>
                    <div className={cn('mt-0.5 shrink-0', cfg.color)}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (isUnread) handleMarkRead(n.id); }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-snug', isUnread && 'font-medium')}>{n.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {n.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t bg-muted/20">
            <button onClick={() => { setOpen(false); router.push('/nanoai/notifications'); }} className="flex items-center justify-center gap-1 w-full py-2.5 text-xs text-primary hover:text-primary/80 hover:bg-muted/40 transition-colors">
              查看全部通知<ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
