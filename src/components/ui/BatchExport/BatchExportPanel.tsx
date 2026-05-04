'use client'

import { useState, useCallback } from 'react'
import { Download, FolderArchive, Image, Film, Check, FileArchive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BatchExportItem {
  id: string
  name: string
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail?: string
  size?: number
  status: 'pending' | 'exporting' | 'completed' | 'error'
}

interface BatchExportProps {
  items: BatchExportItem[]
  onExportAll: (format: 'zip' | 'folder') => void
  onExportSelected: (ids: string[], format: 'zip' | 'folder') => void
  maxItems?: number
}

export function BatchExportPanel({
  items,
  onExportAll,
  onExportSelected,
  maxItems = 100,
}: BatchExportProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [exportFormat, setExportFormat] = useState<'zip' | 'folder'>('folder')

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
    setSelectAll(!selectAll)
  }

  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) {
      onExportAll(exportFormat)
    } else {
      onExportSelected(Array.from(selectedIds), exportFormat)
    }
  }, [selectedIds, exportFormat, onExportAll, onExportSelected])

  const selectedCount = selectedIds.size || items.length
  const hasItems = items.length > 0

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderArchive className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">批量导出</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length} 个项目
        </span>
      </div>

      {/* 全选控制 */}
      {hasItems && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <button
            onClick={toggleSelectAll}
            className={cn(
              "w-5 h-5 rounded border flex items-center justify-center transition-colors",
              selectAll || selectedIds.size === items.length
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground hover:border-primary"
            )}
          >
            {(selectAll || selectedIds.size === items.length) && <Check className="w-3 h-3" />}
          </button>
          <span className="text-sm flex-1">
            {selectedIds.size === items.length ? '取消全选' : '全选'}
          </span>
          <span className="text-xs text-muted-foreground">
            已选择 {selectedIds.size || items.length} 项
          </span>
        </div>
      )}

      {/* 导出格式选择 */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">导出格式</label>
        <div className="flex gap-2">
          <Button
            variant={exportFormat === 'folder' ? 'secondary' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setExportFormat('folder')}
          >
            <FolderArchive className="w-3 h-3 mr-1" />
            文件夹
          </Button>
          <Button
            variant={exportFormat === 'zip' ? 'secondary' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setExportFormat('zip')}
          >
            <FileArchive className="w-3 h-3 mr-1" />
            ZIP压缩
          </Button>
        </div>
      </div>

      {/* 项目列表预览 */}
      {hasItems && (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {items.slice(0, 5).map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded bg-muted/30"
            >
              <button
                onClick={() => toggleSelect(item.id)}
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                  selectedIds.has(item.id)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground hover:border-primary"
                )}
              >
                {selectedIds.has(item.id) && <Check className="w-2 h-2" />}
              </button>
              <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                item.type === 'image' ? "bg-blue-500/20 text-blue-400" :
                item.type === 'video' ? "bg-purple-500/20 text-purple-400" :
                "bg-green-500/20 text-green-400"
              )}>
                {item.type === 'image' ? <Image className="w-4 h-4" /> :
                 item.type === 'video' ? <Film className="w-4 h-4" /> :
                 <Download className="w-4 h-4" />}
              </div>
              <span className="text-xs truncate flex-1">{item.name}</span>
            </div>
          ))}
          {items.length > 5 && (
            <div className="text-center text-xs text-muted-foreground py-1">
              还有 {items.length - 5} 个项目...
            </div>
          )}
        </div>
      )}

      {/* 导出按钮 */}
      <Button
        onClick={handleExport}
        disabled={!hasItems}
        className="w-full"
        size="sm"
      >
        <Download className="w-3 h-3 mr-1" />
        导出 {selectedCount} 个项目
        {exportFormat === 'zip' ? ' (ZIP)' : ''}
      </Button>

      {/* 提示信息 */}
      {hasItems && exportFormat === 'zip' && selectedCount > maxItems && (
        <div className="text-xs text-muted-foreground text-center">
          超过 {maxItems} 个项目，建议使用文件夹导出
        </div>
      )}
    </div>
  )
}

export default BatchExportPanel