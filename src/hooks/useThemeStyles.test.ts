import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThemeStyles } from '@/hooks/useThemeStyles'

// Mock Theme context
vi.mock('@/components/nanoai-workflow/ui/Theme', () => ({
  useTheme: vi.fn(),
}))

import { useTheme } from '@/components/nanoai-workflow/ui/Theme'

const mockUseTheme = vi.mocked(useTheme)

describe('useThemeStyles', () => {
  it('should return dark theme styles when isDark is true', () => {
    mockUseTheme.mockReturnValue({ isDark: true } as any)

    const { result } = renderHook(() => useThemeStyles())

    expect(result.current.background).toContain('bg-slate-900')
    expect(result.current.textPrimary).toBe('text-slate-200')
    expect(result.current.textSecondary).toBe('text-slate-400')
    expect(result.current.success).toBe('text-green-400')
    expect(result.current.error).toBe('text-red-400')
    expect(result.current.warning).toBe('text-yellow-400')
    expect(result.current.border).toBe('border-white/10')
  })

  it('should return light theme styles when isDark is false', () => {
    mockUseTheme.mockReturnValue({ isDark: false } as any)

    const { result } = renderHook(() => useThemeStyles())

    expect(result.current.background).toContain('bg-white')
    expect(result.current.textPrimary).toBe('text-gray-900')
    expect(result.current.textSecondary).toBe('text-gray-600')
    expect(result.current.success).toBe('text-green-600')
    expect(result.current.error).toBe('text-red-600')
    expect(result.current.warning).toBe('text-yellow-600')
    expect(result.current.border).toBe('border-gray-200')
  })

  it('should return consistent style keys for both themes', () => {
    mockUseTheme.mockReturnValue({ isDark: true } as any)
    const { result: darkResult } = renderHook(() => useThemeStyles())

    mockUseTheme.mockReturnValue({ isDark: false } as any)
    const { result: lightResult } = renderHook(() => useThemeStyles())

    const darkKeys = Object.keys(darkResult.current)
    const lightKeys = Object.keys(lightResult.current)

    expect(darkKeys).toEqual(lightKeys)
    expect(darkKeys).toContain('background')
    expect(darkKeys).toContain('card')
    expect(darkKeys).toContain('input')
    expect(darkKeys).toContain('gradientText')
  })

  it('should provide card styles', () => {
    mockUseTheme.mockReturnValue({ isDark: true } as any)
    const { result } = renderHook(() => useThemeStyles())

    expect(result.current.card).toContain('bg-slate-700/30')
  })

  it('should provide gradient text classes', () => {
    mockUseTheme.mockReturnValue({ isDark: true } as any)
    const { result } = renderHook(() => useThemeStyles())

    expect(result.current.gradientText).toContain('from-blue-400')
    expect(result.current.gradientText).toContain('to-cyan-400')
  })

  it('should memoize results for same isDark value', () => {
    mockUseTheme.mockReturnValue({ isDark: true } as any)
    const { result, rerender } = renderHook(() => useThemeStyles())
    const first = result.current

    rerender()
    const second = result.current

    expect(first).toBe(second) // same reference due to useMemo
  })
})
