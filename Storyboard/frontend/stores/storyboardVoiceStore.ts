/**
 * 故事板语音合成状态管理
 * 支持全局音色设置、角色音色映射、克隆音色管理、对白音频生成
 */

import { create } from 'zustand'
import type {
  TTSParams,
  ClonedVoice,
  CharacterVoiceConfig,
  DialogueAudio,
  StoryboardVoiceConfig,
  PresetVoice,
} from '@/types'
import { synthesizeSpeech, blobToAudioUrl, revokeAudioUrl } from '@/lib/api/glm-tts'
import { cloneVoiceFromAudio, validateAudioForClone } from '@/lib/api/glm-tts-clone'
import { v4 as uuidv4 } from 'uuid'

// ============== 状态接口 ==============

interface StoryboardVoiceState {
  // 全局设置
  globalVoice: string
  globalSpeed: number
  globalVolume: number
  globalFormat: 'wav' | 'mp3' | 'pcm'

  // 角色音色映射
  characterVoices: CharacterVoiceConfig[]

  // 克隆音色列表
  clonedVoices: ClonedVoice[]

  // 对白音频列表
  dialogueAudios: DialogueAudio[]

  // 生成状态
  isGenerating: boolean
  generateProgress: number
  generateTotal: number
  generateCurrentId: string | null
  generateError: string | null

  // Actions
  setGlobalVoice: (voice: string) => void
  setGlobalSpeed: (speed: number) => void
  setGlobalVolume: (volume: number) => void
  setGlobalFormat: (format: 'wav' | 'mp3' | 'pcm') => void

  setCharacterVoice: (characterId: string, voiceId: string, voiceType: CharacterVoiceConfig['voiceType']) => void
  getCharacterVoice: (characterId: string) => CharacterVoiceConfig | undefined
  removeCharacterVoice: (characterId: string) => void

  addClonedVoice: (voice: ClonedVoice) => void
  removeClonedVoice: (voiceId: string) => void

  addDialogueAudio: (audio: DialogueAudio) => void
  removeDialogueAudio: (dialogueId: string) => void
  clearDialogueAudios: () => void
  getDialogueAudio: (dialogueId: string) => DialogueAudio | undefined

  // 高级操作
  generateSingleAudio: (apiKey: string, dialogueId: string, text: string, characterId: string, characterName: string) => Promise<void>
  generateAllAudios: (
    apiKey: string,
    dialogues: Array<{ id: string; sceneId: number; text: string; characterId: string; characterName: string }>
  ) => Promise<void>
  cloneVoiceFromAudio: (
    apiKey: string,
    audioBlob: Blob,
    voiceName: string,
    sampleText: string
  ) => Promise<ClonedVoice>

  // 配置导入导出
  getVoiceConfig: () => StoryboardVoiceConfig
  setVoiceConfig: (config: Partial<StoryboardVoiceConfig>) => void
  reset: () => void
}

// ============== 默认值 ==============

const DEFAULT_VOICE = 'tongtong'

const initialState = {
  globalVoice: DEFAULT_VOICE,
  globalSpeed: 1.0,
  globalVolume: 1.0,
  globalFormat: 'wav' as const,
  characterVoices: [],
  clonedVoices: [],
  dialogueAudios: [],
  isGenerating: false,
  generateProgress: 0,
  generateTotal: 0,
  generateCurrentId: null,
  generateError: null,
}

// ============== Store ==============

export const useStoryboardVoiceStore = create<StoryboardVoiceState>((set, get) => ({
  ...initialState,

  // ============== 全局设置 ==============

  setGlobalVoice: (voice) => set({ globalVoice: voice }),
  setGlobalSpeed: (speed) => set({ globalSpeed: speed }),
  setGlobalVolume: (volume) => set({ globalVolume: volume }),
  setGlobalFormat: (format) => set({ globalFormat: format }),

  // ============== 角色音色映射 ==============

  setCharacterVoice: (characterId, voiceId, voiceType) => {
    set((state) => {
      const existing = state.characterVoices.find(cv => cv.characterId === characterId)
      if (existing) {
        return {
          characterVoices: state.characterVoices.map(cv =>
            cv.characterId === characterId
              ? { ...cv, voiceId, voiceType }
              : cv
          ),
        }
      }
      return {
        characterVoices: [...state.characterVoices, { characterId, voiceId, voiceType }],
      }
    })
  },

  getCharacterVoice: (characterId) => {
    return get().characterVoices.find(cv => cv.characterId === characterId)
  },

  removeCharacterVoice: (characterId) => {
    set((state) => ({
      characterVoices: state.characterVoices.filter(cv => cv.characterId !== characterId),
    }))
  },

  // ============== 克隆音色 ==============

  addClonedVoice: (voice) => {
    set((state) => ({
      clonedVoices: [...state.clonedVoices, voice],
    }))
  },

  removeClonedVoice: (voiceId) => {
    set((state) => ({
      clonedVoices: state.clonedVoices.filter(v => v.id !== voiceId),
      // 同时移除使用该音色的角色映射
      characterVoices: state.characterVoices.map(cv =>
        cv.voiceId === voiceId ? { ...cv, voiceId: get().globalVoice, voiceType: 'global' } : cv
      ),
    }))
  },

  // ============== 对白音频 ==============

  addDialogueAudio: (audio) => {
    set((state) => {
      // 如果已存在，先移除旧的（释放URL）
      const existing = state.dialogueAudios.find(da => da.dialogueId === audio.dialogueId)
      if (existing?.audioUrl.startsWith('blob:')) {
        revokeAudioUrl(existing.audioUrl)
      }
      return {
        dialogueAudios: [
          ...state.dialogueAudios.filter(da => da.dialogueId !== audio.dialogueId),
          audio,
        ],
      }
    })
  },

  removeDialogueAudio: (dialogueId) => {
    set((state) => {
      const existing = state.dialogueAudios.find(da => da.dialogueId === dialogueId)
      if (existing?.audioUrl.startsWith('blob:')) {
        revokeAudioUrl(existing.audioUrl)
      }
      return {
        dialogueAudios: state.dialogueAudios.filter(da => da.dialogueId !== dialogueId),
      }
    })
  },

  clearDialogueAudios: () => {
    const { dialogueAudios } = get()
    dialogueAudios.forEach(da => {
      if (da.audioUrl.startsWith('blob:')) {
        revokeAudioUrl(da.audioUrl)
      }
    })
    set({ dialogueAudios: [] })
  },

  getDialogueAudio: (dialogueId) => {
    return get().dialogueAudios.find(da => da.dialogueId === dialogueId)
  },

  // ============== 高级操作 ==============

  generateSingleAudio: async (apiKey, dialogueId, text, characterId, characterName) => {
    const state = get()

    // 获取该角色的音色配置
    const characterVoice = state.getCharacterVoice(characterId)
    let voiceId = state.globalVoice

    if (characterVoice?.voiceType === 'preset' || characterVoice?.voiceType === 'cloned') {
      voiceId = characterVoice.voiceId
    }

    const params: TTSParams = {
      voice: voiceId,
      speed: state.globalSpeed,
      volume: state.globalVolume,
      responseFormat: state.globalFormat,
    }

    set({
      isGenerating: true,
      generateCurrentId: dialogueId,
      generateError: null,
    })

    try {
      const audioBlob = await synthesizeSpeech(apiKey, text, params)
      const audioUrl = blobToAudioUrl(audioBlob)

      const audio: DialogueAudio = {
        dialogueId,
        sceneId: parseInt(dialogueId.split('_')[0]) || 0,
        characterId,
        characterName,
        text,
        audioUrl,
        params,
        createdAt: new Date().toISOString(),
      }

      get().addDialogueAudio(audio)
    } catch (error: any) {
      set({ generateError: error.message || '音频生成失败' })
      throw error
    } finally {
      set({ isGenerating: false, generateCurrentId: null })
    }
  },

  generateAllAudios: async (apiKey, dialogues) => {
    const state = get()
    const total = dialogues.length

    set({
      isGenerating: true,
      generateProgress: 0,
      generateTotal: total,
      generateError: null,
    })

    try {
      for (let i = 0; i < dialogues.length; i++) {
        const d = dialogues[i]
        set({ generateProgress: i, generateCurrentId: d.id })

        await get().generateSingleAudio(apiKey, d.id, d.text, d.characterId, d.characterName)

        set({ generateProgress: i + 1 })
      }
    } catch (error: any) {
      set({ generateError: error.message || '批量生成失败' })
      throw error
    } finally {
      set({ isGenerating: false, generateCurrentId: null })
    }
  },

  cloneVoiceFromAudio: async (apiKey, audioBlob, voiceName, sampleText) => {
    // 验证音频
    const validation = await validateAudioForClone(audioBlob)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    try {
      const result = await cloneVoiceFromAudio(
        apiKey,
        audioBlob,
        voiceName,
        sampleText,
        sampleText,
        (step, progress) => {
          console.log(`[VoiceClone] ${step}: ${progress}%`)
        }
      )

      const clonedVoice: ClonedVoice = {
        id: result.voiceId,
        name: voiceName,
        createdAt: new Date().toISOString(),
      }

      get().addClonedVoice(clonedVoice)
      return clonedVoice
    } catch (error: any) {
      console.error('[VoiceClone] 克隆失败:', error)
      throw error
    }
  },

  // ============== 配置导入导出 ==============

  getVoiceConfig: () => {
    const state = get()
    return {
      globalVoice: state.globalVoice,
      globalSpeed: state.globalSpeed,
      globalVolume: state.globalVolume,
      globalFormat: state.globalFormat,
      characterVoices: state.characterVoices,
      clonedVoices: state.clonedVoices,
    }
  },

  setVoiceConfig: (config) => {
    set((state) => ({
      ...state,
      ...config,
    }))
  },

  reset: () => {
    // 清理音频URL
    get().clearDialogueAudios()
    set(initialState)
  },
}))
