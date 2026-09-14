/**
 * 故事板功能状态管理
 * 增强版：支持详细角色属性、对白情绪标注、故事板图表
 */

import { create } from 'zustand'

// ============== 对白相关类型 ==============

/** 情绪类型 */
export type DialogueEmotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised'
  | 'fearful' | 'disgusted' | 'contemptuous' | 'excited' | 'calm'

/** 语气类型 */
export type DialogueTone =
  | 'normal' | 'whisper' | 'shout' | 'sarcastic'
  | 'gentle' | 'stern' | 'playful' | 'hesitant' | 'confident'

/** 对白行 */
export interface DialogueLine {
  characterId: string        // 角色ID
  characterName: string      // 角色名
  text: string               // 对白文本
  emotion: DialogueEmotion   // 情绪
  emotionIntensity: number   // 情绪强度 1-10
  tone: DialogueTone         // 语气
  speed: number              // 语速 0.5-2.0
  pause: number              // 停顿时长(秒)
  stageDirection?: string    // 舞台指示
}

// ============== 角色相关类型 ==============

/** 角色外观 */
export interface CharacterAppearance {
  age: string                // 年龄
  gender: string             // 性别
  height: string             // 身高
  build: string              // 体型
  hairColor: string          // 发色
  hairStyle: string          // 发型
  eyeColor: string           // 瞳色
  skinTone: string           // 肤色
  distinctiveFeatures: string[] // 显著特征
}

/** 角色服装 */
export interface CharacterCostume {
  mainOutfit: string         // 主要服装
  accessories: string[]      // 配饰
  colors: string[]           // 主色调
}

/** 角色性格 */
export interface CharacterPersonality {
  traits: string[]           // 性格特点
  mannerisms: string[]       // 习惯动作
  speakingStyle: string      // 说话风格
}

/** 角色重要性 */
export type CharacterRole = 'protagonist' | 'supporting' | 'minor'

/** 增强的角色结构 */
export interface StoryboardCharacter {
  id: string                 // 唯一ID
  name: string
  role: CharacterRole        // 角色重要性
  description: string        // 简短描述
  appearance: CharacterAppearance
  costume: CharacterCostume
  personality: CharacterPersonality
  referenceImageUrl?: string // 参考图URL
}

// ============== 场景相关类型 ==============

/** 增强的场景结构 */
export interface StoryboardScene {
  id: number
  duration: string           // 时长 "0:30"
  shotType: string           // 景别：远景/全景/中景/近景/特写
  description: string        // 画面描述
  camera: string             // 镜头运动
  dialogues: DialogueLine[]  // 结构化对白数组
  narrator?: string          // 旁白
  imageUrl?: string          // 生成的图片URL
  prompt?: string            // 生成使用的提示词
}

// ============== 分镜头脚本 ==============

/** 分镜头脚本 */
export interface StoryboardScript {
  title: string
  totalDuration: string
  synopsis: string           // 剧本梗概
  scenes: StoryboardScene[]
  characters: StoryboardCharacter[]
  allDialogues: DialogueLine[] // 所有对白汇总
}

/** 别名，兼容不同命名 */
export type StoryboardData = StoryboardScript

// ============== 角色设计图 ==============

/** 角色设计图（每个角色一张组合图） */
export interface CharacterDesignImage {
  characterId: string        // 角色ID
  characterName: string      // 角色名
  imageUrl?: string          // 设计图URL（包含3站姿+4表情）
}

// ============== 风格选项 ==============

export type StoryboardStyle = 'comic' | 'realistic' | 'anime' | 'watercolor'

export const STORYBOARD_STYLE_OPTIONS = [
  { value: 'comic', label: '漫画风格', description: '黑白/彩色漫画，带边框分格' },
  { value: 'realistic', label: '写实风格', description: '电影分镜头草图' },
  { value: 'anime', label: '动漫风格', description: '日式动漫风格' },
  { value: 'watercolor', label: '水彩风格', description: '水彩画风格' },
] as const

// ============== 生成任务状态 ==============

export type GenerationTask = 'script' | 'storyboard' | 'character' | null

// ============== Tab 类型 ==============

export type StoryboardTab = 'script' | 'characters' | 'dialogues' | 'chart'

// ============== 状态接口 ==============

interface StoryboardState {
  // 对话框状态
  isOpen: boolean

  // Tab 状态
  activeTab: StoryboardTab

  // 生成状态
  isGenerating: boolean
  currentTask: GenerationTask
  progress: number           // 0-100

  // 输入
  inputText: string
  selectedStyle: StoryboardStyle

  // 输出
  script: StoryboardScript | null
  storyboardImages: string[]           // 故事板图片URL数组
  characterDesigns: CharacterDesignImage[]  // 角色设计图

  // 错误
  error: string | null

  // Actions
  openDialog: () => void
  closeDialog: () => void
  setActiveTab: (tab: StoryboardTab) => void
  setInputText: (text: string) => void
  setStyle: (style: StoryboardStyle) => void
  setGenerating: (generating: boolean, task?: GenerationTask) => void
  setProgress: (progress: number) => void
  setScript: (script: StoryboardScript) => void
  addStoryboardImage: (url: string) => void
  setCharacterDesign: (characterId: string, url: string) => void
  setError: (error: string | null) => void
  reset: () => void
}

// ============== 默认值 ==============

const DEFAULT_APPEARANCE: CharacterAppearance = {
  age: '未知',
  gender: '未知',
  height: '中等',
  build: '普通',
  hairColor: '黑色',
  hairStyle: '普通',
  eyeColor: '黑色',
  skinTone: '正常',
  distinctiveFeatures: [],
}

const DEFAULT_COSTUME: CharacterCostume = {
  mainOutfit: '普通服装',
  accessories: [],
  colors: [],
}

const DEFAULT_PERSONALITY: CharacterPersonality = {
  traits: [],
  mannerisms: [],
  speakingStyle: '正常',
}

/** 为角色提供默认值 */
export function createDefaultCharacter(id: string, name: string, role: CharacterRole = 'supporting'): StoryboardCharacter {
  return {
    id,
    name,
    role,
    description: '',
    appearance: { ...DEFAULT_APPEARANCE },
    costume: { ...DEFAULT_COSTUME },
    personality: { ...DEFAULT_PERSONALITY },
  }
}

/** 为不完整的角色数据填充默认值 */
export function normalizeCharacter(c: Partial<StoryboardCharacter>, index: number): StoryboardCharacter {
  const id = c.id || `char_${index + 1}`
  return {
    id,
    name: c.name || `角色${index + 1}`,
    role: c.role || 'supporting',
    description: c.description || '',
    appearance: {
      ...DEFAULT_APPEARANCE,
      ...(c.appearance || {}),
    },
    costume: {
      ...DEFAULT_COSTUME,
      ...(c.costume || {}),
    },
    personality: {
      ...DEFAULT_PERSONALITY,
      ...(c.personality || {}),
    },
    referenceImageUrl: c.referenceImageUrl,
  }
}

/** 为不完整的对白数据填充默认值 */
export function normalizeDialogue(d: Partial<DialogueLine>): DialogueLine {
  return {
    characterId: d.characterId || '',
    characterName: d.characterName || '未知',
    text: d.text || '',
    emotion: d.emotion || 'neutral',
    emotionIntensity: d.emotionIntensity ?? 5,
    tone: d.tone || 'normal',
    speed: d.speed ?? 1.0,
    pause: d.pause ?? 0,
    stageDirection: d.stageDirection || '',
  }
}

/** 为不完整的场景数据填充默认值 */
export function normalizeScene(s: Partial<StoryboardScene>): StoryboardScene {
  return {
    id: s.id ?? 0,
    duration: s.duration || '0:30',
    shotType: s.shotType || '中景',
    description: s.description || '',
    camera: s.camera || '固定镜头',
    dialogues: (s.dialogues || []).map(normalizeDialogue),
    narrator: s.narrator || '',
    imageUrl: s.imageUrl,
    prompt: s.prompt,
  }
}

/** 解析并规范化分镜头脚本 */
export function parseAndNormalizeScript(data: any): StoryboardScript {
  return {
    title: data.title || '未命名分镜头',
    totalDuration: data.totalDuration || '3:00',
    synopsis: data.synopsis || '',
    characters: (data.characters || []).map(normalizeCharacter),
    scenes: (data.scenes || []).map(normalizeScene),
    allDialogues: (data.allDialogues || []).map(normalizeDialogue),
  }
}

// ============== Store ==============

export const useStoryboardStore = create<StoryboardState>((set) => ({
  // 初始状态
  isOpen: false,
  activeTab: 'script',
  isGenerating: false,
  currentTask: null,
  progress: 0,
  inputText: '',
  selectedStyle: 'comic',
  script: null,
  storyboardImages: [],
  characterDesigns: [],
  error: null,

  // Actions
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInputText: (text) => set({ inputText: text }),
  setStyle: (style) => set({ selectedStyle: style }),

  setGenerating: (generating, task = null) => set({
    isGenerating: generating,
    currentTask: task,
    progress: generating ? 0 : 100,
  }),

  setProgress: (progress) => set({ progress }),

  setScript: (script) => set({ script }),

  addStoryboardImage: (url) => set((state) => ({
    storyboardImages: [...state.storyboardImages, url],
  })),

  setCharacterDesign: (characterId, url) => set((state) => {
    const designs = [...state.characterDesigns]
    const index = designs.findIndex((d) => d.characterId === characterId)
    if (index >= 0) {
      designs[index] = { ...designs[index], imageUrl: url }
    } else {
      // 查找角色名
      const character = state.script?.characters.find(c => c.id === characterId)
      designs.push({
        characterId,
        characterName: character?.name || '',
        imageUrl: url,
      })
    }
    return { characterDesigns: designs }
  }),

  setError: (error) => set({ error }),

  reset: () => set({
    isGenerating: false,
    currentTask: null,
    progress: 0,
    activeTab: 'script',
    script: null,
    storyboardImages: [],
    characterDesigns: [],
    error: null,
  }),
}))
