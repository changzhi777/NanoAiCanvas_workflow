import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/store/hooks'
import { selectSelectedNodes } from '@/store/slices/uiSlice'
import { selectNodes } from '@/store/slices/canvasSlice'
import { useI18n } from '@/hooks/useI18n'
import type { NodeData, NodeStatus } from '@/types'
import { cn } from '@/lib/utils'

// 节点图标映射
const nodeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  task: () => '📋',
  event: () => '📅',
  milestone: () => '🏁',
  decision: () => '🔀',
  data: () => '💾',
  start: () => '🚀',
  end: () => '✅',
  custom: () => '✨',
}

export default function PropertiesPanel() {
  const { t } = useI18n()
  const selectedNodes = useAppSelector(selectSelectedNodes)
  const allNodes = useAppSelector(selectNodes)
  const [editing, setEditing] = useState(false)
  const [nodeData, setNodeData] = useState<Partial<NodeData>>({})
  const [isCollapsed, setIsCollapsed] = useState(true) // 默认折叠
  const [isHovering, setIsHovering] = useState(false)

  const selectedNodeId = selectedNodes[0]
  const hasSelection = selectedNodeId !== undefined

  // 获取当前选中节点的完整数据
  const currentNode = allNodes.find((node: { id: string }) => node.id === selectedNodeId)

  // 同步节点数据到本地状态
  useEffect(() => {
    if (currentNode) {
      setNodeData(currentNode.data)
      // 选中节点时自动展开面板
      setIsCollapsed(false)
      setEditing(false)
    }
  }, [currentNode])

  // 切换折叠状态
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  const handleSave = () => {
    // TODO: 保存节点数据
    setEditing(false)
  }

  const handleDelete = () => {
    // TODO: 删除节点
  }

  // 折叠状态：显示折叠条（默认状态，始终显示）
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-40 flex',
          'transition-transform-base duration-325 ease-in-out'
        )}
      >
        {/* 边缘触发区域（鼠标移入自动展开） */}
        <div
          onMouseEnter={() => {
            if (!hasSelection) {
              // 没有选中节点时，鼠标移入边缘也展开预览
              setIsHovering(true)
            }
          }}
          onMouseLeave={() => {
            setIsHovering(false)
          }}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4', // 4px触发区域
            'cursor-pointer', // 显示可点击
          )}
          onClick={() => {
            // 点击边缘触发区域展开面板
            setIsCollapsed(false)
          }}
        />

        {/* 折叠条 */}
        <div
          className={cn(
            'w-16 h-full',
            'glass',
            'border-l border-y rounded-l-lg shadow-lg hover:shadow-xl',
            'transition-base transition-transform-base',
            'animate-in slide-in-from-right-2 duration-325',
            // 鼠标悬停时变宽
            isHovering && 'w-20'
          )}
        >
          <div className="flex flex-col items-center justify-center h-full py-4 space-y-3">
            {/* 展开/收起按钮 */}
            <button
              onClick={handleToggleCollapse}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className={cn(
                'w-11 h-11 xs:w-8 xs:h-8 rounded-full', // 移动端44px，桌面端32px
                'glass-subtle',
                'border border-border',
                'flex items-center justify-center',
                'transition-base transition-transform-base',
                'hover:scale-110 hover:bg-primary hover:border-primary',
                'hover:text-primary-foreground',
                'hover:shadow-md',
                'focus-ring-base cursor-pointer'
              )}
              aria-label="展开属性面板"
              title="展开属性面板（快捷键: F1）"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground hover:text-primary-foreground transition-colors" />
            </button>

            {/* 如果没有选中节点，显示提示 */}
            {!hasSelection && (
              <>
                {/* 提示图标 */}
                <div className="flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* 提示文字 */}
                <div className="px-2 text-center">
                  <p className="text-xs text-muted-foreground leading-tight">
                    属性
                  </p>
                </div>
              </>
            )}

            {/* 如果有选中节点，显示节点信息 */}
            {hasSelection && currentNode && (() => {
              const NodeIcon = nodeIconMap[currentNode.data.type] || nodeIconMap.task
              return (
                <>
                  {/* 节点图标 */}
                  <div className="flex items-center justify-center">
                    <NodeIcon className="text-2xl" />
                  </div>

                  {/* 节点标题 */}
                  <div className="px-2">
                    <p className="text-xs font-medium text-foreground line-clamp-2 text-center">
                      {currentNode.data.label || '未命名节点'}
                    </p>
                  </div>

                  {/* 节点状态 */}
                  {currentNode.data.status && (
                    <div className="px-2">
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', currentNode.data.status === 'completed' && 'bg-green-500/20 text-green-500')}
                      >
                        {t(`status.${currentNode.data.status}`)}
                      </Badge>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      </div>
    )
  }

  // 展开状态：显示完整内容
  return (
    <div
      className={cn(
        'fixed right-0 top-0 bottom-0 z-40 flex flex-col',
        'w-full xs:w-64 h-full', // 移动端全宽，小屏以上256px
        'glass',
        'border-l',
        // 添加进场动画 - 从右侧滑入
        'animate-in slide-in-from-right-4 duration-325 ease-in-out'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border/70 p-4">
        <h2 className="font-semibold text-foreground">{t('panel.properties')}</h2>
        <div className="flex gap-1">
          {/* 展开/收起按钮 */}
          <button
            onClick={handleToggleCollapse}
            className={cn(
              'w-11 h-11 xs:w-6 xs:h-6 rounded', // 移动端44px
              'glass-subtle',
              'border border-border/70',
              'flex items-center justify-center',
              'transition-base transition-transform-base',
              'hover:scale-110 hover:bg-card',
              'focus-ring-base cursor-pointer'
            )}
            aria-label="收起属性面板"
            title="收起属性面板（快捷键: F1）"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* 编辑按钮 */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditing(!editing)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>

          {/* 删除按钮 */}
          <Button variant="ghost" size="icon-xs" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 属性内容 */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="space-y-4">
          {/* 节点 ID */}
          <div>
            <Label className="text-xs text-muted-foreground">ID</Label>
            <p className="text-sm font-mono text-foreground/90">{selectedNodeId}</p>
          </div>

          {/* 节点标题 */}
          <div>
            <Label htmlFor="label">标题</Label>
            {editing ? (
              <Input
                id="label"
                value={nodeData.label || ''}
                onChange={(e) =>
                  setNodeData({ ...nodeData, label: e.target.value })
                }
                placeholder="输入标题"
              />
            ) : (
              <p className="text-sm text-foreground/90">{nodeData.label || '未命名节点'}</p>
            )}
          </div>

          {/* 节点描述 */}
          <div>
            <Label htmlFor="description">描述</Label>
            {editing ? (
              <Input
                id="description"
                value={nodeData.description || ''}
                onChange={(e) =>
                  setNodeData({ ...nodeData, description: e.target.value })
                }
                placeholder="输入描述"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {nodeData.description || '无描述'}
              </p>
            )}
          </div>

          {/* 节点状态 */}
          <div>
            <Label>状态</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['not_started', 'in_progress', 'completed', 'blocked'] as NodeStatus[]).map(
                (status) => (
                  <Badge
                    key={status}
                    variant={nodeData.status === status ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      editing && setNodeData({ ...nodeData, status })
                    }
                  >
                    {t(`status.${status}`)}
                  </Badge>
                ),
              )}
            </div>
          </div>

          {/* 节点类型 */}
          <div>
            <Label>类型</Label>
            <p className="mt-1 text-sm">
              <Badge variant="secondary">
                {t(`nodes.${nodeData.type || 'task'}`)}
              </Badge>
            </p>
          </div>

          {/* 节点标签 */}
          {nodeData.tags && nodeData.tags.length > 0 && (
            <div>
              <Label>标签</Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {nodeData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 元数据 */}
          {nodeData.metadata && Object.keys(nodeData.metadata).length > 0 && (
            <div>
              <Label>元数据</Label>
              <div className="mt-2 space-y-1">
                {Object.entries(nodeData.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-xs text-muted-foreground/80"
                  >
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间戳 */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="flex justify-between text-xs text-muted-foreground/80">
              <span>创建时间:</span>
              <span>
                {nodeData.createdAt
                  ? new Date(nodeData.createdAt).toLocaleString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground/80">
              <span>更新时间:</span>
              <span>
                {nodeData.updatedAt
                  ? new Date(nodeData.updatedAt).toLocaleString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      {editing && (
        <div className="border-t border-border/50 p-4">
          <Button
            className="w-full"
            size="sm"
            onClick={handleSave}
          >
            {t('common.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
