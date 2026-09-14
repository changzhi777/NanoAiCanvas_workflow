/**
 * Storyboard Wizard Store - 向导式故事板工作流状态管理（四步流程）
 *
 * 流程：剧本 → 故事板图片 → 对白生成 → 角色设计
 *
 * 使用方法：
 * import { useStoryboardWizardStore } from '@/stores/storyboardWizardStore'
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 向导步骤类型（四步）
export type WizardStep = 1 | 2 | 3 | 4

// 剧本数据类型
export interface ScriptData {
  title: string
  synopsis: string
  style?: string
  totalDuration?: string
  scenes: ScriptScene[]
  characters?: ScriptCharacter[]
  allDialogues?: DialogueLine[]
}

// 场景类型
export interface ScriptScene {
  id: string | number
  description: string
  shotType: string
  camera: string
  duration: string
  dialogues?: DialogueLine[]
  narrator?: string
  imageUrl?: string
}

// 对白类型
export interface DialogueLine {
  characterId: string
  characterName: string
  text: string
  emotion?: string
  emotionIntensity?: number
  tone?: string
  speed?: number
  pause?: number
  stageDirection?: string
  audioUrl?: string
}

// 角色类型
export interface ScriptCharacter {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  description: string
  appearance?: {
    age?: string
    gender?: string
    height?: string
    build?: string
    hairColor?: string
    hairStyle?: string
    eyeColor?: string
    skinTone?: string
    distinctiveFeatures?: string[]
  }
  costume?: {
    mainOutfit?: string
    accessories?: string[]
    colors?: string[]
  }
  personality?: {
    traits?: string[]
    mannerisms?: string[]
    speakingStyle?: string
  }
  referenceImageUrl?: string
}

// 故事板图片类型
export interface StoryboardImage {
  id: string
  url: string
  file?: File
  sceneId: string | number
  description: string
  order: number
  generatedAt?: string
}

// 角色设计提示词类型
export interface CharacterPrompt {
  id: string
  characterId: string
  characterName: string
  prompt: string
  negativePrompt?: string
  style: string
  generatedAt?: string
}

// 向导状态接口
interface StoryboardWizardState {
  // 当前步骤
  currentStep: WizardStep

  // 步骤1：剧本
  inputText: string
  selectedStyle: string
  scriptData: ScriptData | null
  isGeneratingScript: boolean

  // 步骤2：故事板图片
  storyboardImages: StoryboardImage[]
  isGeneratingStoryboard: boolean

  // 步骤3：对白
  dialogues: DialogueLine[]
  isGeneratingDialogues: boolean

  // 步骤4：角色设计
  characterPrompts: CharacterPrompt[]
  isGeneratingCharacters: boolean

  // 导航方法
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: WizardStep) => void
  reset: () => void

  // 步骤1：剧本操作
  setInputText: (text: string) => void
  setSelectedStyle: (style: string) => void
  setScriptData: (data: ScriptData | null) => void
  setIsGeneratingScript: (isGenerating: boolean) => void
  importScript: (content: string, format: 'json' | 'md' | 'docs') => { success: boolean; error?: string }
  exportScript: (format: 'json' | 'md') => string | null
  updateScript: (data: Partial<ScriptData>) => void

  // 步骤2：故事板操作
  setStoryboardImages: (images: StoryboardImage[]) => void
  setIsGeneratingStoryboard: (isGenerating: boolean) => void
  addStoryboardImage: (image: StoryboardImage) => void
  updateStoryboardImage: (id: string, data: Partial<StoryboardImage>) => void
  removeStoryboardImage: (id: string) => void
  reorderStoryboardImages: (fromIndex: number, toIndex: number) => void

  // 步骤3：对白操作
  setDialogues: (dialogues: DialogueLine[]) => void
  setIsGeneratingDialogues: (isGenerating: boolean) => void
  updateDialogue: (index: number, data: Partial<DialogueLine>) => void

  // 步骤4：角色设计操作
  setCharacterPrompts: (prompts: CharacterPrompt[]) => void
  setIsGeneratingCharacters: (isGenerating: boolean) => void
  updateCharacterPrompt: (id: string, data: Partial<CharacterPrompt>) => void
  generateCharacterPrompts: () => Promise<void>
  downloadCharacterTemplate: () => string

  // 获取向导完整数据
  getWizardPayload: () => {
    inputText: string
    style: string
    script: ScriptData | null
    storyboardImages: StoryboardImage[]
    dialogues: DialogueLine[]
    characterPrompts: CharacterPrompt[]
  }
}

// 初始状态
const initialState = {
  currentStep: 1 as WizardStep,
  inputText: '',
  selectedStyle: 'comic',
  scriptData: null as ScriptData | null,
  isGeneratingScript: false,
  storyboardImages: [] as StoryboardImage[],
  isGeneratingStoryboard: false,
  dialogues: [] as DialogueLine[],
  isGeneratingDialogues: false,
  characterPrompts: [] as CharacterPrompt[],
  isGeneratingCharacters: false,
}

// 生成唯一ID
export const generateUniqueId = (prefix = 'id'): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useStoryboardWizardStore = create<StoryboardWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 导航方法
      nextStep: () => set((state) => ({
        currentStep: Math.min(4, state.currentStep + 1) as WizardStep
      })),

      prevStep: () => set((state) => ({
        currentStep: Math.max(1, state.currentStep - 1) as WizardStep
      })),

      goToStep: (step) => set({ currentStep: step }),

      reset: () => set(initialState),

      // 步骤1：剧本操作
      setInputText: (text) => set({ inputText: text }),
      setSelectedStyle: (style) => set({ selectedStyle: style }),
      setScriptData: (data) => set({ scriptData: data }),
      setIsGeneratingScript: (isGenerating) => set({ isGeneratingScript: isGenerating }),

      importScript: (content, format) => {
        try {
          let data: ScriptData

          if (format === 'json') {
            const parsed = JSON.parse(content)
            data = {
              title: parsed.title || '未命名剧本',
              synopsis: parsed.synopsis || '',
              style: parsed.style,
              totalDuration: parsed.totalDuration,
              scenes: parsed.scenes || [],
              characters: parsed.characters || [],
              allDialogues: parsed.allDialogues || [],
            }
          } else {
            const lines = content.split('\n')
            const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || '未命名剧本'
            const synopsis = lines.slice(1, 5).join('\n').replace(/^#+\s*/gm, '').trim()

            data = {
              title,
              synopsis,
              scenes: [],
            }
          }

          set({ scriptData: data })
          return { success: true }
        } catch (e) {
          return { success: false, error: `解析失败：${e instanceof Error ? e.message : '未知错误'}` }
        }
      },

      exportScript: (format) => {
        const { scriptData } = get()
        if (!scriptData) return null

        if (format === 'json') {
          return JSON.stringify(scriptData, null, 2)
        }

        let md = `# ${scriptData.title}\n\n`
        if (scriptData.synopsis) {
          md += `## 剧本梗概\n\n${scriptData.synopsis}\n\n`
        }
        if (scriptData.scenes.length > 0) {
          md += `## 分镜头\n\n`
          scriptData.scenes.forEach((scene, i) => {
            md += `### 镜头 ${i + 1}\n\n`
            md += `- **景别**：${scene.shotType}\n`
            md += `- **时长**：${scene.duration}\n`
            md += `- **镜头**：${scene.camera}\n`
            md += `- **画面**：${scene.description}\n`
            if (scene.narrator) md += `- **旁白**：${scene.narrator}\n`
            md += '\n'
          })
        }
        return md
      },

      updateScript: (data) => set((state) => ({
        scriptData: state.scriptData ? { ...state.scriptData, ...data } : null
      })),

      // 步骤2：故事板操作
      setStoryboardImages: (images) => set({ storyboardImages: images }),
      setIsGeneratingStoryboard: (isGenerating) => set({ isGeneratingStoryboard: isGenerating }),

      addStoryboardImage: (image) => set((state) => ({
        storyboardImages: [...state.storyboardImages, image]
      })),

      updateStoryboardImage: (id, data) => set((state) => ({
        storyboardImages: state.storyboardImages.map(img =>
          img.id === id ? { ...img, ...data } : img
        )
      })),

      removeStoryboardImage: (id) => set((state) => ({
        storyboardImages: state.storyboardImages.filter(img => img.id !== id)
      })),

      reorderStoryboardImages: (fromIndex, toIndex) => set((state) => {
        const images = [...state.storyboardImages]
        const [removed] = images.splice(fromIndex, 1)
        images.splice(toIndex, 0, removed)
        return { storyboardImages: images.map((img, i) => ({ ...img, order: i + 1 })) }
      }),

      // 步骤3：对白操作
      setDialogues: (dialogues) => set({ dialogues }),
      setIsGeneratingDialogues: (isGenerating) => set({ isGeneratingDialogues: isGenerating }),

      updateDialogue: (index, data) => set((state) => ({
        dialogues: state.dialogues.map((d, i) => i === index ? { ...d, ...data } : d)
      })),

      // 步骤4：角色设计操作
      setCharacterPrompts: (prompts) => set({ characterPrompts: prompts }),
      setIsGeneratingCharacters: (isGenerating) => set({ isGeneratingCharacters: isGenerating }),

      updateCharacterPrompt: (id, data) => set((state) => ({
        characterPrompts: state.characterPrompts.map(p =>
          p.id === id ? { ...p, ...data } : p
        )
      })),

      generateCharacterPrompts: async () => {
        const { scriptData, selectedStyle } = get()
        if (!scriptData?.characters?.length) return

        const prompts: CharacterPrompt[] = scriptData.characters.map((char) => ({
          id: generateUniqueId('prompt'),
          characterId: char.id,
          characterName: char.name,
          prompt: buildCharacterPrompt(char),
          negativePrompt: 'low quality, blurry, distorted, deformed',
          style: selectedStyle,
          generatedAt: new Date().toISOString(),
        }))

        set({ characterPrompts: prompts })
      },

      downloadCharacterTemplate: () => {
        return `# 角色设计模板

## 角色信息
- 名称：
- 角色：protagonist / antagonist / supporting / minor
- 描述：

## 外观设定
- 年龄：
- 性别：
- 身高：
- 体型：
- 发色/发型：
- 瞳色：
- 肤色：
- 显著特征：

## 服装设定
- 主要服装：
- 配饰：
- 主色调：

## 性格设定
- 性格特点：
- 习惯动作：
- 说话风格：

## AI 绘图提示词
\`\`\`
[在此填写或生成 AI 绘图提示词]
\`\`\`
`
      },

      // 获取向导完整数据
      getWizardPayload: () => {
        const state = get()
        return {
          inputText: state.inputText,
          style: state.selectedStyle,
          script: state.scriptData,
          storyboardImages: state.storyboardImages,
          dialogues: state.dialogues,
          characterPrompts: state.characterPrompts,
        }
      },
    }),
    {
      name: 'storyboard-wizard-v2-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        inputText: state.inputText,
        selectedStyle: state.selectedStyle,
        scriptData: state.scriptData,
        storyboardImages: state.storyboardImages.map(({ file, ...rest }) => rest),
        dialogues: state.dialogues,
        characterPrompts: state.characterPrompts,
      }),
    }
  )
)

// 构建角色提示词
function buildCharacterPrompt(char: ScriptCharacter): string {
  const parts: string[] = []
  parts.push(`character design sheet, ${char.name}`)

  if (char.appearance) {
    const { age, gender, height, build, hairColor, hairStyle, eyeColor, skinTone, distinctiveFeatures } = char.appearance
    if (age) parts.push(age)
    if (gender) parts.push(gender)
    if (height) parts.push(height)
    if (build) parts.push(build)
    if (hairColor || hairStyle) parts.push(`${hairColor || ''} ${hairStyle || ''}`.trim())
    if (eyeColor) parts.push(`${eyeColor} eyes`)
    if (skinTone) parts.push(`${skinTone} skin`)
    if (distinctiveFeatures?.length) parts.push(distinctiveFeatures.join(', '))
  }

  if (char.costume) {
    if (char.costume.mainOutfit) parts.push(`wearing ${char.costume.mainOutfit}`)
    if (char.costume.accessories?.length) parts.push(`accessories: ${char.costume.accessories.join(', ')}`)
  }

  parts.push('white background, professional character design, clean lines, detailed')
  parts.push('layout: 3 full body poses (front, side, back) + 4 face expressions')

  return parts.join(', ')
}
