import { memo, useState } from 'react'
import { Clock, User, GitBranch, Link2, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: string
  timestamp: number
  type: 'created' | 'updated' | 'status_changed' | 'connected' | 'disconnected'
  user: {
    id: string
    name: string
    avatar?: string
  }
  data?: {
    from?: string
    to?: string
    field?: string
    oldValue?: any
    newValue?: any
  }
}

interface NodeTimelineProps {
  nodeId: string
  events: TimelineEvent[]
  maxEvents?: number
}

const NodeTimeline = memo(({ nodeId: _nodeId, events, maxEvents = 10 }: NodeTimelineProps) => {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)

  // 按时间倒序排序
  const sortedEvents = [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxEvents)

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return CheckCircle2
      case 'updated':
        return Clock
      case 'status_changed':
        return GitBranch
      case 'connected':
      case 'disconnected':
        return Link2
      default:
        return Clock
    }
  }

  const getEventLabel = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return '创建节点'
      case 'updated':
        return '更新节点'
      case 'status_changed':
        return '状态变更'
      case 'connected':
        return '建立连接'
      case 'disconnected':
        return '断开连接'
      default:
        return '未知操作'
    }
  }

  const getEventTypeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'bg-green-500'
      case 'updated':
        return 'bg-blue-500'
      case 'status_changed':
        return 'bg-purple-500'
      case 'connected':
        return 'bg-cyan-500'
      case 'disconnected':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }

    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`
    }

    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`
    }

    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`
    }

    // 显示具体日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (sortedEvents.length === 0) {
    return (
      <div className="node-timeline-empty flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-12 h-12 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">暂无历史记录</p>
      </div>
    )
  }

  return (
    <div className="node-timeline p-4 space-y-0">
      {/* 时间线 */}
      <div className="relative">
        {/* 垂直线 */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        {sortedEvents.map((event, index) => {
          const Icon = getEventIcon(event.type)
          const isSelected = selectedEvent === index

          return (
            <div
              key={event.id}
              className={cn(
                'relative flex items-start gap-3 pb-4 last:pb-0 cursor-pointer transition-colors rounded-lg hover:bg-muted/50',
                isSelected && 'bg-muted'
              )}
              onClick={() => setSelectedEvent(isSelected ? null : index)}
            >
              {/* 时间点 */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    getEventTypeColor(event.type)
                  )}
                >
                  <Icon className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{getEventLabel(event.type)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {formatTime(event.timestamp)}
                  </Badge>
                </div>

                {/* 用户信息 */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <User className="w-3 h-3" />
                  <span>{event.user.name}</span>
                </div>

                {/* 详细信息（展开时显示） */}
                {isSelected && event.data && (
                  <div className="mt-2 p-2 bg-background rounded border text-xs space-y-1">
                    {event.data.field && (
                      <div>
                        <span className="text-muted-foreground">字段：</span>
                        <span className="font-medium">{event.data.field}</span>
                      </div>
                    )}
                    {event.data.from !== undefined && event.data.to !== undefined && (
                      <div>
                        <span className="text-muted-foreground">变更：</span>
                        <span className="line-through text-muted-foreground mr-1">
                          {String(event.data.from)}
                        </span>
                        <span className="font-medium">→</span>
                        <span className="ml-1 font-medium text-primary">
                          {String(event.data.to)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

NodeTimeline.displayName = 'NodeTimeline'

export default NodeTimeline
