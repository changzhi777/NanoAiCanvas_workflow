import { useState } from 'react'
import { X, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/store/hooks'
import { selectSelectedNodes } from '@/store/slices/uiSlice'
import { useI18n } from '@/hooks/useI18n'
import type { NodeData, NodeStatus } from '@/types'
import { cn } from '@/lib/utils'

export default function PropertiesPanel() {
  const { t } = useI18n()
  const selectedNodes = useAppSelector(selectSelectedNodes)
  const [editing, setEditing] = useState(false)
  const [nodeData, setNodeData] = useState<Partial<NodeData>>({})

  const selectedNodeId = selectedNodes[0]
  const hasSelection = selectedNodeId !== undefined

  if (!hasSelection) {
    return (
      <div className="flex h-full w-64 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">{t('panel.properties')}</h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            选择一个节点以查看属性
          </p>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    // TODO: 保存节点数据
    setEditing(false)
  }

  const handleDelete = () => {
    // TODO: 删除节点
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-border bg-card">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{t('panel.properties')}</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditing(!editing)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
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
            <p className="text-sm font-mono">{selectedNodeId}</p>
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
              <p className="text-sm">{nodeData.label || '未命名节点'}</p>
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
                    className="flex justify-between text-xs text-muted-foreground"
                  >
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间戳 */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>创建时间:</span>
              <span>
                {nodeData.createdAt
                  ? new Date(nodeData.createdAt).toLocaleString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
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
        <div className="border-t border-border p-4">
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
