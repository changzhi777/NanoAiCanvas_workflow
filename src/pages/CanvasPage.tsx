import { useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { selectNodes, selectEdges } from '../store/slices/canvasSlice'
import Canvas from '../components/canvas/Canvas'
import Toolbar from '../components/toolbar/Toolbar'
import PropertiesPanel from '../components/panels/PropertiesPanel'
import NodeTemplatesPanel from '../components/panels/NodeTemplatesPanel'
import { useAutosave } from '../hooks/useAutosave'
import { useShortcuts } from '../hooks/useShortcuts'

function CanvasPageContent() {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector(selectNodes)
  const edges = useAppSelector(selectEdges)

  // 自动保存
  useAutosave()

  // 快捷键
  useShortcuts()

  return (
    <>
      {/* 顶部工具栏 */}
      <Toolbar />

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
