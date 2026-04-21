/**
 * 智能自动布局系统
 * 使用 dagre 布局算法思想，实现节点层次化排列
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore';

export interface LayoutNode extends WorkflowNode {
  level: number;
  parents: string[];
  children: string[];
  x?: number;
  y?: number;
}

export interface LayoutEdge extends WorkflowEdge {
  fromLevel: number;
  toLevel: number;
}

/**
 * 计算节点层级关系
 */
function calculateNodeLevels(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, number> {
  const nodeLevels = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 初始化
  nodes.forEach(node => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  // 构建邻接表和入度
  edges.forEach(edge => {
    const neighbors = adjacency.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacency.set(edge.source, neighbors);

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // BFS 计算层级
  const queue: string[] = [];

  // 找到所有入度为0的节点（根节点）
  nodes.forEach(node => {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
      nodeLevels.set(node.id, 0);
    }
  });

  // 如果没有根节点（存在环），给第一个节点赋层级0
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
    nodeLevels.set(nodes[0].id, 0);
  }

  // BFS遍历
  const visited = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const currentLevel = nodeLevels.get(nodeId) || 0;
    const neighbors = adjacency.get(nodeId) || [];

    neighbors.forEach(neighborId => {
      if (!nodeLevels.has(neighborId) || nodeLevels.get(neighborId)! < currentLevel + 1) {
        nodeLevels.set(neighborId, currentLevel + 1);
      }

      inDegree.set(neighborId, (inDegree.get(neighborId) || 1) - 1);
      if ((inDegree.get(neighborId) || 0) === 0) {
        queue.push(neighborId);
      }
    });
  }

  // 给未访问的节点分配层级（处理孤立节点和环）
  nodes.forEach(node => {
    if (!nodeLevels.has(node.id)) {
      nodeLevels.set(node.id, 0);
    }
  });

  return nodeLevels;
}

/**
 * 分层布局算法
 */
function layerLayout(layoutNodes: LayoutNode[], options: {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  canvasWidth: number;
}): LayoutNode[] {
  const {
    nodeWidth = 300,
    nodeHeight = 200,
    horizontalGap = 60,
    verticalGap = 80,
    canvasWidth = 2000,
  } = options;

  // 按层级分组
  const levelGroups = new Map<number, LayoutNode[]>();
  layoutNodes.forEach(node => {
    const level = node.level;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  const startX = 100;
  const startY = 100;

  // 计算每层的节点位置
  levelGroups.forEach((nodesInLevel, level) => {
    const levelNodeCount = nodesInLevel.length;

    // 计算该层在Y轴的位置
    const layerY = startY + level * (nodeHeight + verticalGap);

    // 计算该层节点的X轴位置（居中对齐）
    const totalLayerWidth = levelNodeCount * nodeWidth + (levelNodeCount - 1) * horizontalGap;
    const layerStartX = Math.max(
      startX,
      (canvasWidth - totalLayerWidth) / 2 // 居中对齐
    );

    // 为该层的每个节点分配位置
    nodesInLevel.forEach((node, index) => {
      node.x = layerStartX + index * (nodeWidth + horizontalGap);
      node.y = layerY;
    });
  });

  return layoutNodes;
}

/**
 * 智能自动布局 - 主入口
 */
export function smartAutoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: {
    nodeWidth?: number;
    nodeHeight?: number;
    horizontalGap?: number;
    verticalGap?: number;
    canvasWidth?: number;
    canvasHeight?: number;
    animate?: boolean;
  } = {}
): WorkflowNode[] {
  const opts = {
    nodeWidth: 300,
    nodeHeight: 200,
    horizontalGap: 60,
    verticalGap: 80,
    canvasWidth: 2000,
    canvasHeight: 1200,
    animate: true,
    ...options,
  };

  if (nodes.length === 0) return [];

  // 单个节点直接居中
  if (nodes.length === 1) {
    return [{
      ...nodes[0],
      position: {
        x: (opts.canvasWidth - opts.nodeWidth) / 2,
        y: (opts.canvasHeight - opts.nodeHeight) / 2,
      },
    }];
  }

  // 创建布局节点（添加层级信息）
  const layoutNodes: LayoutNode[] = nodes.map(node => ({
    ...node,
    level: 0,
    parents: [],
    children: [],
  }));

  // 计算节点层级
  const nodeLevels = calculateNodeLevels(layoutNodes, edges);

  // 分配层级
  layoutNodes.forEach(node => {
    node.level = nodeLevels.get(node.id) || 0;
  });

  // 按层级排序（确保边从低层级指向高层级）
  layoutNodes.sort((a, b) => a.level - b.level);

  // 应用分层布局
  const layouted = layerLayout(layoutNodes, opts);

  // 转换回普通节点
  return layouted.map(node => ({
    ...node,
    position: {
      x: node.x ?? node.position.x,
      y: node.y ?? node.position.y,
    },
  })) as WorkflowNode[];
}

/**
 * 检测节点是否在可视区域内
 */
export function areNodesInViewport(nodes: WorkflowNode[], viewport: {
  width: number;
  height: number;
  padding?: number;
}): boolean {
  const { width, height, padding = 100 } = viewport;

  return nodes.every(node => {
    const x = node.position.x;
    const y = node.position.y;
    return (
      x >= -padding &&
      x <= width - padding &&
      y >= -padding &&
      y <= height - padding
    );
  });
}

/**
 * 检测节点是否拥挤
 */
export function isLayoutCrowded(nodes: WorkflowNode[], threshold: number = 150): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const distance = Math.sqrt(
        Math.pow(nodeA.position.x - nodeB.position.x, 2) +
        Math.pow(nodeA.position.y - nodeB.position.y, 2)
      );

      if (distance < threshold) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 计算布局质量分数
 */
export function calculateLayoutScore(nodes: WorkflowNode[], edges: WorkflowEdge[]): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // 检查重叠
  if (isLayoutCrowded(nodes, 100)) {
    issues.push('节点存在重叠');
    score -= 30;
  }

  // 检查是否超出可视区域
  if (!areNodesInViewport(nodes, { width: 2000, height: 1200 })) {
    issues.push('部分节点超出可视区域');
    score -= 20;
  }

  // 检查边长
  const longEdges = edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return false;

    const distance = Math.sqrt(
      Math.pow(sourceNode.position.x - targetNode.position.x, 2) +
      Math.pow(sourceNode.position.y - targetNode.position.y, 2)
    );

    return distance > 600; // 边长超过600px视为过长
  });

  if (longEdges.length > edges.length / 2) {
    issues.push(`${longEdges.length} 条连线过长，建议重新布局`);
    score -= 15;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * 应用布局动画（通过返回带动画信息的节点）
 */
export function applyLayoutAnimation(
  nodes: WorkflowNode[],
  duration: number = 500
): WorkflowNode[] {
  return nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    },
  }));
}
