import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectNodes } from '@/store/slices/canvasSlice'

/**
 * 性能监控组件
 * 监控节点数量并自动应用性能优化
 */
export function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  const nodes = useAppSelector(selectNodes)
  const [performanceMode, setPerformanceMode] = useState<'normal' | 'high' | 'extreme'>('normal')

  useEffect(() => {
    const nodeCount = nodes.length

    // 根据节点数量设置性能模式
    if (nodeCount > 200) {
      setPerformanceMode('extreme')
      document.body.classList.add('performance-extreme')
      document.body.classList.remove('performance-high', 'performance-normal')
    } else if (nodeCount > 100) {
      setPerformanceMode('high')
      document.body.classList.add('performance-high')
      document.body.classList.remove('performance-extreme', 'performance-normal')
    } else {
      setPerformanceMode('normal')
      document.body.classList.add('performance-normal')
      document.body.classList.remove('performance-extreme', 'performance-high')
    }

    // performance mode: ${performanceMode} (${nodeCount} 个节点)`)
  }, [nodes.length, performanceMode])

  return <>{children}</>
}
