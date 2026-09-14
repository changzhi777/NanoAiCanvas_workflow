import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useZoomAdaptive } from '@/hooks/useZoomAdaptive'

describe('useZoomAdaptive', () => {
  it('should return extreme minimal config at very low zoom (< 0.5)', () => {
    const { result } = renderHook(() => useZoomAdaptive(0.3))

    expect(result.current.showTitle).toBe(false)
    expect(result.current.showDescription).toBe(false)
    expect(result.current.showIcon).toBe(true)
    expect(result.current.showStatus).toBe(true)
    expect(result.current.fontSize).toBe(10)
    expect(result.current.padding).toBe(6)
    expect(result.current.descriptionMaxLines).toBe(0)
  })

  it('should return compact config at small zoom (0.5-0.8)', () => {
    const { result } = renderHook(() => useZoomAdaptive(0.7))

    expect(result.current.showTitle).toBe(true)
    expect(result.current.showDescription).toBe(false)
    expect(result.current.showIcon).toBe(true)
    expect(result.current.fontSize).toBe(11)
    expect(result.current.descriptionMaxLines).toBe(0)
  })

  it('should return full config at standard zoom (0.8-1.2)', () => {
    const { result } = renderHook(() => useZoomAdaptive(1.0))

    expect(result.current.showTitle).toBe(true)
    expect(result.current.showDescription).toBe(true)
    expect(result.current.showMetadata).toBe(true)
    expect(result.current.showTags).toBe(true)
    expect(result.current.fontSize).toBe(14)
    expect(result.current.padding).toBe(12)
    expect(result.current.descriptionMaxLines).toBe(2)
  })

  it('should return expanded config at large zoom (> 1.2)', () => {
    const { result } = renderHook(() => useZoomAdaptive(1.5))

    expect(result.current.showTitle).toBe(true)
    expect(result.current.showDescription).toBe(true)
    expect(result.current.fontSize).toBe(16)
    expect(result.current.padding).toBe(16)
    expect(result.current.descriptionMaxLines).toBe(3)
  })

  it('should be memoized for same zoom value', () => {
    const { result, rerender } = renderHook(() => useZoomAdaptive(1.0))
    const first = result.current

    rerender()
    const second = result.current

    expect(first).toBe(second) // same reference due to useMemo
  })

  it('should return new config when zoom changes', () => {
    const { result, rerender } = renderHook(
      ({ zoom }) => useZoomAdaptive(zoom),
      { initialProps: { zoom: 1.0 } }
    )

    expect(result.current.fontSize).toBe(14)

    rerender({ zoom: 0.3 })
    expect(result.current.fontSize).toBe(10)
  })

  it('should handle boundary values correctly', () => {
    // Exactly at 0.5 boundary
    const { result: r0 } = renderHook(() => useZoomAdaptive(0.5))
    expect(r0.current.showTitle).toBe(true) // 0.5 is in the >= 0.5 range

    // Exactly at 0.8 boundary
    const { result: r1 } = renderHook(() => useZoomAdaptive(0.8))
    expect(r1.current.showDescription).toBe(true)

    // Exactly at 1.2 boundary
    const { result: r2 } = renderHook(() => useZoomAdaptive(1.2))
    expect(r2.current.fontSize).toBe(16)
  })
})
