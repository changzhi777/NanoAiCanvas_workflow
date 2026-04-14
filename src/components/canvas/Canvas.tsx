import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import {
  selectNodes,
  selectEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
} from '@/store/slices/canvasSlice'
import CardNode from './nodes/CardNode'
import './canvas.css'

// 节点类型映射
const nodeTypes = {
  card: CardNode,
}

export default function Canvas() {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector(selectNodes)
  const edges = useAppSelector(selectEdges)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  // 预留的缩放控制功能（将来用于工具栏缩放按钮）
  void useReactFlow()

  // 处理节点变化
  const handleNodesChange = useCallback(
    (changes: any) => {
      dispatch(onNodesChange(changes))
    },
    [dispatch],
  )

  // 处理边变化
  const handleEdgesChange = useCallback(
    (changes: any) => {
      dispatch(onEdgesChange(changes))
    },
    [dispatch],
  )

  // 处理连接
  const handleConnect = useCallback(
    (connection: any) => {
      dispatch(onConnect(connection))
    },
    [dispatch],
  )

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* 背景装饰光晕 */}
      <div className="bg-orb-top-right" />
      <div className="bg-orb-bottom-left" />
      <div className="bg-orb-center" />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--border))"
        />
        <Controls className="bg-card border border-border" />
        <MiniMap
          className="bg-card border border-border"
          nodeColor="#4ade80"
          maskColor="hsl(var(--background) / 0.6)"
        />
      </ReactFlow>
    </div>
  )
}
