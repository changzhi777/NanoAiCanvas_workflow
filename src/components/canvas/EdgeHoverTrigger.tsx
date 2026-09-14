import { useState, useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { togglePanel } from '@/store/slices/uiSlice'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EdgeHoverTriggerProps {
  edge: 'left' | 'right'
  panel: 'properties' | 'templates'
  delay?: number // 毫秒
}

export function EdgeHoverTrigger({
  edge,
  panel,
  delay = 200
}: EdgeHoverTriggerProps) {
  const dispatch = useAppDispatch()
  const [isHovering, setIsHovering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    setIsHovering(true)

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 显示加载状态
    setIsLoading(true)

    // 延迟触发面板
    timeoutRef.current = setTimeout(() => {
      dispatch(togglePanel(panel))
      setIsLoading(false)
    }, delay)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    setIsLoading(false)

    // 清除定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className={cn(
        'fixed top-0 bottom-0 z-30 w-2 transition-all duration-300',
        'hover:w-4 cursor-pointer group',
        edge === 'left' ? 'left-0' : 'right-0'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={`显示${panel === 'templates' ? '模板' : '属性'}面板（快捷键: ${panel === 'templates' ? 'F2' : 'F1'}）`}
      tabIndex={0}
      onClick={() => dispatch(togglePanel(panel))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          dispatch(togglePanel(panel))
        }
      }}
    >
      {/* 边缘高亮 */}
      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      {/* 悬停提示图标 */}
      {isHovering && !isLoading && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full",
          "bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap",
          "shadow-lg animate-in",
          edge === 'left' ? "left-4" : "right-4"
        )}>
          {edge === 'left' ? (
            <>
              <ChevronRight className="w-3 h-3 mr-1" />
              模板面板 (F2)
            </>
          ) : (
            <>
              属性面板 (F1)
              <ChevronLeft className="w-3 h-3 ml-1" />
            </>
          )}
        </div>
      )}
    </div>
  )
}
