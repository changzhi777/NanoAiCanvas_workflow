import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCleanup, useRenderPerformance } from '@/hooks/useCleanup'

// Mock cleanupHelpers
vi.mock('@/utils/cleanupHelpers', () => ({
  safeSetTimeout: vi.fn((cb, delay, ref) => {
    const id = setTimeout(cb, delay)
    ref.current.push(id)
    return id
  }),
  clearAllTimers: vi.fn((ref) => {
    ref.current.forEach((id: any) => clearTimeout(id))
    ref.current = []
  }),
  safeAddEventListener: vi.fn((target, event, handler, ref) => {
    target.addEventListener(event, handler)
    const cleanup = () => target.removeEventListener(event, handler)
    ref.current.push(cleanup)
    return cleanup
  }),
  removeAllEventListeners: vi.fn((ref) => {
    ref.current.forEach((fn: any) => fn())
    ref.current = []
  }),
  createAbortController: vi.fn((ref) => {
    const controller = new AbortController()
    ref.current.push(controller)
    return controller
  }),
  abortAllControllers: vi.fn((ref) => {
    ref.current.forEach((c: any) => c.abort())
    ref.current = []
  }),
}))

describe('useCleanup', () => {
  it('should provide setTimeout utility', () => {
    const { result } = renderHook(() => useCleanup())

    expect(result.current.setTimeout).toBeInstanceOf(Function)
  })

  it('should provide addEventListener utility', () => {
    const { result } = renderHook(() => useCleanup())

    expect(result.current.addEventListener).toBeInstanceOf(Function)
  })

  it('should provide createAbortController utility', () => {
    const { result } = renderHook(() => useCleanup())

    const controller = result.current.createAbortController()
    expect(controller).toBeInstanceOf(AbortController)
  })

  it('should provide manual cleanup methods', () => {
    const { result } = renderHook(() => useCleanup())

    expect(result.current.clearAllTimers).toBeInstanceOf(Function)
    expect(result.current.removeAllEventListeners).toBeInstanceOf(Function)
    expect(result.current.abortAll).toBeInstanceOf(Function)
  })

  it('should abort all controllers on manual abort', () => {
    const { result } = renderHook(() => useCleanup())

    const c1 = result.current.createAbortController()
    const c2 = result.current.createAbortController()

    result.current.abortAll()

    expect(c1.signal.aborted).toBe(true)
    expect(c2.signal.aborted).toBe(true)
  })

  it('should create independent AbortControllers', () => {
    const { result } = renderHook(() => useCleanup())

    const c1 = result.current.createAbortController()
    const c2 = result.current.createAbortController()

    c1.abort()

    expect(c1.signal.aborted).toBe(true)
    expect(c2.signal.aborted).toBe(false)
  })
})

describe('useRenderPerformance', () => {
  it('should not throw', () => {
    expect(() => {
      renderHook(() => useRenderPerformance('TestComponent'))
    }).not.toThrow()
  })
})
