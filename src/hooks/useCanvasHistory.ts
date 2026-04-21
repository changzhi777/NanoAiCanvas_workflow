import { useCallback, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setNodes, setEdges } from '@/store/slices/canvasSlice'
import { selectNodes, selectEdges } from '@/store/slices/canvasSlice'
import type { Node, Edge } from 'reactflow'
import type { NodeData, EdgeData } from '@/types'

interface HistoryEntry {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
}

const MAX_HISTORY = 50

/**
 * 简单的撤销/重做Hook
 * 使用内存存储历史记录
 */
export function useCanvasHistory() {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector(selectNodes)
  const edges = useAppSelector(selectEdges)

  const past = useRef<HistoryEntry[]>([])
  const future = useRef<HistoryEntry[]>([])

  // 记录当前状态到历史
  const recordState = useCallback(() => {
    // 保存当前状态到past
    past.current.push({ nodes, edges })

    // 限制历史长度
    if (past.current.length > MAX_HISTORY) {
      past.current.shift()
    }

    // 清空future
    future.current = []
  }, [nodes, edges])

  // 撤销
  const undo = useCallback(() => {
    if (past.current.length === 0) return false

    // 将当前状态移入future
    future.current.push({ nodes, edges })

    // 从past中取出上一个状态
    const previous = past.current.pop()!
    if (previous) {
      dispatch(setNodes(previous.nodes))
      dispatch(setEdges(previous.edges))
      return true
    }

    return false
  }, [nodes, edges, dispatch])

  // 重做
  const redo = useCallback(() => {
    if (future.current.length === 0) return false

    // 将当前状态移入past
    past.current.push({ nodes, edges })

    // 从future中取出下一个状态
    const next = future.current.pop()!
    if (next) {
      dispatch(setNodes(next.nodes))
      dispatch(setEdges(next.edges))
      return true
    }

    return false
  }, [nodes, edges, dispatch])

  // 清空历史
  const clearHistory = useCallback(() => {
    past.current = []
    future.current = []
  }, [])

  return {
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    recordState,
    undo,
    redo,
    clearHistory,
  }
}
