import { describe, it, expect, beforeEach } from 'vitest'
import { useEcommerceProductStore, type EcommerceStep } from '@/stores/nanoImageEcommerceProductStore'

describe('EcommerceProductStore', () => {
  beforeEach(() => {
    useEcommerceProductStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useEcommerceProductStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.currentStep).toBe('upload')
    expect(state.referenceImage).toBeNull()
    expect(state.productAnalysis).toBeNull()
    expect(state.prompts).toEqual([])
    expect(state.generatingIndex).toBe(-1)
    expect(state.generatedImages).toEqual([])
    expect(state.error).toBeNull()
  })

  it('should open and close dialog', () => {
    useEcommerceProductStore.getState().openDialog()
    expect(useEcommerceProductStore.getState().isDialogOpen).toBe(true)

    useEcommerceProductStore.getState().closeDialog()
    expect(useEcommerceProductStore.getState().isDialogOpen).toBe(false)
  })

  it('should close dialog resets all state to initial', () => {
    useEcommerceProductStore.getState().openDialog()
    useEcommerceProductStore.getState().setCurrentStep('analyzing')
    useEcommerceProductStore.getState().setError('test')

    useEcommerceProductStore.getState().closeDialog()

    const state = useEcommerceProductStore.getState()
    expect(state.currentStep).toBe('upload')
    expect(state.error).toBeNull()
  })

  it('should navigate through all steps', () => {
    const steps: EcommerceStep[] = ['upload', 'analyzing', 'prompts', 'generating', 'result']
    steps.forEach((step) => {
      useEcommerceProductStore.getState().setCurrentStep(step)
      expect(useEcommerceProductStore.getState().currentStep).toBe(step)
    })
  })

  it('should manage reference image', () => {
    const mockImage = { id: '1', url: 'data:image/png;base64,abc', file: new File([], 'test.png') }

    useEcommerceProductStore.getState().setReferenceImage(mockImage)
    expect(useEcommerceProductStore.getState().referenceImage).toEqual(mockImage)

    useEcommerceProductStore.getState().clearReferenceImage()
    expect(useEcommerceProductStore.getState().referenceImage).toBeNull()
  })

  it('should set product analysis', () => {
    const analysis = { product_name: 'Test Product', category: 'electronics' } as any
    useEcommerceProductStore.getState().setProductAnalysis(analysis)
    expect(useEcommerceProductStore.getState().productAnalysis).toEqual(analysis)

    useEcommerceProductStore.getState().setProductAnalysis(null)
    expect(useEcommerceProductStore.getState().productAnalysis).toBeNull()
  })

  it('should set and update prompts', () => {
    useEcommerceProductStore.getState().setPrompts(['p1', 'p2', 'p3'])
    expect(useEcommerceProductStore.getState().prompts).toEqual(['p1', 'p2', 'p3'])

    useEcommerceProductStore.getState().updatePrompt(1, 'updated')
    expect(useEcommerceProductStore.getState().prompts).toEqual(['p1', 'updated', 'p3'])
  })

  it('should track generation progress', () => {
    useEcommerceProductStore.getState().setGeneratingIndex(2)
    expect(useEcommerceProductStore.getState().generatingIndex).toBe(2)

    useEcommerceProductStore.getState().setGeneratingIndex(-1)
    expect(useEcommerceProductStore.getState().generatingIndex).toBe(-1)
  })

  it('should accumulate generated images', () => {
    useEcommerceProductStore.getState().addGeneratedImage({ id: '1', url: 'a.png', prompt: 'p', screen: 1 })
    useEcommerceProductStore.getState().addGeneratedImage({ id: '2', url: 'b.png', prompt: 'q', screen: 2 })

    expect(useEcommerceProductStore.getState().generatedImages).toHaveLength(2)
  })

  it('should clear generated images', () => {
    useEcommerceProductStore.getState().addGeneratedImage({ id: '1', url: 'a.png', prompt: 'p', screen: 1 })
    useEcommerceProductStore.getState().clearGeneratedImages()
    expect(useEcommerceProductStore.getState().generatedImages).toEqual([])
  })

  it('should handle error state', () => {
    useEcommerceProductStore.getState().setError('Upload failed')
    expect(useEcommerceProductStore.getState().error).toBe('Upload failed')

    useEcommerceProductStore.getState().setError(null)
    expect(useEcommerceProductStore.getState().error).toBeNull()
  })

  it('should full reset restore all state', () => {
    useEcommerceProductStore.getState().openDialog()
    useEcommerceProductStore.getState().setCurrentStep('result')
    useEcommerceProductStore.getState().setPrompts(['a'])
    useEcommerceProductStore.getState().setError('err')

    useEcommerceProductStore.getState().reset()

    const state = useEcommerceProductStore.getState()
    expect(state.isDialogOpen).toBe(false)
    expect(state.currentStep).toBe('upload')
    expect(state.prompts).toEqual([])
    expect(state.error).toBeNull()
  })
})
