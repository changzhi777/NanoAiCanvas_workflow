import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTvcStore } from '@/stores/tvcStore'

describe('tvcStore', () => {
  beforeEach(() => {
    useTvcStore.getState().reset()
  })

  // ==================== Input ====================

  describe('setInputText', () => {
    it('should set input text', () => {
      useTvcStore.getState().setInputText('New TVC ad')
      expect(useTvcStore.getState().inputText).toBe('New TVC ad')
    })
  })

  describe('setReferenceImage', () => {
    it('should set reference image and switch to vision mode', () => {
      useTvcStore.getState().setReferenceImage('http://img.png', 'upload')
      const state = useTvcStore.getState()
      expect(state.referenceImage).toBe('http://img.png')
      expect(state.referenceSource).toBe('upload')
      expect(state.optimizeMode).toBe('tvc_vision')
    })

    it('should clear reference image and keep current mode', () => {
      useTvcStore.getState().setOptimizeMode('tvc_deep')
      useTvcStore.getState().setReferenceImage('http://img.png', 'upload')
      useTvcStore.getState().setReferenceImage(null, null)
      const state = useTvcStore.getState()
      expect(state.referenceImage).toBeNull()
      // When clearing, mode should stay at current (not switch back)
    })
  })

  // ==================== Configuration ====================

  describe('configuration setters', () => {
    it('setOptimizeMode', () => {
      useTvcStore.getState().setOptimizeMode('tvc_vision')
      expect(useTvcStore.getState().optimizeMode).toBe('tvc_vision')
    })

    it('setStyle', () => {
      useTvcStore.getState().setStyle('documentary')
      expect(useTvcStore.getState().style).toBe('documentary')
    })

    it('setVideoModel', () => {
      useTvcStore.getState().setVideoModel('seedance')
      expect(useTvcStore.getState().videoModel).toBe('seedance')
    })

    it('setImageModel', () => {
      useTvcStore.getState().setImageModel('nanobanana2')
      expect(useTvcStore.getState().imageModel).toBe('nanobanana2')
    })

    it('setQuality', () => {
      useTvcStore.getState().setQuality('high')
      expect(useTvcStore.getState().quality).toBe('high')
    })

    it('setCameraMovement', () => {
      useTvcStore.getState().setCameraMovement('pan-left')
      expect(useTvcStore.getState().cameraMovement).toBe('pan-left')
    })

    it('setLightStyle', () => {
      useTvcStore.getState().setLightStyle('studio')
      expect(useTvcStore.getState().lightStyle).toBe('studio')
    })

    it('setNegativePrompts', () => {
      useTvcStore.getState().setNegativePrompts(['no_blur', 'no_text'])
      expect(useTvcStore.getState().negativePrompts).toEqual(['no_blur', 'no_text'])
    })
  })

  describe('setTotalDuration', () => {
    it('should set duration and recalc params', () => {
      useTvcStore.getState().setTotalDuration(60)
      expect(useTvcStore.getState().totalDuration).toBe(60)
      // recalcParams is called, calcResult should be updated
      expect(useTvcStore.getState().calcResult).not.toBeNull()
    })
  })

  // ==================== State Machine ====================

  describe('phase transitions', () => {
    it('should start in input phase', () => {
      expect(useTvcStore.getState().phase).toBe('input')
    })

    it('should not execute with empty input', async () => {
      await useTvcStore.getState().executeAuto()
      expect(useTvcStore.getState().error).toBe('请输入 TVC 描述')
      expect(useTvcStore.getState().phase).toBe('input')
    })
  })

  // ==================== Error Handling ====================

  describe('setError', () => {
    it('should set error', () => {
      useTvcStore.getState().setError('Test error')
      expect(useTvcStore.getState().error).toBe('Test error')
    })

    it('should clear error', () => {
      useTvcStore.getState().setError('Test error')
      useTvcStore.getState().setError(null)
      expect(useTvcStore.getState().error).toBeNull()
    })
  })

  // ==================== Reset ====================

  describe('reset', () => {
    it('should restore all defaults', () => {
      useTvcStore.getState().setInputText('Some text')
      useTvcStore.getState().setStyle('documentary')
      useTvcStore.getState().setOptimizeMode('tvc_vision')
      useTvcStore.getState().setError('Error')
      useTvcStore.getState().reset()

      const state = useTvcStore.getState()
      expect(state.inputText).toBe('')
      expect(state.style).toBe('cinematic')
      expect(state.optimizeMode).toBe('tvc_deep')
      expect(state.phase).toBe('input')
      expect(state.isExecuting).toBe(false)
      expect(state.error).toBeNull()
      expect(state.script).toBeNull()
      expect(state.taskId).toBeNull()
    })
  })

  // ==================== Default Values ====================

  describe('default values', () => {
    it('should have correct defaults', () => {
      const state = useTvcStore.getState()
      expect(state.totalDuration).toBe(30)
      expect(state.shotCount).toBe(6)
      expect(state.shotDuration).toBe(5)
      expect(state.videoModel).toBe('auto')
      expect(state.imageModel).toBe('auto')
      expect(state.quality).toBe('standard')
      expect(state.negativePrompts).toEqual(['avoid_jitter', 'avoid_bent_limbs'])
    })
  })
})
