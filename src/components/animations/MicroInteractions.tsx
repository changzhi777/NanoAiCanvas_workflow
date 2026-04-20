import { motion } from 'framer-motion'
import { ReactNode } from 'react'

/**
 * HoverScale 组件 - Hover 缩放效果
 *
 * 功能：
 * - Hover 时轻微缩放
 * - 阴影增强
 * - 适用于卡片、按钮等
 *
 * 使用方法：
 * ```tsx
 * <HoverScale scale={1.02}>
 *   <YourComponent />
 * </HoverScale>
 * ```
 */
interface HoverScaleProps {
  children: ReactNode
  scale?: number
  className?: string
}

export function HoverScale({
  children,
  scale = 1.02,
  className = ''
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeIn 组件 - 淡入动画
 *
 * 功能：
 * - 组件挂载时淡入
 * - 可配置延迟
 *
 * 使用方法：
 * ```tsx
 * <FadeIn delay={0.1}>
 *   <YourComponent />
 * </FadeIn>
 * ```
 */
interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.2,
  className = ''
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * SlideIn 组件 - 滑入动画
 *
 * 功能：
 * - 从指定方向滑入
 * - 淡入效果
 *
 * 使用方法：
 * ```tsx
 * <SlideIn direction="left">
 *   <YourComponent />
 * </SlideIn>
 * ```
 */
type SlideDirection = 'left' | 'right' | 'up' | 'down'

interface SlideInProps {
  children: ReactNode
  direction?: SlideDirection
  distance?: number
  duration?: number
  className?: string
}

export function SlideIn({
  children,
  direction = 'up',
  distance = 20,
  duration = 0.2,
  className = ''
}: SlideInProps) {
  const directionMap = {
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance }
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
