import { create } from 'zustand'
import type { ProductAnalysis } from '@/lib/constants/ecommerce-prompts'

// 参考图接口
interface ReferenceImage {
  id: string
  url: string      // base64 或 blob URL
  file?: File      // 原始文件
  base64?: string  // 用于 API 调用的 base64（不含前缀）
}

// 生成的图片
interface GeneratedImage {
  id: string
  url: string
  prompt: string
  screen: number
}

// 步骤枚举
export type EcommerceStep = 'upload' | 'analyzing' | 'prompts' | 'generating' | 'result'

// 状态接口
interface EcommerceProductState {
  // 对话框状态
  isDialogOpen: boolean

  // 步骤控制
  currentStep: EcommerceStep

  // 参考图
  referenceImage: ReferenceImage | null

  // 产品分析结果
  productAnalysis: ProductAnalysis | null

  // 5个提示词
  prompts: string[]

  // 生成进度
  generatingIndex: number    // 当前正在生成的图片索引（0-4）
  generatedImages: GeneratedImage[]

  // 错误信息
  error: string | null

  // Dialog Actions
  openDialog: () => void
  closeDialog: () => void

  // Step Actions
  setCurrentStep: (step: EcommerceStep) => void

  // Image Actions
  setReferenceImage: (image: ReferenceImage | null) => void
  clearReferenceImage: () => void

  // Analysis Actions
  setProductAnalysis: (analysis: ProductAnalysis | null) => void

  // Prompt Actions
  setPrompts: (prompts: string[]) => void
  updatePrompt: (index: number, prompt: string) => void

  // Generation Actions
  setGeneratingIndex: (index: number) => void
  addGeneratedImage: (image: GeneratedImage) => void
  clearGeneratedImages: () => void

  // Error Actions
  setError: (error: string | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  isDialogOpen: false,
  currentStep: 'upload' as EcommerceStep,
  referenceImage: null,
  productAnalysis: null,
  prompts: [],
  generatingIndex: -1,
  generatedImages: [],
  error: null,
}

export const useEcommerceProductStore = create<EcommerceProductState>((set) => ({
  ...initialState,

  openDialog: () => set({ isDialogOpen: true }),

  closeDialog: () => set(initialState),

  setCurrentStep: (step) => set({ currentStep: step }),

  setReferenceImage: (image) => set({ referenceImage: image }),

  clearReferenceImage: () => set({ referenceImage: null }),

  setProductAnalysis: (analysis) => set({ productAnalysis: analysis }),

  setPrompts: (prompts) => set({ prompts }),

  updatePrompt: (index, prompt) => set((state) => {
    const newPrompts = [...state.prompts]
    newPrompts[index] = prompt
    return { prompts: newPrompts }
  }),

  setGeneratingIndex: (index) => set({ generatingIndex: index }),

  addGeneratedImage: (image) => set((state) => ({
    generatedImages: [...state.generatedImages, image],
  })),

  clearGeneratedImages: () => set({ generatedImages: [] }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))

// 导出类型
export type { ReferenceImage, GeneratedImage }
