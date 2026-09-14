import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePerformanceMode, useThrottle, useDebounce } from '@/hooks/usePerformanceMode'

describe('usePerformanceMode', () => {
  it('should start in normal mode', () => {
    const { result } = renderHook(() => usePerformanceMode(10))
    expect(result.current.performanceMode).toBe('normal')
    expect(result.current.animations).toBe(true)
    expect(result.current.shadows).toBe(true)
    expect(result.current.hoverEffects).toBe(true)
    expect(result.current.miniMap).toBe(true)
  })

  it('should switch to high mode when nodes > 100', () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePerformanceMode(count),
      { initialProps: { count: 10 } }
    )

    rerender({ count: 150 })

    expect(result.current.performanceMode).toBe('high')
    expect(result.current.shadows).toBe(false)
    expect(result.current.animations).toBe(true)
    expect(result.current.fitViewOnInit).toBe(false)
  })

  it('should switch to extreme mode when nodes > 200', () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePerformanceMode(count),
      { initialProps: { count: 10 } }
    )

    rerender({ count: 250 })

    expect(result.current.performanceMode).toBe('extreme')
    expect(result.current.animations).toBe(false)
    expect(result.current.shadows).toBe(false)
    expect(result.current.hoverEffects).toBe(false)
    expect(result.current.miniMap).toBe(false)
    expect(result.current.zoomOnScroll).toBe(false)
  })

  it('should revert to normal when node count drops', () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePerformanceMode(count),
      { initialProps: { count: 10 } }
    )

    rerender({ count: 150 })
    expect(result.current.performanceMode).toBe('high')

    rerender({ count: 50 })
    expect(result.current.performanceMode).toBe('normal')
  })

  it('should indicate shouldOptimize when nodes > 50', () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePerformanceMode(count),
      { initialProps: { count: 10 } }
    )

    expect(result.current.shouldOptimize).toBe(false)

    rerender({ count: 60 })
    expect(result.current.shouldOptimize).toBe(true)

    rerender({ count: 30 })
    expect(result.current.shouldOptimize).toBe(false)
  })

  it('should keep selectionBox enabled in all modes', () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePerformanceMode(count),
      { initialProps: { count: 10 } }
    )

    expect(result.current.selectionBox).toBe(true)

    rerender({ count: 150 })
    expect(result.current.selectionBox).toBe(true)

    rerender({ count: 250 })
    expect(result.current.selectionBox).toBe(true)
  })
})

describe('useThrottle', () => {
  it('should call function after delay has passed', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottle(fn, 100))

    // Advance past the initial lastRun time
    act(() => { vi.advanceTimersByTime(150) })
    act(() => { result.current('arg') })

    expect(fn).toHaveBeenCalledWith('arg')
    vi.useRealTimers()
  })

  it('should throttle calls within delay window', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottle(fn, 100))

    // Advance past initial time
    act(() => { vi.advanceTimersByTime(150) })
    act(() => { result.current('first') })

    // Immediate second call within delay — should be throttled
    act(() => { result.current('second') })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')

    vi.useRealTimers()
  })

  it('should allow call after delay elapses', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottle(fn, 100))

    act(() => { vi.advanceTimersByTime(150) })
    act(() => { result.current('first') })

    // Advance past delay
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current('second') })

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith('second')

    vi.useRealTimers()
  })
})

describe('useDebounce', () => {
  it('should debounce function calls', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 100))

    act(() => { result.current('a') })
    act(() => { result.current('b') })
    act(() => { result.current('c') })

    expect(fn).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(100) })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')

    vi.useRealTimers()
  })
})
