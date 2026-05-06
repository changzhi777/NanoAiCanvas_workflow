import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/remoteStore';
import { notifications, type NotificationItem } from '@/lib/api/client';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, string> = {
  system: '📢',
  approval: '✅',
  rejection: '❌',
  points_grant: '🎁',
  points_deduct: '💰',
  team_invite: '👥',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);
  const ref = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notifications.unreadCount(token);
      setUnread(res.count);
    } catch { /* ignore */ }
  }, [token]);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await notifications.list(token, 20);
      setItems(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  // Poll unread count every 30s
  useEffect(() => { fetchUnread(); const t = setInterval(fetchUnread, 30000); return () => clearInterval(t); }, [fetchUnread]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await notifications.markRead(id, token);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await notifications.markAllRead(token);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted/60 transition-colors"
        aria-label="通知"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-in zoom-in fade-in duration-200">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="text-sm font-semibold">通知</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无通知</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group',
                    !n.is_read && 'bg-primary/5',
                  )}
                  onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
                >
                  <span className="text-base shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug', !n.is_read && 'font-medium')}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
