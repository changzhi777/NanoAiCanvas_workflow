import { describe, it, expect, beforeEach } from 'vitest'
import {
  usePromptTemplateStore,
  TEMPLATE_CATEGORIES,
} from '@/stores/promptTemplateStore'

describe('PromptTemplateStore', () => {
  beforeEach(() => {
    // Reset to defaults by re-setting templates
    const store = usePromptTemplateStore.getState()
    // Clear all templates and re-add defaults is not straightforward with persist,
    // so we test against whatever state exists
  })

  it('should have TEMPLATE_CATEGORIES exported', () => {
    expect(TEMPLATE_CATEGORIES).toBeInstanceOf(Array)
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(5)
    expect(TEMPLATE_CATEGORIES.some((c) => c.value === 'custom')).toBe(true)
  })

  it('should start with default templates', () => {
    const { templates } = usePromptTemplateStore.getState()
    expect(templates.length).toBeGreaterThanOrEqual(5)
  })

  it('should add a new template and return its id', () => {
    const beforeCount = usePromptTemplateStore.getState().templates.length

    const id = usePromptTemplateStore.getState().addTemplate({
      name: 'Test Template',
      description: 'A test template',
      category: 'custom',
      template: 'Test {subject}',
      params: {},
    })

    expect(id).toBeTruthy()
    expect(usePromptTemplateStore.getState().templates.length).toBe(beforeCount + 1)

    const added = usePromptTemplateStore.getState().getTemplate(id)
    expect(added?.name).toBe('Test Template')
    expect(added?.id).toBe(id)
    expect(added?.createdAt).toBeTruthy()
  })

  it('should update a template', () => {
    const id = usePromptTemplateStore.getState().addTemplate({
      name: 'Original',
      description: 'desc',
      category: 'style',
      template: 'original',
      params: {},
    })

    usePromptTemplateStore.getState().updateTemplate(id, { name: 'Updated', template: 'new template' })

    const updated = usePromptTemplateStore.getState().getTemplate(id)
    expect(updated?.name).toBe('Updated')
    expect(updated?.template).toBe('new template')
  })

  it('should delete a template', () => {
    const id = usePromptTemplateStore.getState().addTemplate({
      name: 'To Delete',
      description: 'desc',
      category: 'custom',
      template: 'delete me',
      params: {},
    })

    const beforeCount = usePromptTemplateStore.getState().templates.length
    usePromptTemplateStore.getState().deleteTemplate(id)

    expect(usePromptTemplateStore.getState().templates.length).toBe(beforeCount - 1)
    expect(usePromptTemplateStore.getState().getTemplate(id)).toBeUndefined()
  })

  it('should get template by id', () => {
    const { templates } = usePromptTemplateStore.getState()
    if (templates.length > 0) {
      const found = usePromptTemplateStore.getState().getTemplate(templates[0].id)
      expect(found).toEqual(templates[0])
    }

    expect(usePromptTemplateStore.getState().getTemplate('non-existent')).toBeUndefined()
  })

  it('should get templates by category', () => {
    // Add a known template in 'custom' category
    usePromptTemplateStore.getState().addTemplate({
      name: 'Custom Test',
      description: '',
      category: 'custom',
      template: 'test',
      params: {},
    })

    const customs = usePromptTemplateStore.getState().getTemplatesByCategory('custom')
    expect(customs.length).toBeGreaterThanOrEqual(1)
    customs.forEach((t) => {
      expect(t.category).toBe('custom')
    })
  })

  it('should duplicate a template', () => {
    const id = usePromptTemplateStore.getState().addTemplate({
      name: 'Original',
      description: 'desc',
      category: 'scene',
      template: 'scene template',
      params: { style: 'realistic' },
    })

    const beforeCount = usePromptTemplateStore.getState().templates.length
    const dupId = usePromptTemplateStore.getState().duplicateTemplate(id)

    expect(dupId).toBeTruthy()
    expect(dupId).not.toBe(id)
    expect(usePromptTemplateStore.getState().templates.length).toBe(beforeCount + 1)

    const dup = usePromptTemplateStore.getState().getTemplate(dupId)
    expect(dup?.name).toBe('Original (副本)')
    expect(dup?.template).toBe('scene template')
  })

  it('should return empty string when duplicating non-existent template', () => {
    const result = usePromptTemplateStore.getState().duplicateTemplate('non-existent')
    expect(result).toBe('')
  })
})
