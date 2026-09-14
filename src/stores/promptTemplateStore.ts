/**
 * 提示词模板状态管理
 * 用户可保存、加载、删除提示词模板
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PromptTemplate } from '@/types/image'

// 预设模板分类
export const TEMPLATE_CATEGORIES = [
  { value: 'character', label: '角色设计' },
  { value: 'scene', label: '场景设计' },
  { value: 'style', label: '风格预设' },
  { value: 'cinematic', label: '电影感' },
  { value: 'custom', label: '自定义' },
] as const

interface PromptTemplateState {
  // 模板列表
  templates: PromptTemplate[]

  // Actions
  addTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt'>) => string
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void
  deleteTemplate: (id: string) => void
  getTemplate: (id: string) => PromptTemplate | undefined
  getTemplatesByCategory: (category: string) => PromptTemplate[]
  duplicateTemplate: (id: string) => string
}

// 默认模板
const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'template-1',
    name: '人像摄影',
    description: '专业人像摄影提示词模板',
    category: 'style',
    template: '一位 {subject}，专业人像摄影风格，柔和自然光，浅景深，背景虚化，高画质，细节丰富',
    params: {
      style: 'realistic',
      shotType: 'close-up',
      lighting: 'natural-light',
      focus: 'shallow-dof',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-2',
    name: '电影感场景',
    description: '电影级场景描述模板',
    category: 'cinematic',
    template: '{scene_description}，电影级画面，宽银幕构图，戏剧性光线，情感氛围，35mm胶片质感',
    params: {
      style: 'realistic',
      cameraAngle: 'low-angle',
      lighting: 'cinematic-lighting',
      atmosphere: 'night',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-3',
    name: '动漫角色',
    description: '日式动漫风格角色设计',
    category: 'character',
    template: '{character_description}，anime style, manga art, vibrant colors, detailed character design, Japanese animation aesthetic',
    params: {
      style: 'anime',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-4',
    name: '产品展示',
    description: '电商产品展示模板',
    category: 'style',
    template: '{product_name}，商业产品摄影，白色背景，干净简洁，专业布光，高清细节，电商主图风格',
    params: {
      style: 'realistic',
      lighting: 'studio-lighting',
      technical: 'hdr',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-5',
    name: '奇幻风景',
    description: '奇幻风格风景描述',
    category: 'scene',
    template: '{landscape_description}，fantasy art, magical atmosphere, ethereal lighting, mystical, enchanted forest, high detail',
    params: {
      style: 'fantasy',
      lighting: 'volumetric',
      atmosphere: 'foggy',
    },
    createdAt: new Date().toISOString(),
  },
]

export const usePromptTemplateStore = create<PromptTemplateState>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES,

      addTemplate: (template) => {
        const id = crypto.randomUUID()
        const newTemplate: PromptTemplate = {
          ...template,
          id,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }))
        return id
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }))
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }))
      },

      getTemplate: (id) => {
        return get().templates.find((t) => t.id === id)
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((t) => t.category === category)
      },

      duplicateTemplate: (id) => {
        const template = get().getTemplate(id)
        if (!template) return ''
        return get().addTemplate({
          ...template,
          name: `${template.name} (副本)`,
        })
      },
    }),
    {
      name: 'prompt-templates',
    }
  )
)
