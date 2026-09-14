import { describe, it, expect, beforeEach } from 'vitest'
import { useCharacterDesignStore } from '@/stores/nanoImageCharacterDesignStore'

describe('CharacterDesignStore', () => {
  beforeEach(() => {
    useCharacterDesignStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useCharacterDesignStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.referenceImage).toBeNull()
  })

  it('should open and close dialog', () => {
    useCharacterDesignStore.getState().openDialog()
    expect(useCharacterDesignStore.getState().isDialogOpen).toBe(true)

    useCharacterDesignStore.getState().closeDialog()
    expect(useCharacterDesignStore.getState().isDialogOpen).toBe(false)
  })

  it('should clear reference image on dialog close', () => {
    const mockImage = { id: '1', url: 'test.png' }
    useCharacterDesignStore.setState({ referenceImage: mockImage, isDialogOpen: true })

    useCharacterDesignStore.getState().closeDialog()
    expect(useCharacterDesignStore.getState().referenceImage).toBeNull()
  })

  it('should set and clear reference image', () => {
    const mockImage = { id: 'img-1', url: 'data:image/png;base64,abc' }

    useCharacterDesignStore.getState().setReferenceImage(mockImage)
    expect(useCharacterDesignStore.getState().referenceImage).toEqual(mockImage)

    useCharacterDesignStore.getState().clearReferenceImage()
    expect(useCharacterDesignStore.getState().referenceImage).toBeNull()
  })

  it('should allow setting reference image to null', () => {
    const mockImage = { id: '1', url: 'test.png' }
    useCharacterDesignStore.getState().setReferenceImage(mockImage)

    useCharacterDesignStore.getState().setReferenceImage(null)
    expect(useCharacterDesignStore.getState().referenceImage).toBeNull()
  })

  it('should reset all state to defaults', () => {
    const mockImage = { id: '1', url: 'test.png' }
    useCharacterDesignStore.setState({ isDialogOpen: true, referenceImage: mockImage })

    useCharacterDesignStore.getState().reset()
    const state = useCharacterDesignStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.referenceImage).toBeNull()
  })
})
