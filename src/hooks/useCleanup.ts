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
      console.log(`🔍 [${componentName}] 组件已挂载`)

      // 检测是否有未清理的定时器
      const originalSetTimeout = window.setTimeout
      const originalSetInterval = window.setInterval
      const originalAddEventListener = EventTarget.prototype.addEventListener

      let timeoutCount = 0
      let intervalCount = 0
      let eventListenerCount = 0

      window.setTimeout = function (...args) {
        timeoutCount++
        return originalSetTimeout.apply(this, args)
      }

      window.setInterval = function (...args) {
        intervalCount++
        return originalSetInterval.apply(this, args)
      }

      EventTarget.prototype.addEventListener = function (...args) {
        eventListenerCount++
        return originalAddEventListener.apply(this, args)
      }

      return () => {
        window.setTimeout = originalSetTimeout
        window.setInterval = originalSetInterval
        EventTarget.prototype.addEventListener = originalAddEventListener

        console.log(`🧹 [${componentName}] 组件已卸载`)
        console.log(`  - setTimeout: ${timeoutCount}`)
        console.log(`  - setInterval: ${intervalCount}`)
        console.log(`  - addEventListener: ${eventListenerCount}`)

        // 警告：如果创建了很多定时器但可能没有清理
        if (timeoutCount > 10 || intervalCount > 5) {
          console.warn(
            `⚠️  [${componentName}] 可能存在内存泄漏：创建了 ${timeoutCount} 个 setTimeout 和 ${intervalCount} 个 setInterval`
          )
        }
      }
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
      // 小于一帧（16ms）
      console.warn(
        `⚠️  [${componentName}] 渲染过于频繁：${timeSinceLastRender}ms`
      )
    }

    lastRenderTime.current = now
  })
}
