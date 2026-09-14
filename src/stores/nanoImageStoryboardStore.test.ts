import { describe, it, expect, beforeEach } from 'vitest'
import {
  useStoryboardStore,
  parseAndNormalizeScript,
  normalizeCharacter,
  normalizeDialogue,
  normalizeScene,
  createDefaultCharacter,
  STORYBOARD_STYLE_OPTIONS,
  type StoryboardCharacter,
  type DialogueLine,
  type StoryboardScene,
} from '@/stores/nanoImageStoryboardStore'

describe('StoryboardStore', () => {
  beforeEach(() => {
    useStoryboardStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useStoryboardStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.activeTab).toBe('script')
    expect(state.isGenerating).toBe(false)
    expect(state.currentTask).toBeNull()
    expect(state.progress).toBe(0)
    expect(state.inputText).toBe('')
    expect(state.selectedStyle).toBe('comic')
    expect(state.script).toBeNull()
    expect(state.storyboardImages).toEqual([])
    expect(state.characterDesigns).toEqual([])
    expect(state.error).toBeNull()
  })

  it('should open and close dialog', () => {
    useStoryboardStore.getState().openDialog()
    expect(useStoryboardStore.getState().isOpen).toBe(true)

    useStoryboardStore.getState().closeDialog()
    expect(useStoryboardStore.getState().isOpen).toBe(false)
  })

  it('should switch tabs', () => {
    useStoryboardStore.getState().setActiveTab('characters')
    expect(useStoryboardStore.getState().activeTab).toBe('characters')

    useStoryboardStore.getState().setActiveTab('dialogues')
    expect(useStoryboardStore.getState().activeTab).toBe('dialogues')
  })

  it('should set input text and style', () => {
    useStoryboardStore.getState().setInputText('A story about cats')
    expect(useStoryboardStore.getState().inputText).toBe('A story about cats')

    useStoryboardStore.getState().setStyle('realistic')
    expect(useStoryboardStore.getState().selectedStyle).toBe('realistic')
  })

  it('should manage generating state', () => {
    useStoryboardStore.getState().setGenerating(true, 'script')
    const running = useStoryboardStore.getState()
    expect(running.isGenerating).toBe(true)
    expect(running.currentTask).toBe('script')
    expect(running.progress).toBe(0)

    useStoryboardStore.getState().setGenerating(false)
    const done = useStoryboardStore.getState()
    expect(done.isGenerating).toBe(false)
    expect(done.currentTask).toBeNull()
    expect(done.progress).toBe(100)
  })

  it('should update progress', () => {
    useStoryboardStore.getState().setProgress(50)
    expect(useStoryboardStore.getState().progress).toBe(50)
  })

  it('should set script', () => {
    const mockScript = {
      title: 'Test',
      totalDuration: '3:00',
      synopsis: 'Test synopsis',
      scenes: [],
      characters: [],
      allDialogues: [],
    }
    useStoryboardStore.getState().setScript(mockScript)
    expect(useStoryboardStore.getState().script).toEqual(mockScript)
  })

  it('should accumulate storyboard images', () => {
    useStoryboardStore.getState().addStoryboardImage('img1.png')
    useStoryboardStore.getState().addStoryboardImage('img2.png')
    expect(useStoryboardStore.getState().storyboardImages).toEqual(['img1.png', 'img2.png'])
  })

  it('should manage character designs', () => {
    // Set script first so character lookup works
    useStoryboardStore.getState().setScript({
      title: 'Test', totalDuration: '3:00', synopsis: '',
      scenes: [],
      characters: [{ id: 'char1', name: 'Alice', role: 'protagonist', description: '', appearance: {} as any, costume: {} as any, personality: {} as any }],
      allDialogues: [],
    })

    useStoryboardStore.getState().setCharacterDesign('char1', 'design.png')
    const designs = useStoryboardStore.getState().characterDesigns
    expect(designs).toHaveLength(1)
    expect(designs[0].characterId).toBe('char1')
    expect(designs[0].imageUrl).toBe('design.png')
  })

  it('should update existing character design', () => {
    useStoryboardStore.getState().setScript({
      title: 'Test', totalDuration: '3:00', synopsis: '',
      scenes: [],
      characters: [{ id: 'c1', name: 'B', role: 'supporting', description: '', appearance: {} as any, costume: {} as any, personality: {} as any }],
      allDialogues: [],
    })

    useStoryboardStore.getState().setCharacterDesign('c1', 'old.png')
    useStoryboardStore.getState().setCharacterDesign('c1', 'new.png')

    const designs = useStoryboardStore.getState().characterDesigns
    expect(designs).toHaveLength(1)
    expect(designs[0].imageUrl).toBe('new.png')
  })

  it('should handle error state', () => {
    useStoryboardStore.getState().setError('Generation failed')
    expect(useStoryboardStore.getState().error).toBe('Generation failed')

    useStoryboardStore.getState().setError(null)
    expect(useStoryboardStore.getState().error).toBeNull()
  })

  it('should reset to defaults (preserve isOpen)', () => {
    useStoryboardStore.getState().openDialog()
    useStoryboardStore.getState().setScript({ title: 'x' } as any)
    useStoryboardStore.getState().setGenerating(true, 'script')

    useStoryboardStore.getState().reset()

    const state = useStoryboardStore.getState()
    expect(state.isGenerating).toBe(false)
    expect(state.currentTask).toBeNull()
    expect(state.script).toBeNull()
    expect(state.storyboardImages).toEqual([])
    expect(state.characterDesigns).toEqual([])
    expect(state.error).toBeNull()
  })

  // ===== Helper functions =====
  describe('normalizeCharacter', () => {
    it('should fill missing fields with defaults', () => {
      const result = normalizeCharacter({ name: 'Alice' }, 0)
      expect(result.id).toBe('char_1')
      expect(result.name).toBe('Alice')
      expect(result.role).toBe('supporting')
      expect(result.appearance).toBeDefined()
      expect(result.costume).toBeDefined()
      expect(result.personality).toBeDefined()
    })

    it('should preserve provided fields', () => {
      const result = normalizeCharacter({
        id: 'c1', name: 'Bob', role: 'protagonist', description: 'Hero',
        appearance: { age: '25' } as any,
      }, 1)
      expect(result.id).toBe('c1')
      expect(result.role).toBe('protagonist')
    })
  })

  describe('normalizeDialogue', () => {
    it('should fill defaults', () => {
      const result = normalizeDialogue({ text: 'Hello' })
      expect(result.text).toBe('Hello')
      expect(result.emotion).toBe('neutral')
      expect(result.emotionIntensity).toBe(5)
      expect(result.speed).toBe(1.0)
    })
  })

  describe('normalizeScene', () => {
    it('should fill defaults', () => {
      const result = normalizeScene({})
      expect(result.id).toBe(0)
      expect(result.duration).toBe('0:30')
      expect(result.shotType).toBe('中景')
      expect(result.camera).toBe('固定镜头')
    })
  })

  describe('parseAndNormalizeScript', () => {
    it('should parse raw data into full script', () => {
      const result = parseAndNormalizeScript({
        title: 'My Story',
        characters: [{ name: 'Alice' }],
        scenes: [{ description: 'Scene 1' }],
      })
      expect(result.title).toBe('My Story')
      expect(result.characters).toHaveLength(1)
      expect(result.scenes).toHaveLength(1)
    })

    it('should handle empty input', () => {
      const result = parseAndNormalizeScript({})
      expect(result.title).toBe('未命名分镜头')
      expect(result.characters).toEqual([])
      expect(result.scenes).toEqual([])
    })
  })

  describe('createDefaultCharacter', () => {
    it('should create character with defaults', () => {
      const char = createDefaultCharacter('c1', 'Test', 'protagonist')
      expect(char.id).toBe('c1')
      expect(char.name).toBe('Test')
      expect(char.role).toBe('protagonist')
      expect(char.appearance).toBeDefined()
    })
  })

  describe('STORYBOARD_STYLE_OPTIONS', () => {
    it('should export 4 style options', () => {
      expect(STORYBOARD_STYLE_OPTIONS).toHaveLength(4)
      expect(STORYBOARD_STYLE_OPTIONS.map(s => s.value)).toEqual(
        expect.arrayContaining(['comic', 'realistic', 'anime', 'watercolor'])
      )
    })
  })
})
