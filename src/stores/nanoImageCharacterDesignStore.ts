import { create } from 'zustand'

interface ReferenceImage {
  id: string
  url: string
  file?: File
}

interface CharacterDesignState {
  isDialogOpen: boolean
  referenceImage: ReferenceImage | null

  // Dialog Actions - 匹配 knowledgeCardStore 的 API
  openDialog: () => void
  closeDialog: () => void

  // Reference Image Actions
  setReferenceImage: (image: ReferenceImage | null) => void
  clearReferenceImage: () => void

  // Reset
  reset: () => void
}

export const useCharacterDesignStore = create<CharacterDesignState>((set) => ({
  isDialogOpen: false,
  referenceImage: null,

  openDialog: () => set({ isDialogOpen: true }),

  closeDialog: () => set({ isDialogOpen: false, referenceImage: null }),

  setReferenceImage: (image) => set({ referenceImage: image }),

  clearReferenceImage: () => set({ referenceImage: null }),

  reset: () => set({
    isDialogOpen: false,
    referenceImage: null,
  }),
}))
