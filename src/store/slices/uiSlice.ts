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
  contextMenu: {
    open: boolean
    position: { x: number; y: number }
    target: string | null
  }
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
  contextMenu: {
    open: false,
    position: { x: 0, y: 0 },
    target: null,
  },
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
      state.panelOpen[action.payload] = !state.panelOpen[action.payload]
    },
    setPanelOpen: (state, action: PayloadAction<{ panel: keyof UIState['panelOpen']; open: boolean }>) => {
      state.panelOpen[action.payload.panel] = action.payload.open
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
  },
})

export const {
  setSelectedNodes,
  setSelectedEdges,
  togglePanel,
  setPanelOpen,
  openContextMenu,
  closeContextMenu,
} = uiSlice.actions

export const selectSelectedNodes = (state: any) => state.ui.selectedNodes
export const selectSelectedEdges = (state: any) => state.ui.selectedEdges
export const selectPanelOpen = (state: any) => state.ui.panelOpen

export default uiSlice.reducer
