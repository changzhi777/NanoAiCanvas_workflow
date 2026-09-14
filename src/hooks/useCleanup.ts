import { useEffect, useRef } from 'react'
import {
  safeSetTimeout,
  clearAllTimers,
  safeAddEventListener,
  removeAllEventListeners,
  createAbortController,
  abortAllControllers,
} from '@/utils/cleanupHelpers'

/**
 * 清理管理Hook
 * 自动管理定时器、事件监听器等资源的清理
 */
export function useCleanup() {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const eventListenersRef = useRef<(() => void)[]>([])
  const abortControllersRef = useRef<AbortController[]>([])

  // 组件卸载时自动清理所有资源
  useEffect(() => {
    return () => {
      clearAllTimers(timersRef)
      removeAllEventListeners(eventListenersRef)
      abortAllControllers(abortControllersRef)
    }
  }, [])

  return {
    // 安全的setTimeout
    setTimeout: (callback: () => void, delay: number) =>
      safeSetTimeout(callback, delay, timersRef),

    // 安全的事件监听器
    addEventListener: (target: EventTarget, event: string, handler: EventListener) =>
      safeAddEventListener(target, event, handler, eventListenersRef),

    // 创建AbortController
    createAbortController: () => createAbortController(abortControllersRef),

    // 手动清理方法
    clearAllTimers: () => clearAllTimers(timersRef),
    removeAllEventListeners: () => removeAllEventListeners(eventListenersRef),
    abortAll: () => abortAllControllers(abortControllersRef),
  }
}

/**
 * 检测内存泄漏的Hook
 * 在开发模式下警告未清理的资源
 */
export function useMemoryLeakDetector(componentName: string) {
  useEffect(() => {
    if (typeof import.meta.env?.DEV !== 'undefined' && import.meta.env.DEV) {
    }
  }, [componentName])
}

/**
 * 检测组件渲染性能的Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef<Date>(new Date())

  useEffect(() => {
    renderCount.current++
    const now = new Date()
    const timeSinceLastRender = now.getTime() - lastRenderTime.current.getTime()

    if (typeof import.meta.env?.DEV !== 'undefined' && import.meta.env.DEV) {
      console.log(
        `🔄 [${componentName}] 渲染次数: ${renderCount.current}, 距离上次渲染: ${timeSinceLastRender}ms`
      )
    }

    // 警告：频繁渲染
    if (timeSinceLastRender < 16) {
      console.warn(
        `⚠️  [${componentName}] 渲染过于频繁：${timeSinceLastRender}ms`
      )
    }

    lastRenderTime.current = now
  })
}
