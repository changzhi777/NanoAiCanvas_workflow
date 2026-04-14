import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { NodeData } from '@/types'
import { cn } from '@/lib/utils'

// 节点状态颜色映射
const statusColors = {
  not_started: 'bg-muted-foreground',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  blocked: 'bg-red-500',
}

// 节点类型图标映射
const nodeIcons: Record<string, string> = {
  task: '📋',
  event: '📅',
  milestone: '🏁',
  decision: '🔀',
  data: '💾',
  start: '🚀',
  end: '🏁',
  custom: '⭐',
}

const CardNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  return (
    <Card
      className={cn(
        'min-w-[200px] max-w-[300px] rounded-lg border-2 transition-all',
        selected ? 'border-primary shadow-lg' : 'border-border',
      )}
      style={{
        backgroundColor: data.color || 'hsl(var(--card))',
      }}
    >
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary"
      />

      {/* 节点内容 */}
      <div className="space-y-2 p-4">
        {/* 节点头部 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{nodeIcons[data.type] || '⭐'}</span>
            <h3 className="font-semibold text-sm text-foreground">
              {data.label}
            </h3>
          </div>
          {/* 状态指示器 */}
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              statusColors[data.status] || statusColors.not_started,
            )}
          />
        </div>

        {/* 描述 */}
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}

        {/* 标签 */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 元数据 */}
        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div className="text-xs text-muted-foreground">
            {Object.entries(data.metadata).map(([key, value]) => (
              <div key={key}>
                {key}: {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary"
      />
    </Card>
  )
})

CardNode.displayName = 'CardNode'

export default CardNode
