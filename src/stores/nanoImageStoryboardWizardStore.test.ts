import { describe, it, expect, beforeEach } from 'vitest'
import { useStoryboardWizardStore } from '@/stores/nanoImageStoryboardWizardStore'

describe('StoryboardWizardStore', () => {
  beforeEach(() => {
    useStoryboardWizardStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useStoryboardWizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.inputText).toBe('')
    expect(state.selectedStyle).toBe('comic')
    expect(state.scriptData).toBeNull()
    expect(state.storyboardImages).toEqual([])
    expect(state.dialogues).toEqual([])
    expect(state.characterPrompts).toEqual([])
  })

  it('should navigate forward with nextStep', () => {
    useStoryboardWizardStore.getState().nextStep()
    expect(useStoryboardWizardStore.getState().currentStep).toBe(2)

    useStoryboardWizardStore.getState().nextStep()
    expect(useStoryboardWizardStore.getState().currentStep).toBe(3)

    useStoryboardWizardStore.getState().nextStep()
    expect(useStoryboardWizardStore.getState().currentStep).toBe(4)
  })

  it('should cap at step 4', () => {
    useStoryboardWizardStore.getState().nextStep()
    useStoryboardWizardStore.getState().nextStep()
    useStoryboardWizardStore.getState().nextStep()
    useStoryboardWizardStore.getState().nextStep() // 5th call, should cap at 4
    expect(useStoryboardWizardStore.getState().currentStep).toBe(4)
  })

  it('should navigate backward with prevStep', () => {
    useStoryboardWizardStore.getState().goToStep(3)
    useStoryboardWizardStore.getState().prevStep()
    expect(useStoryboardWizardStore.getState().currentStep).toBe(2)
  })

  it('should cap at step 1 going back', () => {
    useStoryboardWizardStore.getState().prevStep()
    expect(useStoryboardWizardStore.getState().currentStep).toBe(1)
  })

  it('should jump to step with goToStep', () => {
    useStoryboardWizardStore.getState().goToStep(4)
    expect(useStoryboardWizardStore.getState().currentStep).toBe(4)
  })

  it('should set input text', () => {
    useStoryboardWizardStore.getState().setInputText('A story about space')
    expect(useStoryboardWizardStore.getState().inputText).toBe('A story about space')
  })

  it('should set selected style with setSelectedStyle', () => {
    useStoryboardWizardStore.getState().setSelectedStyle('realistic')
    expect(useStoryboardWizardStore.getState().selectedStyle).toBe('realistic')
  })

  it('should update script data', () => {
    const scriptData = { title: 'Test', synopsis: 'A test', scenes: [] }
    useStoryboardWizardStore.getState().setScriptData(scriptData as any)
    expect(useStoryboardWizardStore.getState().scriptData).toEqual(scriptData)
  })

  it('should update script partially', () => {
    useStoryboardWizardStore.getState().setScriptData({ title: 'Original', synopsis: '', scenes: [] } as any)
    useStoryboardWizardStore.getState().updateScript({ title: 'Updated' })

    expect(useStoryboardWizardStore.getState().scriptData?.title).toBe('Updated')
  })

  it('should not update script when null', () => {
    useStoryboardWizardStore.getState().updateScript({ title: 'Updated' })
    expect(useStoryboardWizardStore.getState().scriptData).toBeNull()
  })

  it('should manage storyboard images', () => {
    const img = { id: 'img1', url: 'a.png', prompt: 'test', order: 1 }
    useStoryboardWizardStore.getState().setStoryboardImages([img] as any)
    expect(useStoryboardWizardStore.getState().storyboardImages).toHaveLength(1)

    useStoryboardWizardStore.getState().addStoryboardImage({ id: 'img2', url: 'b.png', prompt: 'test2', order: 2 } as any)
    expect(useStoryboardWizardStore.getState().storyboardImages).toHaveLength(2)
  })

  it('should update storyboard image', () => {
    useStoryboardWizardStore.getState().setStoryboardImages([
      { id: 'img1', url: 'old.png', prompt: 'test', order: 1 },
    ] as any)

    useStoryboardWizardStore.getState().updateStoryboardImage('img1', { url: 'new.png' })
    expect(useStoryboardWizardStore.getState().storyboardImages[0].url).toBe('new.png')
  })

  it('should remove storyboard image', () => {
    useStoryboardWizardStore.getState().setStoryboardImages([
      { id: 'img1', url: 'a.png', prompt: 'test', order: 1 },
      { id: 'img2', url: 'b.png', prompt: 'test2', order: 2 },
    ] as any)

    useStoryboardWizardStore.getState().removeStoryboardImage('img1')
    expect(useStoryboardWizardStore.getState().storyboardImages).toHaveLength(1)
    expect(useStoryboardWizardStore.getState().storyboardImages[0].id).toBe('img2')
  })

  it('should reorder storyboard images', () => {
    useStoryboardWizardStore.getState().setStoryboardImages([
      { id: 'a', url: 'a.png', prompt: '', order: 1 },
      { id: 'b', url: 'b.png', prompt: '', order: 2 },
      { id: 'c', url: 'c.png', prompt: '', order: 3 },
    ] as any)

    useStoryboardWizardStore.getState().reorderStoryboardImages(0, 2)

    const images = useStoryboardWizardStore.getState().storyboardImages
    expect(images[0].id).toBe('b')
    expect(images[1].id).toBe('c')
    expect(images[2].id).toBe('a')
    expect(images[0].order).toBe(1)
    expect(images[1].order).toBe(2)
    expect(images[2].order).toBe(3)
  })

  it('should manage dialogues', () => {
    const dialogues = [
      { characterId: 'c1', characterName: 'Alice', text: 'Hello', emotion: 'happy' },
    ]
    useStoryboardWizardStore.getState().setDialogues(dialogues as any)
    expect(useStoryboardWizardStore.getState().dialogues).toHaveLength(1)

    useStoryboardWizardStore.getState().updateDialogue(0, { text: 'Hi' })
    expect(useStoryboardWizardStore.getState().dialogues[0].text).toBe('Hi')
  })

  it('should manage character prompts', () => {
    const prompts = [
      { id: 'p1', characterId: 'c1', characterName: 'Alice', prompt: 'test', negativePrompt: '', style: 'comic' },
    ]
    useStoryboardWizardStore.getState().setCharacterPrompts(prompts as any)
    expect(useStoryboardWizardStore.getState().characterPrompts).toHaveLength(1)

    useStoryboardWizardStore.getState().updateCharacterPrompt('p1', { prompt: 'updated' })
    expect(useStoryboardWizardStore.getState().characterPrompts[0].prompt).toBe('updated')
  })

  it('should generate character prompts from script data', async () => {
    useStoryboardWizardStore.setState({
      scriptData: {
        title: 'Test',
        synopsis: '',
        scenes: [],
        characters: [
          {
            id: 'c1', name: 'Alice', role: 'protagonist', description: 'Hero',
            appearance: { age: '25', gender: 'female' },
          },
        ],
      } as any,
    })

    await useStoryboardWizardStore.getState().generateCharacterPrompts()

    const prompts = useStoryboardWizardStore.getState().characterPrompts
    expect(prompts).toHaveLength(1)
    expect(prompts[0].characterName).toBe('Alice')
    expect(prompts[0].prompt).toContain('Alice')
  })

  it('should not generate prompts without characters', async () => {
    useStoryboardWizardStore.setState({ scriptData: { title: 'x', scenes: [], characters: [] } as any })
    await useStoryboardWizardStore.getState().generateCharacterPrompts()
    expect(useStoryboardWizardStore.getState().characterPrompts).toEqual([])
  })

  it('should not generate prompts without scriptData', async () => {
    useStoryboardWizardStore.setState({ scriptData: null })
    await useStoryboardWizardStore.getState().generateCharacterPrompts()
    expect(useStoryboardWizardStore.getState().characterPrompts).toEqual([])
  })

  it('should export script as markdown', () => {
    useStoryboardWizardStore.setState({
      scriptData: {
        title: 'Test Story',
        synopsis: 'A test',
        scenes: [{ shotType: '中景', duration: '0:30', camera: '固定', description: 'A scene', narrator: '' }],
      } as any,
    })

    const md = useStoryboardWizardStore.getState().exportScript('md')
    expect(md).toContain('# Test Story')
    expect(md).toContain('镜头 1')
  })

  it('should export script as JSON', () => {
    useStoryboardWizardStore.setState({
      scriptData: { title: 'Test', synopsis: '', scenes: [] } as any,
    })

    const json = useStoryboardWizardStore.getState().exportScript('json')
    const parsed = JSON.parse(json!)
    expect(parsed.title).toBe('Test')
  })

  it('should return null export without script', () => {
    expect(useStoryboardWizardStore.getState().exportScript('json')).toBeNull()
  })

  it('should import script from JSON', () => {
    const json = JSON.stringify({ title: 'Imported', synopsis: 'test', scenes: [], characters: [{ id: 'c1', name: 'A', role: 'protagonist', description: '' }] })
    const result = useStoryboardWizardStore.getState().importScript(json, 'json')

    expect(result.success).toBe(true)
    expect(useStoryboardWizardStore.getState().scriptData?.title).toBe('Imported')
  })

  it('should import script from markdown', () => {
    const md = '# My Script\n\nSome synopsis text here.'
    const result = useStoryboardWizardStore.getState().importScript(md, 'md')

    expect(result.success).toBe(true)
    expect(useStoryboardWizardStore.getState().scriptData?.title).toBe('My Script')
  })

  it('should handle import error', () => {
    const result = useStoryboardWizardStore.getState().importScript('invalid json{{{', 'json')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should get wizard payload', () => {
    useStoryboardWizardStore.setState({ inputText: 'test input', selectedStyle: 'anime' })
    const payload = useStoryboardWizardStore.getState().getWizardPayload()

    expect(payload.inputText).toBe('test input')
    expect(payload.style).toBe('anime')
    expect(payload).toHaveProperty('script')
    expect(payload).toHaveProperty('storyboardImages')
  })

  it('should download character template', () => {
    const template = useStoryboardWizardStore.getState().downloadCharacterTemplate()
    expect(template).toContain('角色设计模板')
    expect(template).toContain('AI 绘图提示词')
  })

  it('should reset all state', () => {
    useStoryboardWizardStore.getState().goToStep(3)
    useStoryboardWizardStore.getState().setScriptData({ title: 'x' } as any)
    useStoryboardWizardStore.getState().setInputText('some text')

    useStoryboardWizardStore.getState().reset()

    const state = useStoryboardWizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.inputText).toBe('')
    expect(state.scriptData).toBeNull()
    expect(state.storyboardImages).toEqual([])
    expect(state.dialogues).toEqual([])
    expect(state.characterPrompts).toEqual([])
  })

  it('should set generating flags', () => {
    useStoryboardWizardStore.getState().setIsGeneratingScript(true)
    expect(useStoryboardWizardStore.getState().isGeneratingScript).toBe(true)

    useStoryboardWizardStore.getState().setIsGeneratingStoryboard(true)
    expect(useStoryboardWizardStore.getState().isGeneratingStoryboard).toBe(true)

    useStoryboardWizardStore.getState().setIsGeneratingDialogues(true)
    expect(useStoryboardWizardStore.getState().isGeneratingDialogues).toBe(true)

    useStoryboardWizardStore.getState().setIsGeneratingCharacters(true)
    expect(useStoryboardWizardStore.getState().isGeneratingCharacters).toBe(true)
  })
})
