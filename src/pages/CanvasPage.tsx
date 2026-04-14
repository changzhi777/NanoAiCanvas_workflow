import { useCallback } from 'react'
import { ReactFlowProvider, useReactFlow } from 'reactflow'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  selectShowShortcutPanel,
  selectShowToolbar,
  toggleShortcutPanel
} from '../store/slices/uiSlice'
import Canvas from '../components/canvas/Canvas'
import Toolbar from '../components/toolbar/Toolbar'
import PropertiesPanel from '../components/panels/PropertiesPanel'
import NodeTemplatesPanel from '../components/panels/NodeTemplatesPanel'
import { FloatingMenuBar } from '../components/canvas/FloatingMenuBar'
import { EdgeHoverTrigger } from '../components/canvas/EdgeHoverTrigger'
import { ShortcutHintPanel } from '../components/canvas/ShortcutHintPanel'
import { useAutosave } from '../hooks/useAutosave'
import { useShortcuts } from '../hooks/useShortcuts'

function CanvasPageContent() {
  const dispatch = useAppDispatch()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const showShortcutPanel = useAppSelector(selectShowShortcutPanel)
  const showToolbar = useAppSelector(selectShowToolbar)

  // 自动保存
  useAutosave()

  // 快捷键
  useShortcuts()

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 })
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, maxZoom: 1 })
  }, [fitView])

  // 添加节点（示例）
  const handleAddNode = useCallback(() => {
    // TODO: 实现添加节点逻辑
    console.log('Add node')
  }, [])

  // 撤销/重做（示例）
  const handleUndo = useCallback(() => {
    // TODO: 实现撤销逻辑
    console.log('Undo')
  }, [])

  const handleRedo = useCallback(() => {
    // TODO: 实现重做逻辑
    console.log('Redo')
  }, [])

  // 保存（示例）
  const handleSave = useCallback(() => {
    // TODO: 实现保存逻辑
    console.log('Save')
  }, [])

  return (
    <>
      {/* 浮动菜单栏（左上角） */}
      <FloatingMenuBar
        onAddNode={handleAddNode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
      />

      {/* 边缘触发器（左边缘 - 模板面板） */}
      <EdgeHoverTrigger
        edge="left"
        panel="templates"
        delay={200}
      />

      {/* 边缘触发器（右边缘 - 属性面板） */}
      <EdgeHoverTrigger
        edge="right"
        panel="properties"
        delay={200}
      />

      {/* 快捷键提示面板 */}
      <ShortcutHintPanel
        open={showShortcutPanel}
        onOpenChange={(open) => {
          if (open) {
            dispatch(toggleShortcutPanel())
          } else {
            dispatch(toggleShortcutPanel())
          }
        }}
      />

      {/* 顶部工具栏（可通过快捷键显示） */}
      {showToolbar && <Toolbar />}

      {/* 主画布区域 */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 左侧节点模板面板 */}
        <NodeTemplatesPanel />

        {/* 中央画布 */}
        <Canvas />

        {/* 右侧属性面板 */}
        <PropertiesPanel />
      </div>
    </>
  )
}

export default function CanvasPage() {
  return (
    <div className="flex h-screen flex-col">
      <ReactFlowProvider>
        <CanvasPageContent />
      </ReactFlowProvider>
    </div>
  )
}
