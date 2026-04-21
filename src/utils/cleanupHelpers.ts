/**
 * 清理辅助函数
 * 帮助防止内存泄漏
 */

/**
 * 安全的setTimeout包装器，自动清理
 */
export function safeSetTimeout(
  callback: () => void,
  delay: number,
  cleanupRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>
) {
  const timerId = setTimeout(callback, delay)
  if (cleanupRef.current) {
    cleanupRef.current.push(timerId)
  }
  return timerId
}

/**
 * 清理所有定时器
 */
export function clearAllTimers(
  timersRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>
) {
  if (timersRef.current) {
    timersRef.current.forEach(timer => clearTimeout(timer))
    timersRef.current = []
  }
}

/**
 * 安全的事件监听器添加，自动清理
 */
export function safeAddEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  cleanupRef: React.MutableRefObject<(() => void)[]>
) {
  target.addEventListener(event, handler)

  const cleanup = () => {
    target.removeEventListener(event, handler)
  }

  if (cleanupRef.current) {
    cleanupRef.current.push(cleanup)
  }

  return cleanup
}

/**
 * 清理所有事件监听器
 */
export function removeAllEventListeners(
  cleanupRef: React.MutableRefObject<(() => void)[]>
) {
  if (cleanupRef.current) {
    cleanupRef.current.forEach(cleanup => cleanup())
    cleanupRef.current = []
  }
}

/**
 * 创建自动清理的AbortController
 */
export function createAbortController(
  cleanupRef: React.MutableRefObject<AbortController[]>
): AbortController {
  const controller = new AbortController()
  if (cleanupRef.current) {
    cleanupRef.current.push(controller)
  }
  return controller
}

/**
 * 清理所有AbortController
 */
export function abortAllControllers(
  cleanupRef: React.MutableRefObject<AbortController[]>
) {
  if (cleanupRef.current) {
    cleanupRef.current.forEach(controller => controller.abort())
    cleanupRef.current = []
  }
}
