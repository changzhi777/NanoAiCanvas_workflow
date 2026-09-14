import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWindowSizeAdaptive } from '@/hooks/useWindowSizeAdaptive'

describe('useWindowSizeAdaptive', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  afterEach(() => {
    // Restore window dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true })
  })

  function setWindowSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true })
    window.dispatchEvent(new Event('resize'))
  }

  it('should detect mobile layout (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true })

    const { result } = renderHook(() => useWindowSizeAdaptive())

    expect(result.current.isMobile).toBe(true)
    expect(result.current.layoutConfig.columns).toBe(1)
    expect(result.current.layoutConfig.nodeWidth).toBe(280)
  })

  it('should detect tablet layout (768-1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 900, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })

    const { result } = renderHook(() => useWindowSizeAdaptive())

    expect(result.current.isTablet).toBe(true)
    expect(result.current.layoutConfig.columns).toBe(2)
    expect(result.current.layoutConfig.nodeWidth).toBe(320)
  })

  it('should detect desktop layout (>= 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true })

    const { result } = renderHook(() => useWindowSizeAdaptive())

    expect(result.current.isDesktop).toBe(true)
    expect(result.current.layoutConfig.columns).toBe(3)
    expect(result.current.layoutConfig.nodeWidth).toBe(360)
  })

  it('should return 4-column layout on large screens (>= 1440px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true, configurable: true })

    const { result } = renderHook(() => useWindowSizeAdaptive())

    expect(result.current.layoutConfig.columns).toBe(4)
    expect(result.current.layoutConfig.nodeWidth).toBe(400)
    expect(result.current.layoutConfig.gap).toBe(32)
  })

  it('should report correct initial window size', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true })

    const { result } = renderHook(() => useWindowSizeAdaptive())

    expect(result.current.windowSize.width).toBe(1200)
    expect(result.current.windowSize.height).toBe(800)
  })

  it('should correctly classify exclusive ranges', () => {
    // Mobile upper bound
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true, configurable: true })
    const { result: r1 } = renderHook(() => useWindowSizeAdaptive())
    expect(r1.current.isMobile).toBe(true)

    // Desktop lower bound
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    const { result: r2 } = renderHook(() => useWindowSizeAdaptive())
    expect(r2.current.isDesktop).toBe(true)
    expect(r2.current.isTablet).toBe(false)
  })
})
