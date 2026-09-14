import { memo, useState, useEffect } from 'react'
import { EdgeProps, getBezierPath, BaseEdge } from 'reactflow'

interface DataFlowEdgeProps extends EdgeProps {
  data?: {
    dataCount?: number
    flowSpeed?: number // 0-1, 越大越快
  }
}

const DataFlowEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style }: DataFlowEdgeProps) => {
    // @ts-expect-error - flowProgress是预留功能，暂时未使用
    const [flowProgress, setFlowProgress] = useState(0)
    const [dataPoints, setDataPoints] = useState<Array<{ id: number; position: number }>>([])

    // 计算贝塞尔曲线路径
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    // 计算中点
    const midX = (sourceX + targetX) / 2
    const midY = (sourceY + targetY) / 2

    // 数据流动画（预留功能，当前未实际使用）
    useEffect(() => {
      const flowSpeed = data?.flowSpeed || 0.02
      const interval = setInterval(() => {
        setFlowProgress((prev: number) => (prev + flowSpeed) % 1)
      }, 16) // 60fps

      // 生成数据点
      const pointsInterval = setInterval(() => {
        setDataPoints((prev) => {
          const newPoint = {
            id: Date.now(),
            position: 0,
          }
          const updated = [...prev, newPoint]

          // 移除超出终点的点
          return updated.filter((p) => p.position < 1.2)
        })
      }, 500) // 每500ms生成一个新数据点

      return () => {
        clearInterval(interval)
        clearInterval(pointsInterval)
      }
    }, [data?.flowSpeed])

    // 更新数据点位置
    useEffect(() => {
      const speed = data?.flowSpeed || 0.02
      const interval = setInterval(() => {
        setDataPoints((prev) =>
          prev.map((p) => ({
            ...p,
            position: p.position + speed,
          }))
        )
      }, 16)

      return () => clearInterval(interval)
    }, [data?.flowSpeed])

    return (
      <g className="data-flow-edge">
        {/* 基础连线 */}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: 2,
          }}
        />

        {/* 数据流动点 */}
        {dataPoints.map((point) => {
          // 计算数据点在贝塞尔曲线上的位置
          const t = point.position
          const controlPoint1X = sourceX + Math.abs(targetX - sourceX) * 0.5
          const controlPoint1Y = sourceY
          const controlPoint2X = targetX - Math.abs(targetX - sourceX) * 0.5
          const controlPoint2Y = targetY

          // 三次贝塞尔曲线公式
          const x =
            Math.pow(1 - t, 3) * sourceX +
            3 * Math.pow(1 - t, 2) * t * controlPoint1X +
            3 * (1 - t) * Math.pow(t, 2) * controlPoint2X +
            Math.pow(t, 3) * targetX

          const y =
            Math.pow(1 - t, 3) * sourceY +
            3 * Math.pow(1 - t, 2) * t * controlPoint1Y +
            3 * (1 - t) * Math.pow(t, 2) * controlPoint2Y +
            Math.pow(t, 3) * targetY

          // 计算透明度（两端淡出）
          const opacity = t < 0.2 ? t * 5 : t > 0.8 ? (1 - t) * 5 : 1

          return (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r={3}
              fill="hsl(var(--primary))"
              opacity={opacity * 0.8}
            >
              <animate
                attributeName="r"
                values="3;5;3"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          )
        })}

        {/* 数据统计标签 */}
        {data?.dataCount !== undefined && data.dataCount > 0 && (
          <g transform={`translate(${midX}, ${midY})`}>
            <rect
              x="-20"
              y="-10"
              width="40"
              height="20"
              fill="hsl(var(--background))"
              rx="4"
              opacity="0.9"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              alignmentBaseline="middle"
            >
              {data.dataCount} items
            </text>
          </g>
        )}
      </g>
    )
  }
)

DataFlowEdge.displayName = 'DataFlowEdge'

export default DataFlowEdge
