import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'

// Mock TTS dependencies
vi.mock('@/lib/api/glm-tts', () => ({
  synthesizeSpeech: vi.fn(),
  blobToAudioUrl: vi.fn((blob) => `blob:${blob.size}`),
  revokeAudioUrl: vi.fn(),
}))

vi.mock('@/lib/api/glm-tts-clone', () => ({
  cloneVoiceFromAudio: vi.fn(),
  validateAudioForClone: vi.fn().mockResolvedValue({ valid: true, message: '' }),
}))

describe('StoryboardVoiceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStoryboardVoiceStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useStoryboardVoiceStore.getState()
    expect(state.globalVoice).toBe('tongtong')
    expect(state.globalSpeed).toBe(1.0)
    expect(state.globalVolume).toBe(1.0)
    expect(state.globalFormat).toBe('wav')
    expect(state.characterVoices).toEqual([])
    expect(state.clonedVoices).toEqual([])
    expect(state.dialogueAudios).toEqual([])
    expect(state.isGenerating).toBe(false)
    expect(state.generateError).toBeNull()
  })

  // ===== Global Settings =====
  it('should set global voice settings', () => {
    useStoryboardVoiceStore.getState().setGlobalVoice('male-1')
    expect(useStoryboardVoiceStore.getState().globalVoice).toBe('male-1')

    useStoryboardVoiceStore.getState().setGlobalSpeed(1.5)
    expect(useStoryboardVoiceStore.getState().globalSpeed).toBe(1.5)

    useStoryboardVoiceStore.getState().setGlobalVolume(0.8)
    expect(useStoryboardVoiceStore.getState().globalVolume).toBe(0.8)

    useStoryboardVoiceStore.getState().setGlobalFormat('mp3')
    expect(useStoryboardVoiceStore.getState().globalFormat).toBe('mp3')
  })

  // ===== Character Voice Mapping =====
  describe('characterVoices', () => {
    it('should set character voice (new)', () => {
      useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'voice-1', 'preset')

      const cv = useStoryboardVoiceStore.getState().getCharacterVoice('c1')
      expect(cv).toEqual({ characterId: 'c1', voiceId: 'voice-1', voiceType: 'preset' })
    })

    it('should update existing character voice', () => {
      useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'voice-1', 'preset')
      useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'voice-2', 'cloned')

      const cv = useStoryboardVoiceStore.getState().getCharacterVoice('c1')
      expect(cv?.voiceId).toBe('voice-2')
      expect(cv?.voiceType).toBe('cloned')
    })

    it('should return undefined for unmapped character', () => {
      expect(useStoryboardVoiceStore.getState().getCharacterVoice('nonexistent')).toBeUndefined()
    })

    it('should remove character voice', () => {
      useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'v1', 'preset')
      useStoryboardVoiceStore.getState().removeCharacterVoice('c1')

      expect(useStoryboardVoiceStore.getState().getCharacterVoice('c1')).toBeUndefined()
    })
  })

  // ===== Cloned Voices =====
  describe('clonedVoices', () => {
    it('should add and remove cloned voices', () => {
      const voice = { id: 'clone-1', name: 'My Voice', createdAt: new Date().toISOString() }
      useStoryboardVoiceStore.getState().addClonedVoice(voice)
      expect(useStoryboardVoiceStore.getState().clonedVoices).toHaveLength(1)

      useStoryboardVoiceStore.getState().removeClonedVoice('clone-1')
      expect(useStoryboardVoiceStore.getState().clonedVoices).toHaveLength(0)
    })

    it('should reset character mappings when cloning voice is removed', () => {
      useStoryboardVoiceStore.getState().setGlobalVoice('default-voice')
      useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'clone-1', 'cloned')
      useStoryboardVoiceStore.getState().addClonedVoice({ id: 'clone-1', name: 'V', createdAt: '' })

      useStoryboardVoiceStore.getState().removeClonedVoice('clone-1')

      const cv = useStoryboardVoiceStore.getState().getCharacterVoice('c1')
      expect(cv?.voiceId).toBe('default-voice')
      expect(cv?.voiceType).toBe('global')
    })
  })

  // ===== Dialogue Audios =====
  describe('dialogueAudios', () => {
    it('should add and retrieve dialogue audio', () => {
      const audio = {
        dialogueId: 'd1', sceneId: 1, characterId: 'c1', characterName: 'Alice',
        text: 'Hello', audioUrl: 'https://example.com/audio.mp3',
        params: {} as any, createdAt: new Date().toISOString(),
      }
      useStoryboardVoiceStore.getState().addDialogueAudio(audio)

      expect(useStoryboardVoiceStore.getState().getDialogueAudio('d1')).toEqual(audio)
    })

    it('should replace existing dialogue audio', () => {
      const audio1 = {
        dialogueId: 'd1', sceneId: 1, characterId: 'c1', characterName: 'A',
        text: 'Hi', audioUrl: 'url1', params: {} as any, createdAt: '',
      }
      const audio2 = { ...audio1, audioUrl: 'url2' }

      useStoryboardVoiceStore.getState().addDialogueAudio(audio1)
      useStoryboardVoiceStore.getState().addDialogueAudio(audio2)

      expect(useStoryboardVoiceStore.getState().dialogueAudios).toHaveLength(1)
      expect(useStoryboardVoiceStore.getState().getDialogueAudio('d1')?.audioUrl).toBe('url2')
    })

    it('should remove dialogue audio', () => {
      const audio = {
        dialogueId: 'd1', sceneId: 1, characterId: 'c1', characterName: 'A',
        text: 'Hi', audioUrl: 'https://example.com/a.mp3',
        params: {} as any, createdAt: '',
      }
      useStoryboardVoiceStore.getState().addDialogueAudio(audio)
      useStoryboardVoiceStore.getState().removeDialogueAudio('d1')

      expect(useStoryboardVoiceStore.getState().getDialogueAudio('d1')).toBeUndefined()
    })

    it('should clear all dialogue audios', () => {
      useStoryboardVoiceStore.getState().addDialogueAudio({
        dialogueId: 'd1', sceneId: 1, characterId: 'c1', characterName: 'A',
        text: 'Hi', audioUrl: 'https://example.com/a.mp3',
        params: {} as any, createdAt: '',
      })
      useStoryboardVoiceStore.getState().clearDialogueAudios()
      expect(useStoryboardVoiceStore.getState().dialogueAudios).toEqual([])
    })
  })

  // ===== Config Import/Export =====
  describe('config management', () => {
    it('should export voice config', () => {
      useStoryboardVoiceStore.getState().setGlobalVoice('v1')
      useStoryboardVoiceStore.getState().setGlobalSpeed(1.2)

      const config = useStoryboardVoiceStore.getState().getVoiceConfig()
      expect(config.globalVoice).toBe('v1')
      expect(config.globalSpeed).toBe(1.2)
      expect(config).toHaveProperty('characterVoices')
      expect(config).toHaveProperty('clonedVoices')
    })

    it('should import voice config', () => {
      useStoryboardVoiceStore.getState().setVoiceConfig({
        globalVoice: 'v2',
        globalSpeed: 0.8,
        globalFormat: 'mp3',
      })

      const state = useStoryboardVoiceStore.getState()
      expect(state.globalVoice).toBe('v2')
      expect(state.globalSpeed).toBe(0.8)
      expect(state.globalFormat).toBe('mp3')
    })
  })

  it('should reset all state', () => {
    useStoryboardVoiceStore.getState().setGlobalVoice('custom')
    useStoryboardVoiceStore.getState().setCharacterVoice('c1', 'v1', 'preset')

    useStoryboardVoiceStore.getState().reset()

    const state = useStoryboardVoiceStore.getState()
    expect(state.globalVoice).toBe('tongtong')
    expect(state.globalSpeed).toBe(1.0)
    expect(state.characterVoices).toEqual([])
    expect(state.dialogueAudios).toEqual([])
    expect(state.isGenerating).toBe(false)
    expect(state.generateError).toBeNull()
  })
})
