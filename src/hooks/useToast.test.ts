import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, useToastStore } from '@/hooks/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should expose toast methods', () => {
    const { result } = renderHook(() => useToast())

    expect(result.current.toast.success).toBeInstanceOf(Function)
    expect(result.current.toast.error).toBeInstanceOf(Function)
    expect(result.current.toast.info).toBeInstanceOf(Function)
    expect(result.current.removeToast).toBeInstanceOf(Function)
  })

  it('should add success toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.success('Operation done') })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Operation done')
  })

  it('should add error toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.error('Something failed') })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('error')
  })

  it('should add info toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.info('FYI') })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('info')
  })

  it('should auto-remove toast after 3 seconds', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.success('Auto remove') })
    expect(useToastStore.getState().toasts).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(3000) })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('should manually remove toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.success('Manual remove') })

    const toastId = useToastStore.getState().toasts[0].id
    act(() => { result.current.removeToast(toastId) })

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('should handle multiple toasts', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.success('First') })
    act(() => { result.current.toast.error('Second') })
    act(() => { result.current.toast.info('Third') })

    expect(useToastStore.getState().toasts).toHaveLength(3)
  })

  it('should generate unique IDs', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.toast.success('A') })
    act(() => { result.current.toast.success('B') })

    const toasts = useToastStore.getState().toasts
    expect(toasts[0].id).not.toBe(toasts[1].id)
  })
})
