import { describe, it, expect, beforeEach } from 'vitest'
import { useAppVisibilityStore, getTemplateVisibility, getNodeVisibility, isVisible, isActive } from '@/stores/appVisibilityStore'

describe('appVisibilityStore', () => {
  beforeEach(() => {
    useAppVisibilityStore.getState().resetToDefault()
  })

  describe('default visibility', () => {
    it('storyboard-shot-a-workflow should be active by default', () => {
      expect(getTemplateVisibility('storyboard-shot-a-workflow')).toBe('active')
    })

    it('tvc-video-01 should be active by default', () => {
      expect(getTemplateVisibility('tvc-video-01')).toBe('active')
    })

    it('unknown template should fallback to disabled', () => {
      expect(getTemplateVisibility('non-existent')).toBe('disabled')
    })

    it('input_text node should be active by default', () => {
      expect(getNodeVisibility('input_text')).toBe('active')
    })

    it('minimax_text node should be disabled by default', () => {
      expect(getNodeVisibility('minimax_text')).toBe('disabled')
    })

    it('unknown node should fallback to disabled', () => {
      expect(getNodeVisibility('non_existent_node')).toBe('disabled')
    })
  })

  describe('setTemplateVisibility', () => {
    it('should change template visibility', () => {
      useAppVisibilityStore.getState().setTemplateVisibility('skills-academic', 'active')
      expect(getTemplateVisibility('skills-academic')).toBe('active')
    })

    it('should hide a template', () => {
      useAppVisibilityStore.getState().setTemplateVisibility('storyboard-shot-a-workflow', 'hidden')
      expect(getTemplateVisibility('storyboard-shot-a-workflow')).toBe('hidden')
    })
  })

  describe('setNodeVisibility', () => {
    it('should change node visibility', () => {
      useAppVisibilityStore.getState().setNodeVisibility('minimax_text', 'active')
      expect(getNodeVisibility('minimax_text')).toBe('active')
    })
  })

  describe('setNano2ModuleVisibility', () => {
    it('should change nano2 module visibility', () => {
      useAppVisibilityStore.getState().setNano2ModuleVisibility('text-to-image', 'hidden')
      const state = useAppVisibilityStore.getState()
      expect(state.nano2Modules['text-to-image']).toBe('hidden')
    })
  })

  describe('syncFromServer', () => {
    it('should merge server data and update lastSynced', () => {
      useAppVisibilityStore.getState().syncFromServer({
        workflowTemplates: { 'skills-academic': 'active' },
        workflowNodes: { minimax_text: 'active' },
      })
      const state = useAppVisibilityStore.getState()
      expect(state.workflowTemplates['skills-academic']).toBe('active')
      expect(state.workflowNodes['minimax_text']).toBe('active')
      expect(state.lastSynced).not.toBeNull()
    })

    it('should not overwrite unprovided fields', () => {
      useAppVisibilityStore.getState().syncFromServer({
        workflowTemplates: { 'skills-academic': 'active' },
      })
      const state = useAppVisibilityStore.getState()
      // nano2Modules should remain untouched
      expect(state.nano2Modules['text-to-image']).toBe('active')
    })
  })

  describe('resetToDefault', () => {
    it('should restore all defaults', () => {
      useAppVisibilityStore.getState().setTemplateVisibility('storyboard-shot-a-workflow', 'hidden')
      useAppVisibilityStore.getState().setNodeVisibility('minimax_text', 'active')
      useAppVisibilityStore.getState().resetToDefault()
      expect(getTemplateVisibility('storyboard-shot-a-workflow')).toBe('active')
      expect(getNodeVisibility('minimax_text')).toBe('disabled')
    })
  })

  describe('helper functions', () => {
    it('isVisible returns true for active and disabled, false for hidden', () => {
      expect(isVisible('active')).toBe(true)
      expect(isVisible('disabled')).toBe(true)
      expect(isVisible('hidden')).toBe(false)
      expect(isVisible(undefined)).toBe(true)
    })

    it('isActive returns true only for active', () => {
      expect(isActive('active')).toBe(true)
      expect(isActive('disabled')).toBe(false)
      expect(isActive('hidden')).toBe(false)
      expect(isActive(undefined)).toBe(false)
    })
  })
})
