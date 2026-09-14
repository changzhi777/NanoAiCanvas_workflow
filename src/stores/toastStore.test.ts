import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from '@/stores/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('addToast should add a toast with correct type and message', () => {
    useToastStore.getState().addToast('success', '操作成功')
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('操作成功')
  })

  it('addToast should generate unique ids', () => {
    useToastStore.getState().addToast('info', 'A')
    useToastStore.getState().addToast('error', 'B')
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(2)
    expect(toasts[0].id).not.toBe(toasts[1].id)
  })

  it('addToast should append to existing toasts', () => {
    useToastStore.getState().addToast('info', 'First')
    useToastStore.getState().addToast('error', 'Second')
    const { toasts } = useToastStore.getState()
    expect(toasts[0].message).toBe('First')
    expect(toasts[1].message).toBe('Second')
  })

  it('removeToast should remove toast by id', () => {
    useToastStore.getState().addToast('info', 'Keep')
    useToastStore.getState().addToast('error', 'Remove')
    const { toasts } = useToastStore.getState()
    const removeId = toasts[1].id
    useToastStore.getState().removeToast(removeId)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Keep')
  })

  it('removeToast on non-existent id should not crash', () => {
    useToastStore.getState().addToast('info', 'A')
    useToastStore.getState().removeToast('non-existent')
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('supports all toast types', () => {
    const types = ['success', 'error', 'info'] as const
    types.forEach(t => useToastStore.getState().addToast(t, `${t} msg`))
    const { toasts } = useToastStore.getState()
    expect(toasts.map(t => t.type)).toEqual(['success', 'error', 'info'])
  })
})
