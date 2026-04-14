import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  selectedNodes: string[]
  selectedEdges: string[]
  panelOpen: {
    properties: boolean
    templates: boolean
    history: boolean
    layers: boolean
  }
  // 向后兼容的别名
  showProperties: boolean
  showTemplates: boolean
  contextMenu: {
    open: boolean
    position: { x: number; y: number }
    target: string | null
  }
  showToolbar: boolean
  showShortcutPanel: boolean
}

const initialState: UIState = {
  selectedNodes: [],
  selectedEdges: [],
  panelOpen: {
    properties: true,
    templates: true,
    history: false,
    layers: false,
  },
  showProperties: true,
  showTemplates: true,
  contextMenu: {
    open: false,
    position: { x: 0, y: 0 },
    target: null,
  },
  showToolbar: false,
  showShortcutPanel: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedNodes: (state, action: PayloadAction<string[]>) => {
      state.selectedNodes = action.payload
    },
    setSelectedEdges: (state, action: PayloadAction<string[]>) => {
      state.selectedEdges = action.payload
    },
    togglePanel: (state, action: PayloadAction<keyof UIState['panelOpen']>) => {
      const panel = action.payload
      const newValue = !state.panelOpen[panel]
      state.panelOpen[panel] = newValue

      // 同步更新向后兼容的字段
      if (panel === 'properties') state.showProperties = newValue
      if (panel === 'templates') state.showTemplates = newValue
    },
    setPanelOpen: (state, action: PayloadAction<{ panel: keyof UIState['panelOpen']; open: boolean }>) => {
      const { panel, open } = action.payload
      state.panelOpen[panel] = open

      // 同步更新向后兼容的字段
      if (panel === 'properties') state.showProperties = open
      if (panel === 'templates') state.showTemplates = open
    },
    openContextMenu: (state, action: PayloadAction<{ x: number; y: number; target: string | null }>) => {
      state.contextMenu = {
        open: true,
        position: { x: action.payload.x, y: action.payload.y },
        target: action.payload.target,
      }
    },
    closeContextMenu: (state) => {
      state.contextMenu.open = false
    },
    toggleToolbar: (state) => {
      state.showToolbar = !state.showToolbar
    },
    setToolbarVisible: (state, action: PayloadAction<boolean>) => {
      state.showToolbar = action.payload
    },
    toggleShortcutPanel: (state) => {
      state.showShortcutPanel = !state.showShortcutPanel
    },
    setShortcutPanelVisible: (state, action: PayloadAction<boolean>) => {
      state.showShortcutPanel = action.payload
    },
  },
})

export const {
  setSelectedNodes,
  setSelectedEdges,
  togglePanel,
  setPanelOpen,
  openContextMenu,
  closeContextMenu,
  toggleToolbar,
  setToolbarVisible,
  toggleShortcutPanel,
  setShortcutPanelVisible,
} = uiSlice.actions

export const selectSelectedNodes = (state: any) => state.ui.selectedNodes
export const selectSelectedEdges = (state: any) => state.ui.selectedEdges
export const selectPanelOpen = (state: any) => state.ui.panelOpen
export const selectShowToolbar = (state: any) => state.ui.showToolbar
export const selectShowShortcutPanel = (state: any) => state.ui.showShortcutPanel

export default uiSlice.reducer
