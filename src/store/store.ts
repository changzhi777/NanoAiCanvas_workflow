import { configureStore } from '@reduxjs/toolkit'
import canvasReducer from './slices/canvasSlice'
import uiReducer from './slices/uiSlice'
import settingsReducer from './slices/settingsSlice'

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['canvas/loadFromStorage/fulfilled'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
