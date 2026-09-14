import { describe, it, expect, beforeEach } from 'vitest'
import { useArchitectureStore } from '@/stores/nanoImageArchitectureStore'

describe('ArchitectureStore', () => {
  beforeEach(() => {
    useArchitectureStore.setState({
      isDialogOpen: false,
      currentTab: 'interior',
      selectedScene: 'living-room',
      selectedStyle: 'modern',
      referenceImage: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useArchitectureStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.currentTab).toBe('interior')
    expect(state.selectedScene).toBe('living-room')
    expect(state.selectedStyle).toBe('modern')
    expect(state.referenceImage).toBeNull()
  })

  it('should open and close dialog', () => {
    useArchitectureStore.getState().openDialog()
    expect(useArchitectureStore.getState().isDialogOpen).toBe(true)

    useArchitectureStore.getState().closeDialog()
    expect(useArchitectureStore.getState().isDialogOpen).toBe(false)
  })

  it('should clear reference image on close', () => {
    const mockImage = { id: '1', url: 'test.png', file: new File([], 'test.png') }
    useArchitectureStore.setState({ referenceImage: mockImage, isDialogOpen: true })

    useArchitectureStore.getState().closeDialog()
    expect(useArchitectureStore.getState().referenceImage).toBeNull()
  })

  it('should switch tab and reset default scene', () => {
    useArchitectureStore.getState().setCurrentTab('exterior')
    const state = useArchitectureStore.getState()
    expect(state.currentTab).toBe('exterior')
    expect(state.selectedScene).toBe('residential')
  })

  it('should keep scene when switching to interior tab', () => {
    useArchitectureStore.getState().setCurrentTab('interior')
    expect(useArchitectureStore.getState().selectedScene).toBe('living-room')
  })

  it('should set scene and style independently', () => {
    useArchitectureStore.getState().setScene('kitchen')
    expect(useArchitectureStore.getState().selectedScene).toBe('kitchen')

    useArchitectureStore.getState().setStyle('minimalist')
    expect(useArchitectureStore.getState().selectedStyle).toBe('minimalist')
  })

  it('should manage reference image lifecycle', () => {
    const mockImage = { id: '1', url: 'data:image/png;base64,abc', file: new File([], 'test.png'), base64: 'abc' }

    useArchitectureStore.getState().setReferenceImage(mockImage)
    expect(useArchitectureStore.getState().referenceImage).toEqual(mockImage)

    useArchitectureStore.getState().clearReferenceImage()
    expect(useArchitectureStore.getState().referenceImage).toBeNull()
  })

  it('should allow setting reference image to null directly', () => {
    const mockImage = { id: '1', url: 'test.png', file: new File([], 'test.png') }
    useArchitectureStore.getState().setReferenceImage(mockImage)

    useArchitectureStore.getState().setReferenceImage(null)
    expect(useArchitectureStore.getState().referenceImage).toBeNull()
  })
})
