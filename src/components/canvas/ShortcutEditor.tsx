/**
 * 快捷键编辑器组件
 * 面板内嵌式，支持虚拟键盘和冲突检测
 */

import { useState, useCallback, useMemo } from 'react'
import { AlertTriangle, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import VirtualKeyboard from './VirtualKeyboard'
import { cn } from '@/lib/utils'
import type { ShortcutConfig, ShortcutConflict } from '@/types/shortcuts'
import {
  SYSTEM_RESERVED_KEYS,
  BROWSER_CONFLICT_KEYS,
  getSuggestedAlternates,
} from '@/config/shortcuts'

interface ShortcutEditorProps {
  shortcuts: ShortcutConfig[]
  onSave: (shortcuts: ShortcutConfig[]) => void
  onCancel: () => void
}

// 检测快捷键冲突
function detectConflict(
  keys: string[],
  allShortcuts: ShortcutConfig[],
  currentId?: string
): ShortcutConflict | undefined {
  // 检查系统保留键
  for (const reserved of SYSTEM_RESERVED_KEYS) {
    if (JSON.stringify(reserved) === JSON.stringify(keys)) {
      return {
        type: 'system',
        shortcut: reserved,
        description: '这是系统保留快捷键，无法覆盖',
      }
    }
  }

  // 检查浏览器冲突
  for (const browserKey of BROWSER_CONFLICT_KEYS) {
    if (JSON.stringify(browserKey) === JSON.stringify(keys)) {
      return {
        type: 'browser',
        shortcut: browserKey,
        description: '这是浏览器快捷键，覆盖后可能影响浏览器功能',
      }
    }
  }

  // 检查自定义冲突
  const conflict = allShortcuts.find((s) => {
    if (s.id === currentId) return false
    return JSON.stringify(s.currentKeys) === JSON.stringify(keys)
  })

  if (conflict) {
    return {
      type: 'custom',
      shortcut: conflict.currentKeys,
      description: `与「${conflict.description}」冲突`,
      suggestion: getSuggestedAlternates(keys)[0],
    }
  }

  return undefined
}

export default function ShortcutEditor({
  shortcuts,
  onSave,
  onCancel,
}: ShortcutEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingKeys, setEditingKeys] = useState<string[]>([])
  const [modifiedShortcuts, setModifiedShortcuts] = useState<ShortcutConfig[]>(shortcuts)

  // 开始编辑
  const handleStartEdit = useCallback((shortcut: ShortcutConfig) => {
    setEditingId(shortcut.id)
    setEditingKeys([...shortcut.currentKeys])
  }, [])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingKeys([])
  }, [])

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (!editingId) return

    setModifiedShortcuts((prev) =>
      prev.map((s) =>
        s.id === editingId ? { ...s, currentKeys: editingKeys } : s
      )
    )
    setEditingId(null)
    setEditingKeys([])
  }, [editingId, editingKeys])

  // 重置为默认
  const handleResetToDefault = useCallback((shortcutId: string) => {
    setModifiedShortcuts((prev) =>
      prev.map((s) =>
        s.id === shortcutId
          ? { ...s, currentKeys: s.defaultKeys, conflict: undefined }
          : s
      )
    )
  }, [])

  // 全部重置
  const handleResetAll = useCallback(() => {
    setModifiedShortcuts((prev) =>
      prev.map((s) => ({
        ...s,
        currentKeys: s.defaultKeys,
        conflict: undefined,
      }))
    )
  }, [])

  // 检测冲突
  const conflict = useMemo(() => {
    if (!editingId || editingKeys.length === 0) return undefined
    return detectConflict(editingKeys, modifiedShortcuts, editingId)
  }, [editingId, editingKeys, modifiedShortcuts])

  // 保存所有修改
  const handleSaveAll = useCallback(() => {
    onSave(modifiedShortcuts)
  }, [modifiedShortcuts, onSave])

  // 统计修改数量
  const modifiedCount = useMemo(() => {
    return modifiedShortcuts.filter(
      (s) => JSON.stringify(s.currentKeys) !== JSON.stringify(s.defaultKeys)
    ).length
  }, [modifiedShortcuts])

  // 渲染快捷键组合
  const renderKeyCombo = (keys: string[], className?: string) => (
    <div className={cn('flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <div key={index} className="flex items-center">
          <kbd className="px-2 py-1 text-xs font-semibold rounded-full bg-background border shadow-sm">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="mx-1 text-xs font-medium text-muted-foreground">+</span>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">自定义快捷键</h3>
          {modifiedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {modifiedCount} 项修改
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {modifiedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              重置全部
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* 快捷键列表 */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {modifiedShortcuts.map((shortcut) => {
          const isEditing = editingId === shortcut.id
          const isModified =
            JSON.stringify(shortcut.currentKeys) !==
            JSON.stringify(shortcut.defaultKeys)

          return (
            <div
              key={shortcut.id}
              className={cn(
                'relative p-3 rounded-lg border transition-all',
                isEditing
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-border/80',
                conflict && isEditing && 'border-destructive bg-destructive/5'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* 左侧：描述和按键 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{shortcut.description}</p>
                    {shortcut.important && (
                      <Badge variant="outline" className="text-[10px]">
                        常用
                      </Badge>
                    )}
                    {isModified && !isEditing && (
                      <Badge variant="secondary" className="text-[10px]">
                        已修改
                      </Badge>
                    )}
                  </div>

                  {isEditing ? (
                    <>
                      {/* 编辑模式：显示虚拟键盘 */}
                      <VirtualKeyboard
                        value={editingKeys}
                        onChange={setEditingKeys}
                        maxKeys={4}
                        onConflict={(keys) =>
                          !!detectConflict(keys, modifiedShortcuts, shortcut.id)
                        }
                      />

                      {/* 冲突警告 */}
                      {conflict && (
                        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="flex-1 text-xs">
                            <p className="font-medium text-destructive">
                              {conflict.type === 'system' && '系统保留快捷键'}
                              {conflict.type === 'browser' && '浏览器快捷键'}
                              {conflict.type === 'custom' && '快捷键冲突'}
                            </p>
                            <p className="text-muted-foreground mt-1">
                              {conflict.description}
                            </p>
                            {conflict.suggestion && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-muted-foreground">建议：</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                                                  onClick={() => setEditingKeys(conflict.suggestion!)}
                                >
                                  {renderKeyCombo(conflict.suggestion, 'text-[10px]')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 编辑操作按钮 */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={editingKeys.length === 0 || !!conflict}
                          className="flex-1"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          确定
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="flex-1"
                        >
                          取消
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 查看模式：显示当前快捷键 */}
                      <div className="group relative">
                        {renderKeyCombo(shortcut.currentKeys)}

                        {/* 悬停显示默认值 */}
                        {isModified && (
                          <div className="absolute -top-1 left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="px-2 py-1 bg-popover border rounded-md shadow-lg text-xs whitespace-nowrap">
                              <span className="text-muted-foreground">默认：</span>
                              {shortcut.defaultKeys.join(' + ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 右侧：操作按钮 */}
                {!isEditing && (
                  <div className="flex gap-1">
                    {isModified && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleResetToDefault(shortcut.id)}
                        title="重置为默认"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(shortcut)}
                      className="text-xs"
                    >
                      编辑
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={editingId !== null}
        >
          取消
        </Button>
        <Button
          onClick={handleSaveAll}
          className="flex-1"
          disabled={editingId !== null || modifiedCount === 0}
        >
          保存修改 ({modifiedCount})
        </Button>
      </div>
    </div>
  )
}
