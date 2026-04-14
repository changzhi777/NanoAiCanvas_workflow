import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ClipboardList,
  Calendar,
  Flag,
  GitBranch,
  Database,
  Rocket,
  CheckCircle2,
  Sparkles,
  Circle,
  Timer,
  Ban,
  Clock,
  MoreHorizontal,
} from 'lucide-react'
import type { NodeData } from '@/types'
import { cn } from '@/lib/utils'
import { useZoomAdaptive } from '@/hooks/useZoomAdaptive'

// Lucide 图标映射
const nodeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  task: ClipboardList,
  event: Calendar,
  milestone: Flag,
  decision: GitBranch,
  data: Database,
  start: Rocket,
  end: CheckCircle2,
  custom: Sparkles,
}

// 状态图标和颜色映射
const statusConfig = {
  not_started: {
    icon: Circle,
    label: '未开始',
    className: 'not-started',
  },
  in_progress: {
    icon: Timer,
    label: '进行中',
    className: 'in-progress',
  },
  completed: {
    icon: CheckCircle2,
    label: '已完成',
    className: 'completed',
  },
  blocked: {
    icon: Ban,
    label: '已阻塞',
    className: 'blocked',
  },
}

interface CardNodeProps extends NodeProps<NodeData> {
  data: NodeData
  selected: boolean
}

const CardNode = memo(({ data, selected }: CardNodeProps) => {
  const { getViewport } = useReactFlow()
  const viewport = getViewport()
  const zoomConfig = useZoomAdaptive(viewport.zoom)
  const [isDragging, setIsDragging] = useState(false)
  const [prevStatus, setPrevStatus] = useState(data.status)
  const [statusChanged, setStatusChanged] = useState(false)
  const [hoverZone, setHoverZone] = useState<string | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  // 设置节点显示比例为50%
  useEffect(() => {
    if (nodeRef.current && !isDragging) {
      nodeRef.current.style.transform = 'scale(0.5)'
    }
  }, [isDragging])

  // 检测状态变化
  useEffect(() => {
    if (prevStatus !== data.status) {
      setStatusChanged(true)

      // 触发状态流转动画
      if (nodeRef.current) {
        // 阶段1：压缩
        nodeRef.current.style.transform = 'scale(0.95)'
        nodeRef.current.style.transition = 'transform 0.15s ease-in'

        // 阶段2：弹性放大
        setTimeout(() => {
          if (nodeRef.current) {
            nodeRef.current.style.transform = 'scale(1.05)'
            nodeRef.current.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }
        }, 150)

        // 阶段3：恢复正常
        setTimeout(() => {
          if (nodeRef.current) {
            nodeRef.current.style.transform = 'scale(1)'
            nodeRef.current.style.transition = 'transform 0.15s ease-out'
          }
        }, 350)
      }

      setPrevStatus(data.status)
      setTimeout(() => setStatusChanged(false), 600)
    }
  }, [data.status, prevStatus])

  // 智能手势反馈：检测鼠标悬停区域
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = nodeRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const threshold = 30 // 边缘阈值

    // 检测悬停区域
    const zone = detectHoverZone(x, y, rect.width, rect.height, threshold)
    setHoverZone(zone)
  }

  const handleMouseLeave = () => {
    setHoverZone(null)
  }

  // 检测悬停区域的辅助函数
  const detectHoverZone = (
    x: number,
    y: number,
    width: number,
    height: number,
    threshold: number
  ): string | null => {
    // 上边缘
    if (y < threshold && x > threshold && x < width - threshold) {
      return 'top'
    }
    // 右边缘
    if (x > width - threshold && y > threshold && y < height - threshold) {
      return 'right'
    }
    // 下边缘
    if (y > height - threshold && x > threshold && x < width - threshold) {
      return 'bottom'
    }
    // 左边缘
    if (x < threshold && y > threshold && y < height - threshold) {
      return 'left'
    }
    return null
  }

  // 计算动态阴影
  const getShadowStyle = (): string => {
    if (isDragging) {
      return `
        0 20px 40px -10px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(168, 70%, 45%, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `
    }

    if (selected) {
      return `
        0 10px 30px -5px rgba(0, 0, 0, 0.4),
        0 0 15px rgba(168, 70%, 45%, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.15)
      `
    }

    return `
      0 4px 12px -2px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string): string => {
    const colors = {
      low: 'hsl(0 0% 60%)',
      medium: 'hsl(45 80% 50%)',
      high: 'hsl(25 80% 50%)',
      critical: 'hsl(0 75% 55%)',
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  // 生成辅助功能标签
  const getAriaLabel = (): string => {
    const typeLabel = {
      task: '任务',
      event: '事件',
      milestone: '里程碑',
      decision: '决策',
      data: '数据',
      start: '开始',
      end: '结束',
      custom: '自定义',
    }[data.type] || '节点'

    const statusLabel = statusInfo?.label || ''

    let label = `${typeLabel}: ${data.label}`

    if (data.description) {
      label += `. ${data.description}`
    }

    if (statusLabel) {
      label += `. 状态: ${statusLabel}`
    }

    if (data.priority) {
      const priorityLabel = {
        low: '低优先级',
        medium: '中优先级',
        high: '高优先级',
        critical: '紧急',
      }[data.priority]
      if (priorityLabel) {
        label += `. 优先级: ${priorityLabel}`
      }
    }

    if (data.stats?.progress !== undefined) {
      label += `. 进度: ${data.stats.progress}%`
    }

    if (selected) {
      label += '. 已选中'
    }

    return label
  }

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        // 进入编辑模式（双击标题）
        const titleElement = nodeRef.current?.querySelector('[data-editable="title"]')
        if (titleElement instanceof HTMLElement) {
          titleElement.focus()
          titleElement.click()
        }
        break

      case ' ':
        e.preventDefault()
        // 切换选中状态（需要通过 Redux dispatch）
        break

      case 'Delete':
      case 'Backspace':
        if (selected) {
          e.preventDefault()
          // 删除节点（需要通过 Redux dispatch）
          console.log('Delete node:', data.id)
        }
        break

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // 方向键导航（在节点间移动焦点）
        if (!e.ctrlKey && !e.metaKey) {
          // e.preventDefault() // 不阻止默认行为，让ReactFlow处理
          // 这里可以添加自定义导航逻辑
        }
        break

      case 'Escape':
        // 退出编辑模式或取消选中
        e.preventDefault()
        nodeRef.current?.blur()
        break

      case 'c':
        if ((e.ctrlKey || e.metaKey) && selected) {
          e.preventDefault()
          // 复制节点
          console.log('Copy node:', data.id)
        }
        break

      case 'v':
        if ((e.ctrlKey || e.metaKey) && selected) {
          e.preventDefault()
          // 粘贴节点
          console.log('Paste node')
        }
        break
    }
  }

  // 拖拽事件处理
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const NodeIcon = nodeIconMap[data.type] || Sparkles
  const StatusIcon = statusConfig[data.status]?.icon || Circle
  const statusInfo = statusConfig[data.status]

  return (
    <div
      ref={nodeRef}
      className={cn(
        'card-node node-appear',
        `node-${data.type}`,
        selected && 'selected',
        isDragging && 'dragging'
      )}
      style={{
        background: data.color
          ? `${data.color}20`
          : 'hsl(var(--card) / 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: getShadowStyle(),
      }}
      tabIndex={0}
      role="article"
      aria-label={getAriaLabel()}
      aria-describedby={data.description ? `desc-${data.id}` : undefined}
      aria-selected={selected}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 优先级指示器（左侧彩色条） */}
      {data.priority && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 z-10"
          style={{
            background: getPriorityColor(data.priority),
            boxShadow: data.priority === 'critical'
              ? '0 0 10px currentColor'
              : undefined,
            animation: data.priority === 'critical' ? 'priority-pulse 2s infinite' : undefined,
          }}
        />
      )}

      {/* 节点类型彩色条纹 */}
      <div className="node-type-strip" />

      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!bg-primary !border-primary transition-all duration-200",
          hoverZone === 'top' && "!scale-150 !shadow-[0_0_12px_var(--primary)]"
        )}
      />

      {/* 悬停区域提示 */}
      {hoverZone === 'top' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary opacity-80 animate-pulse pointer-events-none" />
      )}
      {hoverZone === 'right' && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary opacity-80 animate-pulse pointer-events-none" />
      )}
      {hoverZone === 'bottom' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary opacity-80 animate-pulse pointer-events-none" />
      )}
      {hoverZone === 'left' && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary opacity-80 animate-pulse pointer-events-none" />
      )}

      {/* 卡片内容 */}
      <div
        className="space-y-2"
        style={{
          padding: `${zoomConfig.padding}px`,
        }}
      >
        {/* 头部：图标 + 标题 + 状态 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {zoomConfig.showIcon && (
              <NodeIcon className="w-5 h-5 text-primary flex-shrink-0" />
            )}
            {zoomConfig.showTitle && (
              <h3
                data-editable="title"
                className="font-semibold text-foreground truncate cursor-text"
                style={{
                  fontSize: `${zoomConfig.fontSize}px`,
                }}
                tabIndex={-1}
              >
                {data.label}
              </h3>
            )}
          </div>

          {/* 状态胶囊 */}
          {zoomConfig.showStatus && (
            <Badge
              variant="default"
              className={cn(
                'status-badge',
                statusInfo?.className,
                statusChanged && 'changed'
              )}
            >
              <StatusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{statusInfo?.label}</span>
            </Badge>
          )}
        </div>

        {zoomConfig.showDescription && (
          <>
            {/* 分隔线 */}
            <Separator className="my-2" />

            {/* 描述 */}
            {data.description && (
              <p
                id={`desc-${data.id}`}
                className={cn(
                  'text-muted-foreground animate-content',
                  zoomConfig.descriptionMaxLines > 0
                    ? `line-clamp-${zoomConfig.descriptionMaxLines}`
                    : 'line-clamp-2'
                )}
                style={{
                  fontSize: `${zoomConfig.fontSize * 0.85}px`,
                }}
              >
                {data.description}
              </p>
            )}
          </>
        )}

        {/* 底部：标签 + 元数据 */}
        {(zoomConfig.showTags || zoomConfig.showMetadata) &&
        ((data.tags && data.tags.length > 0) ||
          (data.metadata && Object.keys(data.metadata).length > 0) ||
          (data.stats && zoomConfig.fontSize >= 14)) ? (
          <div
            className="flex items-center justify-between gap-2"
            style={{
              fontSize: `${zoomConfig.fontSize * 0.75}px`,
            }}
          >
            {/* 标签列表 */}
            {zoomConfig.showTags && data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 flex-1">
                {data.tags.slice(0, 2).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-[10px] font-medium px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
                {data.tags.length > 2 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium px-1.5 py-0"
                  >
                    +{data.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* 元数据 */}
            {zoomConfig.showMetadata &&
              data.metadata &&
              Object.keys(data.metadata).length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                  {Object.entries(data.metadata)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <span key={key} className="flex items-center gap-1">
                        {key === 'duration' && <Clock className="w-3 h-3" />}
                        {key === 'deadline' && <Calendar className="w-3 h-3" />}
                        {key === 'priority' && <MoreHorizontal className="w-3 h-3" />}
                        {String(value)}
                      </span>
                    ))}
                </div>
              )}
          </div>
        ) : null}

        {/* 统计仪表盘（仅在大缩放时显示） */}
        {data.stats && zoomConfig.fontSize >= 14 && (
          <div className="pt-2 border-t border-border/50 space-y-1.5">
            {/* 进度条 */}
            {data.stats.progress !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${data.stats.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground min-w-[30px]">
                  {data.stats.progress}%
                </span>
              </div>
            )}

            {/* 子任务和时间 */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              {/* 子任务完成度 */}
              {data.stats.totalTasks !== undefined &&
                data.stats.completedTasks !== undefined && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {data.stats.completedTasks}/{data.stats.totalTasks}
                  </span>
                )}

              {/* 时间消耗 */}
              {data.stats.timeSpent !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {data.stats.timeSpent}h
                </span>
              )}
            </div>

            {/* 迷你趋势图 */}
            {data.stats?.trend && data.stats.trend.length > 0 && (
              <svg
                className="w-full h-4"
                viewBox="0 0 60 20"
                preserveAspectRatio="none"
              >
                <polyline
                  points={data.stats.trend
                    .map((v, i, arr) => `${i * (60 / (arr.length - 1))},${20 - v * 0.2}`)
                    .join(' ')}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!bg-primary !border-primary transition-all duration-200",
          hoverZone === 'bottom' && "!scale-150 !shadow-[0_0_12px_var(--primary)]"
        )}
      />
    </div>
  )
})

CardNode.displayName = 'CardNode'

export default CardNode
