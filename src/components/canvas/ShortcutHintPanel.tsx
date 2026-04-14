import { useState, useMemo, useCallback } from 'react'
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
import { Search, Keyboard, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// 快捷键分类定义
interface ShortcutCategory {
  title: string
  description: string
  shortcuts: ShortcutItem[]
}

interface ShortcutItem {
  key: string[]
  description: string
  category: string
  icon?: React.ComponentType<{ className?: string }>
  important?: boolean // 新增：标记常用快捷键
}

// 完整的快捷键配置
const shortcutCategories: ShortcutCategory[] = [
  {
    title: '基础操作',
    description: '常用操作快捷键',
    shortcuts: [
      {
        key: ['N'],
        description: '添加新节点',
        category: 'basic',
      },
      {
        key: ['⌘', 'S'],
        description: '保存画布',
        category: 'basic',
        important: true, // 常用
      },
      {
        key: ['⌘', 'Z'],
        description: '撤销',
        category: 'basic',
        important: true, // 常用
      },
      {
        key: ['⌘', '⇧', 'Z'],
        description: '重做',
        category: 'basic',
      },
      {
        key: ['⌫'],
        description: '删除选中元素',
        category: 'basic',
        important: true, // 常用
      },
      {
        key: ['?'],
        description: '显示/隐藏快捷键面板',
        category: 'basic',
        important: true, // 最常用
      },
    ],
  },
  {
    title: '视图控制',
    description: '画布缩放和平移',
    shortcuts: [
      {
        key: ['⌘', '+'],
        description: '放大视图',
        category: 'view',
      },
      {
        key: ['⌘', '-'],
        description: '缩小视图',
        category: 'view',
      },
      {
        key: ['⌘', '0'],
        description: '适应视图',
        category: 'view',
      },
      {
        key: ['空格', '拖拽'],
        description: '平移画布',
        category: 'view',
      },
      {
        key: ['⇧', '滚轮'],
        description: '水平缩放',
        category: 'view',
      },
      {
        key: ['滚轮'],
        description: '垂直缩放',
        category: 'view',
      },
    ],
  },
  {
    title: '编辑操作',
    description: '节点编辑快捷键',
    shortcuts: [
      {
        key: ['Enter'],
        description: '编辑选中节点',
        category: 'edit',
      },
      {
        key: ['⌘', 'C'],
        description: '复制选中节点',
        category: 'edit',
        important: true, // 常用
      },
      {
        key: ['⌘', 'V'],
        description: '粘贴节点',
        category: 'edit',
        important: true, // 常用
      },
      {
        key: ['⌘', 'D'],
        description: '快速复制节点',
        category: 'edit',
      },
      {
        key: ['⇧', '拖拽'],
        description: '多选节点',
        category: 'edit',
      },
      {
        key: ['⌘', 'A'],
        description: '全选节点',
        category: 'edit',
      },
    ],
  },
  {
    title: '面板控制',
    description: '界面面板开关',
    shortcuts: [
      {
        key: ['F1'],
        description: '显示/隐藏属性面板',
        category: 'panel',
        important: true, // 常用
      },
      {
        key: ['F2'],
        description: '显示/隐藏模板面板',
        category: 'panel',
        important: true, // 常用
      },
      {
        key: ['⌘', 'B'],
        description: '显示/隐藏工具栏',
        category: 'panel',
      },
      {
        key: ['⌘', '/'],
        description: '切换侧边栏',
        category: 'panel',
      },
    ],
  },
  {
    title: '导航操作',
    description: '节点导航快捷键',
    shortcuts: [
      {
        key: ['⌘', 'F'],
        description: '搜索节点',
        category: 'nav',
      },
      {
        key: ['Tab'],
        description: '下一个节点',
        category: 'nav',
      },
      {
        key: ['⇧', 'Tab'],
        description: '上一个节点',
        category: 'nav',
      },
      {
        key: ['Esc'],
        description: '取消选择/退出编辑',
        category: 'nav',
        important: true, // 常用
      },
    ],
  },
]

interface ShortcutHintPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutHintPanel({
  open,
  onOpenChange
}: ShortcutHintPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)

  // 过滤快捷键
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return shortcutCategories
    }

    const query = searchQuery.toLowerCase()

    return shortcutCategories
      .map(category => ({
        ...category,
        shortcuts: category.shortcuts.filter(shortcut =>
          shortcut.description.toLowerCase().includes(query) ||
          shortcut.key.some(k => k.toLowerCase().includes(query))
        )
      }))
      .filter(category => category.shortcuts.length > 0)
  }, [searchQuery])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onOpenChange(false)
    }
  }, [onOpenChange])

  // 切换搜索框展开状态
  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => !prev)
    if (searchExpanded) {
      setSearchQuery('') // 收起时清空搜索
    }
  }, [searchExpanded])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-card/90 backdrop-blur-md"
        onPointerDownOutside={() => {
          // 支持点击外部关闭
          onOpenChange(false)
        }}
        onEscapeKeyDown={() => {
          // 支持Esc键关闭（默认已支持，这里不需要额外处理）
        }}
      >
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg">快捷键指南</DialogTitle>
            </div>
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
          <DialogDescription className="text-xs">
            使用快捷键提升您的工作效率
          </DialogDescription>
        </DialogHeader>

        {/* 可折叠的搜索框 */}
        {searchExpanded && (
          <div className="relative mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索快捷键..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
              onKeyDown={handleKeyDown}
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

        <Separator />

        {/* 快捷键列表 - 紧凑表格布局 */}
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

                {/* 紧凑表格布局 */}
                <div className="space-y-1.5">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className={cn(
                        'grid grid-cols-12 gap-3 items-center',
                        'px-3 py-2 rounded-md',
                        'border border-border/30',
                        'hover:bg-muted/40 hover:border-border/60',
                        'transition-all duration-150',
                        shortcut.important && 'bg-primary/5 hover:bg-primary/10 border-primary/20'
                      )}
                    >
                      {/* 快捷键组合 - 占5列 */}
                      <div className="col-span-5 flex items-center gap-1.5">
                        {shortcut.key.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center">
                            <kbd
                              className={cn(
                                'px-2 py-1 text-xs font-semibold',
                                'rounded-full', // macOS风格圆角
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
                            {keyIndex < shortcut.key.length - 1 && (
                              <span className={cn(
                                'mx-1 text-xs font-medium',
                                shortcut.important ? 'text-primary/70' : 'text-muted-foreground'
                              )}>
                                +
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 描述 - 占6列 */}
                      <p className={cn(
                        'col-span-6 text-sm truncate',
                        shortcut.important ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {shortcut.description}
                      </p>

                      {/* 重要标记 - 占1列 */}
                      <div className="col-span-1 flex justify-center">
                        {shortcut.important && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
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
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded-full text-[10px]">Esc</kbd>
              <span>关闭</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded-full text-[10px]">?</kbd>
              <span>切换</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>常用</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {shortcutCategories.reduce((acc, cat) => acc + cat.shortcuts.length, 0)} 个快捷键
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 导出快捷键配置供其他组件使用
export { shortcutCategories }
