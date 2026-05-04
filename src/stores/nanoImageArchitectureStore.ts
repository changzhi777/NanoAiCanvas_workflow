import { create } from 'zustand'

interface ReferenceImage {
  id: string
  url: string
  file: File
  base64?: string
}

interface ArchitectureState {
  isDialogOpen: boolean
  currentTab: 'interior' | 'exterior'
  selectedScene: string
  selectedStyle: string
  referenceImage: ReferenceImage | null

  // Actions
  openDialog: () => void
  closeDialog: () => void
  setCurrentTab: (tab: 'interior' | 'exterior') => void
  setScene: (sceneId: string) => void
  setStyle: (styleId: string) => void
  setReferenceImage: (image: ReferenceImage | null) => void
  clearReferenceImage: () => void
}

export const useArchitectureStore = create<ArchitectureState>((set) => ({
  isDialogOpen: false,
  currentTab: 'interior',
  selectedScene: 'living-room',
  selectedStyle: 'modern',
  referenceImage: null,

  openDialog: () => set({ isDialogOpen: true }),
  closeDialog: () => set({ isDialogOpen: false, referenceImage: null }),
  setCurrentTab: (tab) => set({ currentTab: tab, selectedScene: tab === 'interior' ? 'living-room' : 'residential' }),
  setScene: (sceneId) => set({ selectedScene: sceneId }),
  setStyle: (styleId) => set({ selectedStyle: styleId }),
  setReferenceImage: (image) => set({ referenceImage: image }),
  clearReferenceImage: () => set({ referenceImage: null }),
}))
