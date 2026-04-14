import { useState, useEffect, useRef, useCallback } from 'react'
import type { Node, Viewport } from 'reactflow'

interface VirtualizedNodesOptions {
  margin?: number // 视口外预加载距离（px）
  enabled?: boolean // 是否启用虚拟化
}

export const useVirtualizedNodes = (
  nodes: Node[],
  viewport: Viewport,
  options: VirtualizedNodesOptions = {}
) => {
  const { margin = 200, enabled = true } = options
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set())
  const [isVirtualizationEnabled, setIsVirtualizationEnabled] = useState(enabled)
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map())

  // 计算视口边界
  const viewportBounds = useCallback(() => {
    const { x, y, zoom } = viewport

    // 视口尺寸（假设画布填满窗口）
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 考虑缩放
    const scaledWidth = viewportWidth / zoom
    const scaledHeight = viewportHeight / zoom

    return {
      left: x - margin,
      right: x + scaledWidth + margin,
      top: y - margin,
      bottom: y + scaledHeight + margin,
    }
  }, [viewport, margin])

  // 检查节点是否在视口内
  const isNodeInViewport = useCallback(
    (node: Node, bounds: ReturnType<typeof viewportBounds>) => {
      const { position } = node
      const nodeWidth = node.width || 200 // 默认节点宽度
      const nodeHeight = node.height || 100 // 默认节点高度

      return (
        position.x < bounds.right &&
        position.x + nodeWidth > bounds.left &&
        position.y < bounds.bottom &&
        position.y + nodeHeight > bounds.top
      )
    },
    []
  )

  // 更新可见节点
  useEffect(() => {
    if (!isVirtualizationEnabled) {
      // 如果禁用虚拟化，显示所有节点
      setVisibleNodes(new Set(nodes.map((n) => n.id)))
      return
    }

    const bounds = viewportBounds()
    const newVisibleNodes = new Set<string>()

    nodes.forEach((node) => {
      if (isNodeInViewport(node, bounds)) {
        newVisibleNodes.add(node.id)
      }
    })

    setVisibleNodes(newVisibleNodes)
  }, [nodes, viewport, isVirtualizationEnabled, viewportBounds, isNodeInViewport])

  // 注册节点引用
  const registerNodeRef = useCallback((nodeId: string, element: HTMLElement | null) => {
    if (element) {
      nodeRefs.current.set(nodeId, element)
    } else {
      nodeRefs.current.delete(nodeId)
    }
  }, [])

  // 获取过滤后的节点列表
  const filteredNodes = nodes.filter((node) => visibleNodes.has(node.id))

  // 性能统计
  const stats = {
    total: nodes.length,
    visible: visibleNodes.size,
    hidden: nodes.length - visibleNodes.size,
    savings: Math.round(((nodes.length - visibleNodes.size) / nodes.length) * 100),
  }

  return {
    visibleNodes,
    filteredNodes,
    registerNodeRef,
    stats,
    isVirtualizationEnabled,
    setIsVirtualizationEnabled,
  }
}
