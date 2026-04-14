import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppDispatch } from '@/store/hooks'
import { addNodeAsync } from '@/store/slices/canvasSlice'
import { useReactFlow } from 'reactflow'
import { useI18n } from '@/hooks/useI18n'
import type { NodeData, NodeType } from '@/types'
import { generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'

// 节点模板配置
const nodeTemplates: Array<{
  type: NodeType
  icon: string
  label: string
  description: string
  color: string
}> = [
  {
    type: 'task',
    icon: '📋',
    label: 'nodes.task',
    description: '任务节点',
    color: '#3b82f6',
  },
  {
    type: 'event',
    icon: '📅',
    label: 'nodes.event',
    description: '事件节点',
    color: '#8b5cf6',
  },
  {
    type: 'milestone',
    icon: '🏁',
    label: 'nodes.milestone',
    description: '里程碑节点',
    color: '#f59e0b',
  },
  {
    type: 'decision',
    icon: '🔀',
    label: 'nodes.decision',
    description: '决策节点',
    color: '#ec4899',
  },
  {
    type: 'data',
    icon: '💾',
    label: 'nodes.data',
    description: '数据节点',
    color: '#10b981',
  },
  {
    type: 'start',
    icon: '🚀',
    label: 'nodes.start',
    description: '开始节点',
    color: '#22c55e',
  },
  {
    type: 'end',
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

  return (
    <div className="flex h-64 w-64 flex-col border-r border-border bg-card">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{t('panel.templates')}</h2>
        <Button variant="ghost" size="icon-xs">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="grid grid-cols-1 gap-3">
          {nodeTemplates.map((template) => (
            <Card
              key={template.type}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleCreateNode(template.type)}
            >
              <div className="flex items-start gap-3 p-3">
                {/* 图标 */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-xl">
                  {template.icon}
                </div>

                {/* 信息 */}
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-semibold">
                    {t(template.label)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 自定义节点按钮 */}
        <Card
          className="mt-4 cursor-pointer border-dashed transition-all hover:border-primary hover:shadow-md"
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
      </div>
    </div>
  )
}
