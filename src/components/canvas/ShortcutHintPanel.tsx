/**
 * 快捷键提示面板 - 增强版
 * 集成自定义编辑、成就系统、首次引导
 */

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Search, Keyboard, X, Edit, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import ShortcutEditor from './ShortcutEditor'
import AchievementSystem from './AchievementSystem'
import FirstTimeGuide from './FirstTimeGuide'
import { useShortcutSystem } from '@/hooks/useShortcutSystem'
import type { ShortcutConfig } from '@/types/shortcuts'

interface ShortcutHintPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutHintPanel({
  open,
  onOpenChange,
}: ShortcutHintPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)

  // 使用快捷键系统（禁用全局监听，避免与旧的 useShortcuts 冲突）
  const {
    shortcuts,
    stats,
    userStats,
    showGuide,
    completeGuide,
    startEditing,
    stopEditing,
    saveShortcuts,
  } = useShortcutSystem({
    disableGlobalListener: true, // 禁用全局监听
    onShortcutTrigger: (shortcutId) => {
      console.log('快捷键触发:', shortcutId)
      // 这里可以添加其他逻辑
    },
  })

  // 过滤快捷键
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return shortcuts
    }

    const query = searchQuery.toLowerCase()

    return shortcuts
      .map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter(
          (shortcut) =>
            shortcut.description.toLowerCase().includes(query) ||
            shortcut.currentKeys.some((k) => k.toLowerCase().includes(query))
        ),
      }))
      .filter((category) => category.shortcuts.length > 0)
  }, [shortcuts, searchQuery])

  // 切换搜索框
  const toggleSearch = () => {
    setSearchExpanded((prev) => !prev)
    if (searchExpanded) {
      setSearchQuery('')
    }
  }

  // 开始编辑
  const handleStartEdit = () => {
    setShowEditor(true)
    startEditing()
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setShowEditor(false)
    stopEditing()
  }

  // 保存编辑
  const handleSaveEdit = (newShortcuts: ShortcutConfig[]) => {
    saveShortcuts(newShortcuts)
    setShowEditor(false)
  }

  // 成就解锁处理
  const handleAchievementUnlock = (achievement: any) => {
    console.log('成就解锁:', achievement.title)
    // 这里可以显示通知
  }

  // 成就按钮点击
  const toggleAchievements = () => {
    setShowAchievements(!showAchievements)
  }

  return (
    <>
      {/* 首次引导弹窗 */}
      <FirstTimeGuide
        open={showGuide && !showEditor}
        onComplete={completeGuide}
        onSkip={completeGuide}
      />

      {/* 主面板 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card/90 backdrop-blur-md"
          onPointerDownOutside={() => onOpenChange(false)}
        >
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                <DialogTitle className="text-lg">快捷键指南</DialogTitle>
              </div>
              <div className="flex gap-1">
                {/* 成就按钮 */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={toggleAchievements}
                  className={cn(
                    'transition-all duration-200',
                    showAchievements && 'bg-yellow-500/10 text-yellow-600'
                  )}
                  title="成就系统"
                >
                  <Trophy className="w-4 h-4" />
                </Button>

                {/* 编辑按钮 */}
                {!showEditor && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleStartEdit}
                    className="transition-all duration-200"
                    title="自定义快捷键"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}

                {/* 搜索按钮 */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={toggleSearch}
                  className={cn(
                    'transition-all duration-200',
                    searchExpanded && 'bg-primary/10 text-primary'
                  )}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs">
              {showEditor
                ? '自定义您的快捷键，提升工作效率'
                : '使用快捷键提升您的工作效率'}
            </DialogDescription>
          </DialogHeader>

          {/* 可折叠的搜索框 */}
          {searchExpanded && !showEditor && (
            <div className="relative mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索快捷键..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* 成就系统 */}
          {showAchievements && !showEditor && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <AchievementSystem
                shortcutStats={stats}
                userStats={userStats}
                onAchievementUnlock={handleAchievementUnlock}
              />
              <Separator className="mt-4" />
            </div>
          )}

          {/* 编辑器 */}
          {showEditor ? (
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin animate-in fade-in">
              <ShortcutEditor
                shortcuts={shortcuts.flatMap((category) => category.shortcuts)}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <>
              <Separator />

              {/* 快捷键列表 */}
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-4">
                  {filteredCategories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="space-y-2">
                      {/* 分类标题 */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {category.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {category.shortcuts.length}
                        </Badge>
                      </div>

                      {/* 快捷键列表 */}
                      <div className="space-y-1.5">
                        {category.shortcuts.map((shortcut: ShortcutConfig) => {
                          const stat = stats.find((s) => s.shortcutId === shortcut.id)
                          const usageCount = stat?.usageCount || 0

                          return (
                            <div
                              key={shortcut.id}
                              className={cn(
                                'grid grid-cols-12 gap-3 items-center',
                                'px-3 py-2 rounded-md',
                                'border border-border/30',
                                'hover:bg-muted/40 hover:border-border/60',
                                'transition-all duration-150',
                                shortcut.important &&
                                  'bg-primary/5 hover:bg-primary/10 border-primary/20'
                              )}
                            >
                              {/* 快捷键组合 - 占5列 */}
                              <div className="col-span-5 flex items-center gap-1.5">
                                {shortcut.currentKeys.map((key: string, keyIndex: number) => (
                                  <div key={keyIndex} className="flex items-center">
                                    <kbd
                                      className={cn(
                                        'px-2 py-1 text-xs font-semibold',
                                        'rounded-full',
                                        'bg-background',
                                        'border shadow-sm',
                                        shortcut.important
                                          ? 'border-primary/50 bg-primary/10 text-primary'
                                          : 'border-border/60',
                                        'transition-all duration-150'
                                      )}
                                    >
                                      {key}
                                    </kbd>
                                    {keyIndex < shortcut.currentKeys.length - 1 && (
                                      <span
                                        className={cn(
                                          'mx-1 text-xs font-medium',
                                          shortcut.important
                                            ? 'text-primary/70'
                                            : 'text-muted-foreground'
                                        )}
                                      >
                                        +
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* 描述 - 占6列 */}
                              <p
                                className={cn(
                                  'col-span-6 text-sm truncate',
                                  shortcut.important
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {shortcut.description}
                              </p>

                              {/* 使用统计和重要标记 - 占1列 */}
                              <div className="col-span-1 flex justify-center">
                                {shortcut.important ? (
                                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                ) : usageCount > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1"
                                  >
                                    {usageCount}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {categoryIndex < filteredCategories.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部提示 */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>提示：</span>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded-full text-[10px]">
                      Esc
                    </kbd>
                    <span>关闭</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded-full text-[10px]">
                      ⌘F1
                    </kbd>
                    <span>切换</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>常用</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {shortcuts.reduce((acc, cat) => acc + cat.shortcuts.length, 0)}{' '}
                  个快捷键
                </Badge>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// 导出快捷键配置供其他组件使用
export { DEFAULT_SHORTCUTS as shortcutCategories } from '@/config/shortcuts'
