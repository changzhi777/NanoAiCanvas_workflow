import { useCallback, lazy, Suspense } from 'react'
import { ReactFlowProvider, useReactFlow } from 'reactflow'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  selectShowShortcutPanel,
  selectShowToolbar,
  setShortcutPanelVisible
} from '../store/slices/uiSlice'
import Canvas from '../components/canvas/Canvas'
import Toolbar from '../components/toolbar/Toolbar'
import { FloatingMenuBar } from '../components/canvas/FloatingMenuBar'
import { EdgeHoverTrigger } from '../components/canvas/EdgeHoverTrigger'
import { ShortcutHintPanel } from '../components/canvas/ShortcutHintPanel'
import { PerformanceMonitor } from '../components/canvas/PerformanceMonitor'
import { useAutosave } from '../hooks/useAutosave'
import { useShortcuts } from '../hooks/useShortcuts'
import { useCanvasHistory } from '../hooks/useCanvasHistory'
import { Skeleton } from '../components/ui/skeleton'

// 懒加载面板组件以优化性能
const PropertiesPanel = lazy(() => import('../components/panels/PropertiesPanel'))
const NodeTemplatesPanel = lazy(() => import('../components/panels/NodeTemplatesPanel'))

// 面板加载占位符组件
function PropertiesPanelSkeleton() {
  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 flex w-64 flex-col bg-card/80 backdrop-blur-md border-l border-border/50">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

function NodeTemplatesPanelSkeleton() {
  return (
    <div className="fixed left-0 top-0 bottom-0 z-40 flex w-64 flex-col bg-card/80 backdrop-blur-md border-r border-border/50">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex items-center justify-center border-t border-border/50 p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}

function CanvasPageContent() {
  const dispatch = useAppDispatch()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const showShortcutPanel = useAppSelector(selectShowShortcutPanel)
  const showToolbar = useAppSelector(selectShowToolbar)

  // 撤销/重做
  const { canUndo, canRedo, undo, redo } = useCanvasHistory()

  // 自动保存
  useAutosave()

  // 快捷键（传递撤销/重做函数）
  useShortcuts({ undo, redo, canUndo, canRedo })

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

  // 撤销
  const handleUndo = useCallback(() => {
    undo()
  }, [undo])

  // 重做
  const handleRedo = useCallback(() => {
    redo()
  }, [redo])

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
        onUndo={canUndo ? handleUndo : undefined}
        onRedo={canRedo ? handleRedo : undefined}
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
          dispatch(setShortcutPanelVisible(open))
        }}
      />

      {/* 顶部工具栏（可通过快捷键显示） */}
      {showToolbar && <Toolbar />}

      {/* 主画布区域 */}
      <div
        id="main-content"
        tabIndex={-1}
        className="relative flex flex-1 overflow-hidden"
        aria-label="画布工作区"
      >
        {/* 左侧节点模板面板 */}
        <Suspense fallback={<NodeTemplatesPanelSkeleton />}>
          <NodeTemplatesPanel />
        </Suspense>

        {/* 中央画布 */}
        <Canvas />

        {/* 右侧属性面板 */}
        <Suspense fallback={<PropertiesPanelSkeleton />}>
          <PropertiesPanel />
        </Suspense>
      </div>
    </>
  )
}

export default function CanvasPage() {
  return (
    <div className="flex h-screen flex-col">
      <ReactFlowProvider>
        <PerformanceMonitor>
          <CanvasPageContent />
        </PerformanceMonitor>
      </ReactFlowProvider>
    </div>
  )
}
