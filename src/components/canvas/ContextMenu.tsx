import { memo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

const ContextMenu = memo(({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu fixed z-50 min-w-[180px] max-w-[240px]"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-menu-reveal">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => {
                item.onClick()
                onClose()
              }}
              className={cn(
                'w-full px-3 py-2 flex items-center gap-2 text-sm',
                'relative overflow-hidden',
                'transition-colors duration-150',
                'hover:bg-muted',
                item.danger && 'hover:text-destructive hover:bg-destructive/10'
              )}
            >
              {/* 滑动填充效果 */}
              <span className="absolute inset-0 bg-primary opacity-0 hover:opacity-10 transition-opacity duration-200" />

              {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
})

ContextMenu.displayName = 'ContextMenu'

export default ContextMenu
