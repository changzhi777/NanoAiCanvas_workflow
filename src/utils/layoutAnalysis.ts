import { memo, useMemo } from 'react'
import type { Node, Edge } from 'reactflow'

export interface LayoutSuggestion {
  nodeId?: string // 如果为null则是全局建议
  position?: { x: number; y: number }
  confidence: number // 0-1
  reason: string
  type: 'move' | 'align' | 'reorder' | 'global'
}

interface LayoutAnalysisResult {
  suggestions: LayoutSuggestion[]
  score: number // 0-100 布局质量分数
  metrics: {
    totalNodes: number
    totalEdges: number
    isolatedNodes: number
    crossedEdges: number
    avgDistance: number
  }
}

/**
 * 分析节点布局并提供改进建议
 */
export const analyzeLayout = (nodes: Node[], edges: Edge[]): LayoutAnalysisResult => {
  const suggestions: LayoutSuggestion[] = []
  const metrics = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    isolatedNodes: 0,
    crossedEdges: 0,
    avgDistance: 0,
  }

  // 1. 检测孤立节点
  const isolatedNodes = nodes.filter(
    (node) => !edges.some((e) => e.source === node.id || e.target === node.id)
  )
  metrics.isolatedNodes = isolatedNodes.length

  if (isolatedNodes.length > 0) {
    isolatedNodes.forEach((node) => {
      suggestions.push({
        nodeId: node.id,
        position: { x: 100, y: 100 + isolatedNodes.indexOf(node) * 150 },
        confidence: 0.8,
        reason: '建议移至左侧区域，作为入口节点',
        type: 'move',
      })
    })
  }

  // 2. 检测交叉连线
  const crossedEdges = detectCrossedEdges(edges, nodes)
  metrics.crossedEdges = crossedEdges.length

  if (crossedEdges.length > 0) {
    suggestions.push({
      confidence: 0.9,
      reason: `发现 ${crossedEdges.length} 条交叉连线，建议调整节点位置以避免交叉`,
      type: 'global',
    })
  }

  // 3. 检测节点对齐
  const alignmentSuggestions = detectMisalignedNodes(nodes)
  suggestions.push(...alignmentSuggestions)

  // 4. 计算布局质量分数
  const score = calculateLayoutScore(metrics)

  return {
    suggestions,
    score,
    metrics,
  }
}

/**
 * 检测交叉连线
 */
const detectCrossedEdges = (edges: Edge[], nodes: Node[]) => {
  const crossed: Edge[] = []

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const edge1 = edges[i]
      const edge2 = edges[j]

      const source1 = nodes.find((n) => n.id === edge1.source)
      const target1 = nodes.find((n) => n.id === edge1.target)
      const source2 = nodes.find((n) => n.id === edge2.source)
      const target2 = nodes.find((n) => n.id === edge2.target)

      if (!source1 || !target1 || !source2 || !target2) continue

      if (
        doLinesIntersect(
          source1.position.x,
          source1.position.y,
          target1.position.x,
          target1.position.y,
          source2.position.x,
          source2.position.y,
          target2.position.x,
          target2.position.y
        )
      ) {
        crossed.push(edge1)
        crossed.push(edge2)
      }
    }
  }

  return [...new Set(crossed)]
}

/**
 * 判断两条线段是否相交
 */
const doLinesIntersect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean => {
  const ccw = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    return (f - b) * (c - a) < (d - b) * (e - a)
  }

  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  )
}

/**
 * 检测未对齐的节点
 */
const detectMisalignedNodes = (nodes: Node[]): LayoutSuggestion[] => {
  const suggestions: LayoutSuggestion[] = []

  // 按Y坐标分组（检测水平对齐）
  const yGroups = new Map<number, Node[]>()
  nodes.forEach((node) => {
    const yGroup = Math.round(node.position.y / 50) * 50 // 50px容差
    if (!yGroups.has(yGroup)) {
      yGroups.set(yGroup, [])
    }
    yGroups.get(yGroup)!.push(node)
  })

  // 检查同一行的节点是否对齐
  yGroups.forEach((nodesInRow) => {
    if (nodesInRow.length < 2) return

    const avgX = nodesInRow.reduce((sum, n) => sum + n.position.x, 0) / nodesInRow.length

    nodesInRow.forEach((node) => {
      if (Math.abs(node.position.x - avgX) > 100) {
        suggestions.push({
          nodeId: node.id,
          position: { x: avgX, y: node.position.y },
          confidence: 0.7,
          reason: `建议对齐到水平线（偏差 ${Math.round(Math.abs(node.position.x - avgX))}px）`,
          type: 'align',
        })
      }
    })
  })

  return suggestions
}

/**
 * 计算布局质量分数
 */
const calculateLayoutScore = (metrics: any): number => {
  let score = 100

  // 孤立节点扣分
  score -= metrics.isolatedNodes * 5

  // 交叉连线扣分
  score -= metrics.crossedEdges * 10

  // 没有任何边时扣分
  if (metrics.totalEdges === 0 && metrics.totalNodes > 1) {
    score -= 20
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * AI辅助布局建议组件
 */
export const LayoutSuggestions = memo(
  ({ analysis }: { analysis: LayoutAnalysisResult }) => {
    if (analysis.suggestions.length === 0) {
      return (
        <div className="layout-suggestions-empty text-center py-8">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-sm text-muted-foreground">
            布局完美，无需优化建议
          </p>
        </div>
      )
    }

    return (
      <div className="layout-suggestions space-y-3">
        {/* 质量分数 */}
        <div className="layout-score p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">布局质量</span>
            <span
              className={cn(
                'text-2xl font-bold',
                analysis.score >= 80
                  ? 'text-green-500'
                  : analysis.score >= 60
                  ? 'text-yellow-500'
                  : 'text-red-500'
              )}
            >
              {analysis.score}
            </span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                analysis.score >= 80
                  ? 'bg-green-500'
                  : analysis.score >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              )}
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>

        {/* 建议列表 */}
        <div className="suggestions-list space-y-2">
          {analysis.suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    suggestion.confidence >= 0.8
                      ? 'bg-green-500'
                      : suggestion.confidence >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{suggestion.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      置信度: {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {suggestion.type === 'move' && '移动'}
                      {suggestion.type === 'align' && '对齐'}
                      {suggestion.type === 'reorder' && '重排序'}
                      {suggestion.type === 'global' && '全局优化'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)

LayoutSuggestions.displayName = 'LayoutSuggestions'
