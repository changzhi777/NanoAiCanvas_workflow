/**
 * 自定义连线组件（增强版）
 * 功能：箭头指示、粒子流动、悬停交互、动态粗细、彩色渐变、贝塞尔曲线
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';
import { cn } from '@/lib/utils';
import { NODE_TYPE_TO_CATEGORY, NodeFunctionCategory } from './nodeColors';

export interface CustomEdgeData {
  status?: 'idle' | 'running' | 'completed' | 'error';
  sourceType?: string;
  targetType?: string;
  sourceId?: string;
  targetId?: string;
}

export const CustomEdge = memo((props: EdgeProps<CustomEdgeData>) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Right,
    targetPosition = Position.Left,
    data,
    selected,
  } = props;

  const [isHovered, setIsHovered] = useState(false);

  // 获取源节点类型
  const sourceNodeType = data?.sourceType || '';
  const edgeStatus = data?.status || 'idle';

  // 计算贝塞尔曲线路径
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 获取连线分类
  const getCategory = useCallback((nodeType: string): 'input' | 'ai' | 'output' | 'tool' => {
    const category = NODE_TYPE_TO_CATEGORY[nodeType];
    if (!category) return 'tool';

    switch (category) {
      case NodeFunctionCategory.INPUT:
        return 'input';
      case NodeFunctionCategory.AI_GENERATOR:
        return 'ai';
      case NodeFunctionCategory.OUTPUT:
        return 'output';
      case NodeFunctionCategory.TOOL:
        return 'tool';
    }
  }, []);

  const category = getCategory(sourceNodeType);

  // 动态粗细
  const strokeWidth = edgeStatus === 'running' ? 5 : edgeStatus === 'idle' ? 3 : 4;
  const hoverStrokeWidth = isHovered ? strokeWidth + 1 : strokeWidth;

  // 获取全局渐变 ID
  const gradientId = useMemo(() => {
    return `url(#edge-gradient-${category})`;
  }, [category]);

  // 箭头颜色
  const arrowColors = {
    input: '#64B5F6',
    ai: '#81C784',
    output: '#FFB74D',
    tool: '#90A4AE'
  };
  const arrowColor = arrowColors[category] || '#90A4AE';

  // 连线样式类
  const edgeClasses = cn(
    'edge-enhanced',
    `edge-from-${category}`,
    edgeStatus === 'idle' && 'edge-idle',
    edgeStatus === 'running' && 'edge-running',
    edgeStatus === 'completed' && 'edge-completed',
    edgeStatus === 'error' && 'edge-error',
    selected && 'stroke-[4px]',
    isHovered && 'edge-hovered',
    // 虚线流动动画
    edgeStatus !== 'idle' && 'edge-flow'
  );

  // 粒子动画类
  const particleClasses = cn(
    'edge-particle',
    edgeStatus !== 'idle' && 'animate-particle-flow'
  );

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* 定义箭头标记 */}
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          className="edge-arrow-marker"
        >
          <path
            d="M2,6 L10,2 L10,10 L2,6"
            fill={arrowColor}
            className={cn('transition-opacity duration-200', isHovered ? 'opacity-100' : 'opacity-70')}
          />
        </marker>
      </defs>

      {/* 主连线 */}
      <path
        id={id}
        d={edgePath}
        className={edgeClasses}
        style={{
          strokeWidth: hoverStrokeWidth,
          fill: 'none',
          stroke: gradientId,
          markerEnd: `url(#arrow-${id})`,
        }}
      />

      {/* 粒子效果 - 仅在运行中或悬停时显示 */}
      {(edgeStatus === 'running' || isHovered) && (
        <circle
          r={4}
          className={particleClasses}
          fill={arrowColor}
          style={{
            offsetPath: `path('${edgePath}')`,
          }}
        />
      )}

      {/* 悬停时显示的详细信息 */}
      {isHovered && (
        <g className="edge-tooltip-group">
          <foreignObject
            x={(sourceX + targetX) / 2 - 60}
            y={(sourceY + targetY) / 2 - 20}
            width={120}
            height={40}
            className="pointer-events-none"
          >
            <div className={cn(
              'edge-tooltip',
              'px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-foreground text-background',
              'shadow-lg border border-border/20',
              'backdrop-blur-sm'
            )}>
              <div className="flex items-center gap-2">
                {edgeStatus === 'running' && (
                  <span className="animate-spin">⚡</span>
                )}
                <span>
                  {edgeStatus === 'running' ? '传输中' :
                   edgeStatus === 'completed' ? '已完成' :
                   edgeStatus === 'error' ? '错误' : '空闲'}
                </span>
              </div>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';

export default CustomEdge;
