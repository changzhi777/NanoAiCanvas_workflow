import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  togglePanel,
  toggleToolbar
} from '@/store/slices/uiSlice'
import {
  Plus,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings,
  HelpCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FloatingMenuBarProps {
  onAddNode?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onSave?: () => void
  className?: string
}

export function FloatingMenuBar({
  onAddNode,
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  onSave,
  className
}: FloatingMenuBarProps) {
  const dispatch = useAppDispatch()
  const { showTemplates, showProperties, showToolbar } = useAppSelector(
    (state) => state.ui
  )
  const [isExpanded, setIsExpanded] = useState(false)

  // 切换工具栏显示
  const handleToggleToolbar = () => {
    dispatch(toggleToolbar())
  }

  // 切换模板面板
  const handleToggleTemplates = () => {
    dispatch(togglePanel('templates'))
  }

  // 切换属性面板
  const handleToggleProperties = () => {
    dispatch(togglePanel('properties'))
  }

  // 主要操作按钮
  const primaryActions = [
    {
      icon: Plus,
      label: '添加节点',
      shortcut: 'N',
      onClick: onAddNode,
      variant: 'default' as const,
      tooltip: '添加新节点 (N)'
    },
    {
      icon: Save,
      label: '保存',
      shortcut: '⌘S',
      onClick: onSave,
      variant: 'ghost' as const,
      tooltip: '保存画布 (⌘S)'
    },
  ]

  // 视图控制按钮
  const viewActions = [
    {
      icon: ZoomIn,
      label: '放大',
      shortcut: '⌘+',
      onClick: onZoomIn,
      tooltip: '放大视图 (⌘+)'
    },
    {
      icon: ZoomOut,
      label: '缩小',
      shortcut: '⌘-',
      onClick: onZoomOut,
      tooltip: '缩小视图 (⌘-)'
    },
    {
      icon: Maximize,
      label: '适应视图',
      shortcut: '⌘0',
      onClick: onFitView,
      tooltip: '适应视图 (⌘0)'
    },
  ]

  // 历史记录按钮
  const historyActions = [
    {
      icon: Undo,
      label: '撤销',
      shortcut: '⌘Z',
      onClick: onUndo,
      tooltip: '撤销 (⌘Z)'
    },
    {
      icon: Redo,
      label: '重做',
      shortcut: '⌘⇧Z',
      onClick: onRedo,
      tooltip: '重做 (⌘⇧Z)'
    },
  ]

  // 面板切换按钮
  const panelActions = [
    {
      icon: Settings,
      label: '属性面板',
      shortcut: 'F1',
      active: showProperties,
      onClick: handleToggleProperties,
      tooltip: '属性面板 (F1)'
    },
    {
      icon: HelpCircle,
      label: '模板面板',
      shortcut: 'F2',
      active: showTemplates,
      onClick: handleToggleTemplates,
      tooltip: '模板面板 (F2)'
    },
  ]

  return (
    <TooltipProvider>
      <div
        className={cn(
          'fixed top-4 left-4 z-50',
          'flex flex-col gap-2',
          'transition-all duration-300',
          className
        )}
      >
        {/* 主按钮组 - 水平排列 */}
        <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1.5">
          {/* 添加节点按钮 - 主要操作 */}
          {primaryActions.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  variant={action.variant}
                  size="sm"
                  onClick={action.onClick}
                  className="relative group"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="sr-only">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{action.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          {/* 视图控制 */}
          {viewActions.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={action.onClick}
                  className="relative group"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="sr-only">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{action.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* 扩展菜单按钮 */}
          <DropdownMenu onOpenChange={(open: boolean) => setIsExpanded(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'relative group',
                  isExpanded && 'bg-accent'
                )}
              >
                {isExpanded ? (
                  <X className="w-4 h-4 transition-transform" />
                ) : (
                  <Settings className="w-4 h-4 transition-transform group-hover:rotate-90" />
                )}
                <span className="sr-only">更多选项</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {/* 历史记录 */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                历史记录
              </div>
              {historyActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-2"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="flex-1">{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.shortcut}
                  </span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* 面板切换 */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                面板
              </div>
              {panelActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  className={cn(
                    'flex items-center gap-2',
                    action.active && 'bg-accent'
                  )}
                >
                  <action.icon className="w-4 h-4" />
                  <span className="flex-1">{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.shortcut}
                  </span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* 工具栏切换 */}
              <DropdownMenuItem
                onClick={handleToggleToolbar}
                className={cn(
                  'flex items-center gap-2',
                  showToolbar && 'bg-accent'
                )}
              >
                <Settings className="w-4 h-4" />
                <span className="flex-1">显示工具栏</span>
                <span className="text-xs text-muted-foreground">⌘B</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 快捷键提示徽章 */}
        <div className="flex items-center justify-center">
          <div className="bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-full px-3 py-1.5">
            <p className="text-xs text-primary font-medium">
              按 <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-[10px]">?</kbd> 查看所有快捷键
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
