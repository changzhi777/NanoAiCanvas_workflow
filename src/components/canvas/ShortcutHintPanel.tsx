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
      },
      {
        key: ['⌘', 'Z'],
        description: '撤销',
        category: 'basic',
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
      },
      {
        key: ['?'],
        description: '显示/隐藏快捷键面板',
        category: 'basic',
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
      },
      {
        key: ['⌘', 'V'],
        description: '粘贴节点',
        category: 'edit',
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
      },
      {
        key: ['F2'],
        description: '显示/隐藏模板面板',
        category: 'panel',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <DialogTitle>快捷键指南</DialogTitle>
          </div>
          <DialogDescription>
            使用快捷键提升您的工作效率
          </DialogDescription>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索快捷键..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Separator />

        {/* 快捷键列表 */}
        <div className="space-y-6">
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              {/* 分类标题 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {category.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {category.description}
                </p>
              </div>

              {/* 快捷键项列表 */}
              <div className="grid gap-2">
                {category.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className={cn(
                      'flex items-center justify-between gap-4',
                      'p-3 rounded-lg border border-border/50',
                      'hover:bg-muted/50 transition-colors',
                      'group'
                    )}
                  >
                    {/* 快捷键组合 */}
                    <div className="flex items-center gap-1.5">
                      {shortcut.key.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center">
                          <kbd
                            className={cn(
                              'px-2 py-1 text-xs font-semibold',
                              'bg-background border border-border rounded',
                              'shadow-sm',
                              'group-hover:border-primary/50 transition-colors'
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIndex < shortcut.key.length - 1 && (
                            <span className="mx-1 text-muted-foreground text-xs">
                              +
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 描述 */}
                    <p className="flex-1 text-sm text-muted-foreground">
                      {shortcut.description}
                    </p>

                    {/* 分类标签（可选） */}
                    <Badge variant="secondary" className="text-xs">
                      {category.title.replace('操作', '').replace('控制', '')}
                    </Badge>
                  </div>
                ))}
              </div>

              {categoryIndex < filteredCategories.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            提示：按 <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Esc</kbd> 或 <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Enter</kbd> 关闭面板
          </p>
          <Badge variant="outline" className="text-xs">
            共 {shortcutCategories.reduce((acc, cat) => acc + cat.shortcuts.length, 0)} 个快捷键
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 导出快捷键配置供其他组件使用
export { shortcutCategories }
