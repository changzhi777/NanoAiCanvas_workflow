import { useCallback, useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppDispatch } from '@/store/hooks'
import { addNodeAsync } from '@/store/slices/canvasSlice'
import { useReactFlow } from 'reactflow'
import { useI18n } from '@/hooks/useI18n'
import type { NodeData } from '@/types'
import { NodeType } from '@/types'
import { generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { StaggeredList, FadeIn } from '@/components/animations'

// 节点模板配置
const nodeTemplates: Array<{
  type: NodeType
  icon: string
  label: string
  description: string
  color: string
}> = [
  {
    type: NodeType.TASK,
    icon: '📋',
    label: 'nodes.task',
    description: '任务节点',
    color: '#3b82f6',
  },
  {
    type: NodeType.EVENT,
    icon: '📅',
    label: 'nodes.event',
    description: '事件节点',
    color: '#8b5cf6',
  },
  {
    type: NodeType.MILESTONE,
    icon: '🏁',
    label: 'nodes.milestone',
    description: '里程碑节点',
    color: '#f59e0b',
  },
  {
    type: NodeType.DECISION,
    icon: '🔀',
    label: 'nodes.decision',
    description: '决策节点',
    color: '#ec4899',
  },
  {
    type: NodeType.DATA,
    icon: '💾',
    label: 'nodes.data',
    description: '数据节点',
    color: '#10b981',
  },
  {
    type: NodeType.START,
    icon: '🚀',
    label: 'nodes.start',
    description: '开始节点',
    color: '#22c55e',
  },
  {
    type: NodeType.END,
    icon: '🏁',
    label: 'nodes.end',
    description: '结束节点',
    color: '#ef4444',
  },
]

export default function NodeTemplatesPanel() {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { getViewport } = useReactFlow()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // 进场动画
  useEffect(() => {
    // 组件挂载时触发动画
  }, [])

  // 创建新节点
  const handleCreateNode = useCallback(
    (type: NodeType) => {
      const viewport = getViewport()
      const newNode = {
        id: generateId(type),
        type: 'card' as const,
        position: {
          x: -viewport.x + 100 + Math.random() * 200,
          y: -viewport.y + 100 + Math.random() * 200,
        },
        data: {
          id: generateId(type),
          type,
          label: t(`nodes.${type}`),
          description: `新建${t(`nodes.${type}`)}`,
          status: 'not_started' as const,
          color: nodeTemplates.find((t) => t.type === type)?.color,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as NodeData,
      }
      dispatch(addNodeAsync(newNode))
    },
    [dispatch, getViewport, t],
  )

  // 切换折叠状态
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  // 面板收起时只显示折叠按钮
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex items-center',
          'transition-transform-base duration-325 ease-in-out'
        )}
      >
        {/* 折叠按钮贴附在左边缘 */}
        <button
          onClick={handleToggleCollapse}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={cn(
            'relative right-0 w-11 h-16 xs:w-8 xs:h-16', // 移动端44px宽
            'glass',
            'border border-r border-y rounded-r-lg shadow-lg hover:shadow-xl',
            'transition-base transition-transform-base',
            'hover:w-10 xs:hover:w-10 glass-hover',
            'flex items-center justify-center',
            'group cursor-pointer focus-ring-base'
          )}
          aria-label="展开模板面板"
          title="展开模板面板（快捷键: F2）"
        >
          <ChevronRight
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-300',
              isHovering && 'scale-110'
            )}
          />
        </button>
      </div>
    )
  }

  // 面板展开时显示完整内容
  return (
    <div
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
        'w-full xs:w-64 transition-transform-base duration-325 ease-in-out', // 移动端全宽
        'glass',
        'border-r panel-slide-left'
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border/70 p-4">
        <h2 className="font-semibold text-foreground">{t('panel.templates')}</h2>
        <Button variant="ghost" size="icon-xs">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <StaggeredList staggerDelay={0.03} className="grid grid-cols-1 gap-3">
          {nodeTemplates.map((template) => (
            <Card
              key={template.type}
              className={cn(
                'cursor-pointer transition-base transition-shadow-base hover:border-primary hover:shadow-lg',
                'glass-subtle',
                'glass-hover'
              )}
              onClick={() => handleCreateNode(template.type)}
            >
              <div className="flex items-start gap-3 p-3 xs:p-4">
                {/* 图标 */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-xl">
                  {template.icon}
                </div>

                {/* 信息 */}
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(template.label)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </StaggeredList>

        {/* 自定义节点按钮 */}
        <FadeIn delay={0.3}>
          <Card
            className={cn(
              'mt-4 cursor-pointer border-dashed transition-base transition-shadow-base hover:border-primary hover:shadow-lg',
              'glass-subtle',
              'glass-hover'
            )}
            onClick={() => {
              /* TODO: 打开自定义节点对话框 */
            }}
          >
          <div className="flex items-center justify-center gap-2 p-4">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              自定义节点类型
            </span>
          </div>
          </Card>
        </FadeIn>
      </div>

      {/* 底部折叠按钮 */}
      <div className="flex items-center justify-center border-t border-border/50 p-3">
        <button
          onClick={handleToggleCollapse}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={cn(
            'w-11 h-11 xs:w-8 xs:h-8 rounded-full', // 移动端44px
            'glass-subtle',
            'border border-border',
            'flex items-center justify-center',
            'transition-base transition-transform-base',
            'hover:scale-110 hover:bg-primary hover:border-primary',
            'hover:text-primary-foreground',
            'hover:shadow-md',
            'group cursor-pointer focus-ring-base',
            isHovering && 'scale-105'
          )}
          aria-label="收起模板面板"
          title="收起模板面板（快捷键: F2）"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        </button>
      </div>
    </div>
  )
}
