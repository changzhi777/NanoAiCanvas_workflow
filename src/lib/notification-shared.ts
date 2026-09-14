/**
 * 消息通知共享工具
 * NotificationPopover 和 NotificationsPage 共用
 */

import { Bell, Megaphone, Gift, Users, AlertCircle, CheckCheck, Info } from 'lucide-react'

export const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  system: { icon: Megaphone, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '系统' },
  broadcast: { icon: Megaphone, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '广播' },
  points_grant: { icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/10', label: '积分' },
  points_deduct: { icon: Gift, color: 'text-orange-400', bg: 'bg-orange-500/10', label: '积分' },
  team_invite: { icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', label: '团队' },
  approval: { icon: CheckCheck, color: 'text-green-400', bg: 'bg-green-500/10', label: '审批' },
  rejection: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: '拒绝' },
}

export const DEFAULT_TYPE_CONFIG = { icon: Info, color: 'text-slate-400', bg: 'bg-slate-500/10', label: '通知' }

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
