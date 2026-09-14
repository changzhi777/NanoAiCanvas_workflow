import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIMETextarea } from '@/hooks/useIMETextarea'

describe('useIMETextarea', () => {
  it('should return store value when not composing', () => {
    const { result } = renderHook(() => useIMETextarea('initial text'))

    expect(result.current.value).toBe('initial text')
  })

  it('should switch to draft during composition', () => {
    const { result } = renderHook(() => useIMETextarea('store value'))

    // Start composition
    act(() => {
      result.current.onCompositionStart()
    })

    // Simulate onChange during composition
    act(() => {
      const onChange = result.current.createOnChange(vi.fn())
      onChange({ target: { value: 'composing text' } } as any)
    })

    expect(result.current.value).toBe('composing text')
  })

  it('should commit draft to store on composition end', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useIMETextarea('store value'))

    act(() => {
      result.current.onCompositionStart()
    })

    act(() => {
      const onChange = result.current.createOnChange(onCommit)
      onChange({ target: { value: 'composing text' } } as any)
    })

    // End composition
    act(() => {
      result.current.handleCompositionEnd(
        { target: { value: 'final text' } } as any,
        onCommit
      )
    })

    expect(onCommit).toHaveBeenCalledWith('final text')
    // After composition, value reverts to store value (draft cleared)
    expect(result.current.value).toBe('store value')
  })

  it('should pass through non-composition changes to onCommit', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useIMETextarea('initial'))

    act(() => {
      const onChange = result.current.createOnChange(onCommit)
      onChange({ target: { value: 'direct input' } } as any)
    })

    expect(onCommit).toHaveBeenCalledWith('direct input')
    expect(result.current.value).toBe('initial') // still store value
  })

  it('should not commit during composition', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useIMETextarea('initial'))

    act(() => { result.current.onCompositionStart() })

    act(() => {
      const onChange = result.current.createOnChange(onCommit)
      onChange({ target: { value: 'typing...' } } as any)
    })

    expect(onCommit).not.toHaveBeenCalled()
    expect(result.current.value).toBe('typing...')
  })

  it('should track composing state via isComposingRef', () => {
    const { result } = renderHook(() => useIMETextarea(''))

    expect(result.current.isComposingRef.current).toBe(false)

    act(() => { result.current.onCompositionStart() })
    expect(result.current.isComposingRef.current).toBe(true)

    act(() => {
      result.current.handleCompositionEnd(
        { target: { value: '' } } as any,
        vi.fn()
      )
    })
    expect(result.current.isComposingRef.current).toBe(false)
  })

  it('should handle multiple composition cycles', () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useIMETextarea('base'))

    // First cycle
    act(() => { result.current.onCompositionStart() })
    act(() => {
      result.current.createOnChange(onCommit)({ target: { value: 'first' } } as any)
    })
    act(() => {
      result.current.handleCompositionEnd({ target: { value: 'first done' } } as any, onCommit)
    })

    expect(onCommit).toHaveBeenCalledWith('first done')

    // Second cycle
    act(() => { result.current.onCompositionStart() })
    act(() => {
      result.current.createOnChange(onCommit)({ target: { value: 'second' } } as any)
    })

    expect(result.current.value).toBe('second')
  })
})
