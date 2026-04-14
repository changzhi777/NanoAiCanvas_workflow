import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Theme } from '@/types'

interface SettingsState {
  theme: Theme
  locale: string
  autosave: boolean
  autosaveInterval: number
  gridSize: number
  snapToGrid: boolean
  showMiniMap: boolean
  showGrid: boolean
}

const initialState: SettingsState = {
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  locale: localStorage.getItem('locale') || 'zh-CN',
  autosave: true,
  autosaveInterval: 30000,
  gridSize: 20,
  snapToGrid: true,
  showMiniMap: true,
  showGrid: true,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
      document.documentElement.classList.toggle('dark', action.payload === 'dark')
    },
    setLocale: (state, action: PayloadAction<string>) => {
      state.locale = action.payload
      localStorage.setItem('locale', action.payload)
    },
    setAutosave: (state, action: PayloadAction<boolean>) => {
      state.autosave = action.payload
    },
    setAutosaveInterval: (state, action: PayloadAction<number>) => {
      state.autosaveInterval = action.payload
    },
    setGridSize: (state, action: PayloadAction<number>) => {
      state.gridSize = action.payload
    },
    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload
    },
    setShowMiniMap: (state, action: PayloadAction<boolean>) => {
      state.showMiniMap = action.payload
    },
    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload
    },
  },
})

export const {
  setTheme,
  setLocale,
  setAutosave,
  setAutosaveInterval,
  setGridSize,
  setSnapToGrid,
  setShowMiniMap,
  setShowGrid,
} = settingsSlice.actions

// Selectors
export const selectAutosave = (state: { settings: SettingsState }) => state.settings.autosave
export const selectAutosaveInterval = (state: { settings: SettingsState }) => state.settings.autosaveInterval
export const selectTheme = (state: { settings: SettingsState }) => state.settings.theme
export const selectLocale = (state: { settings: SettingsState }) => state.settings.locale

export default settingsSlice.reducer
