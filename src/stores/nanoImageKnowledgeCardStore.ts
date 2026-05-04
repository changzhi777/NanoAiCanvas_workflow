import { create } from 'zustand'
import type { KnowledgeCardCategory, CardStyle } from '@/types'

interface KnowledgeCardState {
  isDialogOpen: boolean
  selectedCategory: KnowledgeCardCategory
  selectedStyle: CardStyle

  // Actions
  openDialog: () => void
  closeDialog: () => void
  setCategory: (category: KnowledgeCardCategory) => void
  setStyle: (style: CardStyle) => void
  reset: () => void
}

const DEFAULT_CATEGORY: KnowledgeCardCategory = 'other'
const DEFAULT_STYLE: CardStyle = 'minimal'

export const useKnowledgeCardStore = create<KnowledgeCardState>((set) => ({
  isDialogOpen: false,
  selectedCategory: DEFAULT_CATEGORY,
  selectedStyle: DEFAULT_STYLE,

  openDialog: () => set({ isDialogOpen: true }),

  closeDialog: () => set({ isDialogOpen: false }),

  setCategory: (category) => set({ selectedCategory: category }),

  setStyle: (style) => set({ selectedStyle: style }),

  reset: () => set({
    selectedCategory: DEFAULT_CATEGORY,
    selectedStyle: DEFAULT_STYLE,
  }),
}))
