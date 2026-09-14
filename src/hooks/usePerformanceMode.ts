import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * 性能模式Hook
 * 根据节点数量自动调整性能设置
 */
export function usePerformanceMode(nodeCount: number) {
  const [performanceMode, setPerformanceMode] = useState<'normal' | 'high' | 'extreme'>('normal')

  useEffect(() => {
    if (nodeCount > 200) {
      setPerformanceMode('extreme')
    } else if (nodeCount > 100) {
      setPerformanceMode('high')
    } else {
      setPerformanceMode('normal')
    }
  }, [nodeCount])

  // 根据性能模式返回配置
  const config = {
    normal: {
      animations: true,
      shadows: true,
      hoverEffects: true,
      miniMap: true,
      selectionBox: true,
      zoomOnScroll: true,
      panOnScroll: true,
      fitViewOnInit: true,
    },
    high: {
      animations: true,
      shadows: false,
      hoverEffects: true,
      miniMap: true,
      selectionBox: true,
      zoomOnScroll: true,
      panOnScroll: true,
      fitViewOnInit: false,
    },
    extreme: {
      animations: false,
      shadows: false,
      hoverEffects: false,
      miniMap: false,
      selectionBox: true,
      zoomOnScroll: false,
      panOnScroll: false,
      fitViewOnInit: false,
    },
  }[performanceMode]

  return {
    performanceMode,
    ...config,
    shouldOptimize: nodeCount > 50,
  }
}

/**
 * 节流Hook
 * 限制函数执行频率
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRun = useRef<Date>(new Date())

  return useCallback(
    (...args: Parameters<T>) => {
      const now = new Date()
      if (now.getTime() - lastRun.current.getTime() >= delay) {
        func(...args)
        lastRun.current = now
      }
    },
    [func, delay]
  ) as T
}

/**
 * 防抖Hook
 * 延迟执行函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        func(...args)
      }, delay)
    },
    [func, delay]
  ) as T
}

/**
 * 请求空闲回调Hook
 * 在浏览器空闲时执行低优先级任务
 */
export function useIdleCallback(
  callback: () => void,
  delay: number = 1000
) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => callback())
      } else {
        callback()
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [callback, delay])
}
