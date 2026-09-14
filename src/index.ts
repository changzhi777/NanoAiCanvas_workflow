/**
 * NanoAiCanvas 组件库主入口
 * 提供完整的画布组件和功能
 */

// 核心组件
export { default as Canvas } from './components/canvas/Canvas'
export { default as CardNode } from './components/canvas/nodes/CardNode'

// 面板组件
export { default as PropertiesPanel } from './components/panels/PropertiesPanel'
export { default as NodeTemplatesPanel } from './components/panels/NodeTemplatesPanel'
export { ShortcutHintPanel } from './components/canvas/ShortcutHintPanel'

// 工具栏和浮动组件
export { default as Toolbar } from './components/toolbar/Toolbar'
export { FloatingMenuBar } from './components/canvas/FloatingMenuBar'
export { EdgeHoverTrigger } from './components/canvas/EdgeHoverTrigger'
export { ShortcutHintPanel as ShortcutHelp } from './components/canvas/ShortcutHintPanel'

// 页面组件（完整应用）
export { default as CanvasPage } from './pages/CanvasPage'

// Hooks
export { useAutosave } from './hooks/useAutosave'
export { useShortcuts } from './hooks/useShortcuts'
export { useI18n } from './hooks/useI18n'

// 类型定义
export type {
  NodeData,
  NodeType,
  NodeStatus,
  EdgeData,
} from './types'

// Store 相关
export {
  useAppDispatch,
  useAppSelector,
} from './store/hooks'

export {
  selectNodes,
  selectEdges,
  selectViewport,
} from './store/slices/canvasSlice'

export {
  selectShowShortcutPanel,
  selectShowToolbar,
} from './store/slices/uiSlice'

export {
  selectTheme,
  selectLocale,
  selectAutosave,
} from './store/slices/settingsSlice'

// 样式导入
import './styles/globals.css'
import './components/canvas/canvas.css'
