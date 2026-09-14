import { describe, it, expect, beforeEach } from 'vitest'
import { useKnowledgeCardStore } from '@/stores/nanoImageKnowledgeCardStore'

describe('KnowledgeCardStore', () => {
  beforeEach(() => {
    useKnowledgeCardStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useKnowledgeCardStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.selectedCategory).toBe('other')
    expect(state.selectedStyle).toBe('minimal')
  })

  it('should open and close dialog', () => {
    useKnowledgeCardStore.getState().openDialog()
    expect(useKnowledgeCardStore.getState().isDialogOpen).toBe(true)

    useKnowledgeCardStore.getState().closeDialog()
    expect(useKnowledgeCardStore.getState().isDialogOpen).toBe(false)
  })

  it('should set category', () => {
    useKnowledgeCardStore.getState().setCategory('technology')
    expect(useKnowledgeCardStore.getState().selectedCategory).toBe('technology')
  })

  it('should set style', () => {
    useKnowledgeCardStore.getState().setStyle('card')
    expect(useKnowledgeCardStore.getState().selectedStyle).toBe('card')
  })

  it('should reset category and style to defaults', () => {
    useKnowledgeCardStore.getState().setCategory('technology')
    useKnowledgeCardStore.getState().setStyle('card')
    useKnowledgeCardStore.getState().openDialog()

    useKnowledgeCardStore.getState().reset()
    const state = useKnowledgeCardStore.getState()
    expect(state.selectedCategory).toBe('other')
    expect(state.selectedStyle).toBe('minimal')
  })

  it('should preserve dialog state when changing category', () => {
    useKnowledgeCardStore.getState().openDialog()
    useKnowledgeCardStore.getState().setCategory('history')

    const state = useKnowledgeCardStore.getState()
    expect(state.isDialogOpen).toBe(true)
    expect(state.selectedCategory).toBe('history')
  })

  it('should not clear dialog state on close (only isDialogOpen changes)', () => {
    useKnowledgeCardStore.getState().setCategory('science')
    useKnowledgeCardStore.getState().setStyle('modern')
    useKnowledgeCardStore.getState().closeDialog()

    const state = useKnowledgeCardStore.getState()
    expect(state.isDialogOpen).toBe(false)
    // closeDialog only sets isDialogOpen, not category/style
    expect(state.selectedCategory).toBe('science')
    expect(state.selectedStyle).toBe('modern')
  })

  it('should handle multiple category changes', () => {
    useKnowledgeCardStore.getState().setCategory('technology')
    expect(useKnowledgeCardStore.getState().selectedCategory).toBe('technology')

    useKnowledgeCardStore.getState().setCategory('art')
    expect(useKnowledgeCardStore.getState().selectedCategory).toBe('art')
  })
})
