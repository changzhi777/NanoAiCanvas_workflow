import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * CustomCursor 组件 - 自定义鼠标光标
 *
 * 功能：
 * - 自定义 cursor 样式
 * - Hover 状态变形
 * - Magnetic 效果（可选）
 * - 自动隐藏（不活动时）
 *
 * 特性：
 * - 仅在桌面端显示（隐藏移动端）
 * - 尊重 prefers-reduced-motion
 * - 性能优化（使用 useMotionValue）
 */
export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // 使用 motion values 优化性能
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  // Spring 动画配置
  const springConfig = {
    type: 'spring',
    stiffness: 500,
    damping: 28,
    mass: 0.5
  }

  // 动画光标位置
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    // 仅在桌面端启用
    if (window.matchMedia('(pointer: coarse)').matches) {
      return // 移动设备不使用自定义 cursor
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true)

      cursorX.set(e.clientX - 16) // 16 是 cursor 宽度的一半
      cursorY.set(e.clientY - 16)
    }

    const handleMouseDown = () => setIsHovering(true)
    const handleMouseUp = () => setIsHovering(false)

    // 检测 hover 状态
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer')
      ) {
        setIsHovering(true)
      }
    }

    const handleMouseOut = () => {
      setIsHovering(false)
    }

    // 监听鼠标事件
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mouseout', handleMouseOut)

    // 不活动时隐藏
    let hideTimer: ReturnType<typeof setTimeout>
    const resetHideTimer = () => {
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => setIsVisible(false), 3000)
    }

    window.addEventListener('mousemove', resetHideTimer)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mouseout', handleMouseOut)
      window.removeEventListener('mousemove', resetHideTimer)
      clearTimeout(hideTimer)
    }
  }, [isVisible, cursorX, cursorY])

  // 移动端或 prefers-reduced-motion 不显示
  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches ||
     window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ) {
    return null
  }

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
      style={{
        x: cursorXSpring,
        y: cursorYSpring
      }}
      animate={{
        scale: isHovering ? 1.5 : 1,
        opacity: isVisible ? 1 : 0
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 28
      }}
    >
      {/* 外圈 */}
      <div className="relative">
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-primary"
          animate={{
            scale: isHovering ? 0.8 : 1,
            borderColor: isHovering ? 'hsl(var(--accent))' : 'hsl(var(--primary))'
          }}
          transition={{
            duration: 0.15
          }}
        />

        {/* 内圈 */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: isHovering ? 0.5 : 1
          }}
          transition={{
            duration: 0.15
          }}
        />
      </div>
    </motion.div>
  )
}
