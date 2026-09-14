import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasHistory } from '@/hooks/useCanvasHistory'

// Mock Redux hooks
const mockDispatch = vi.fn()

vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: vi.fn((selector: any) => selector()),
}))

vi.mock('@/store/slices/canvasSlice', () => ({
  setNodes: vi.fn((nodes) => ({ type: 'canvas/setNodes', payload: nodes })),
  setEdges: vi.fn((edges) => ({ type: 'canvas/setEdges', payload: edges })),
  selectNodes: () => [{ id: 'n1', data: { label: 'A' } }],
  selectEdges: () => [{ id: 'e1', source: 'n1', target: 'n2' }],
}))

describe('useCanvasHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return false for undo when no history', () => {
    const { result } = renderHook(() => useCanvasHistory())

    let success = true
    act(() => { success = result.current.undo() })

    expect(success).toBe(false)
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should return false for redo when no future', () => {
    const { result } = renderHook(() => useCanvasHistory())

    let success = true
    act(() => { success = result.current.redo() })

    expect(success).toBe(false)
  })

  it('should dispatch setNodes/setEdges on undo after recording', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })

    let success = false
    act(() => { success = result.current.undo() })

    expect(success).toBe(true)
    expect(mockDispatch).toHaveBeenCalledTimes(2) // setNodes + setEdges
  })

  it('should dispatch on redo after undo', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })
    act(() => { result.current.undo() })
    mockDispatch.mockClear()

    let success = false
    act(() => { success = result.current.redo() })

    expect(success).toBe(true)
    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })

  it('should support multiple undo levels', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })
    act(() => { result.current.recordState() })

    // First undo succeeds
    let s1 = false
    act(() => { s1 = result.current.undo() })
    expect(s1).toBe(true)

    // Second undo succeeds
    let s2 = false
    act(() => { s2 = result.current.undo() })
    expect(s2).toBe(true)

    // Third undo fails (no more history)
    let s3 = true
    act(() => { s3 = result.current.undo() })
    expect(s3).toBe(false)
  })

  it('should support redo after multiple undos', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })
    act(() => { result.current.recordState() })
    act(() => { result.current.undo() })
    act(() => { result.current.undo() })

    // First redo
    let s1 = false
    act(() => { s1 = result.current.redo() })
    expect(s1).toBe(true)

    // Second redo
    let s2 = false
    act(() => { s2 = result.current.redo() })
    expect(s2).toBe(true)

    // No more redo
    let s3 = true
    act(() => { s3 = result.current.redo() })
    expect(s3).toBe(false)
  })

  it('should clear history completely', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })
    act(() => { result.current.clearHistory() })

    // Undo should fail after clear
    let success = true
    act(() => { success = result.current.undo() })
    expect(success).toBe(false)
  })

  it('should clear future when recording after undo', () => {
    const { result } = renderHook(() => useCanvasHistory())

    act(() => { result.current.recordState() })
    act(() => { result.current.undo() })

    // Record new state clears future
    act(() => { result.current.recordState() })

    // Redo should fail
    let success = true
    act(() => { success = result.current.redo() })
    expect(success).toBe(false)
  })

  it('should expose recordState, undo, redo, clearHistory as functions', () => {
    const { result } = renderHook(() => useCanvasHistory())

    expect(result.current.recordState).toBeInstanceOf(Function)
    expect(result.current.undo).toBeInstanceOf(Function)
    expect(result.current.redo).toBeInstanceOf(Function)
    expect(result.current.clearHistory).toBeInstanceOf(Function)
  })
})
