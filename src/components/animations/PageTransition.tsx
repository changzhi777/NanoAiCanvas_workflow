import { motion } from 'framer-motion'

/**
 * PageTransition 组件 - 页面切换动画
 *
 * 功能：
 * - 淡入淡出效果
 * - 轻微的向上移动
 * - 可配置的动画时长
 *
 * 使用方法：
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
interface PageTransitionProps {
  children: React.ReactNode
  duration?: number
}

export function PageTransition({
  children,
  duration = 0.2
}: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration,
        ease: [0.4, 0, 0.2, 1] // cubic-bezier(0.4, 0, 0.2, 1)
      }}
    >
      {children}
    </motion.div>
  )
}
