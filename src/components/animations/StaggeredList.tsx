import { motion } from 'framer-motion'
import React, { ReactNode } from 'react'

/**
 * StaggeredList 组件 - 列表交错动画
 *
 * 功能：
 * - 列表项逐个进入
 * - Stagger 效果（延迟动画）
 * - 适用于节点模板、历史记录等
 *
 * 使用方法：
 * ```tsx
 * <StaggeredList staggerDelay={0.05}>
 *   {items.map((item) => (
 *     <motion.div key={item.id}>
 *       {item.content}
 *     </motion.div>
 *   ))}
 * </StaggeredList>
 * ```
 */
interface StaggeredListProps {
  children: ReactNode
  staggerDelay?: number // 每项之间的延迟（秒）
  className?: string
}

export function StaggeredList({
  children,
  staggerDelay = 0.05,
  className = ''
}: StaggeredListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
