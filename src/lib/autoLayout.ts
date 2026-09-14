/**
 * 自动布局工具
 * 用于自动排列节点，避免重叠
 */

import { WorkflowNode } from '@/stores/nanoaiWorkflowStore';

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  startX: number;
  startY: number;
  maxNodesPerRow?: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 300,
  nodeHeight: 200,
  horizontalGap: 50,
  verticalGap: 50,
  startX: 100,
  startY: 100,
  maxNodesPerRow: 4,
};

/**
 * 自动布局节点 - 网格布局
 */
export function autoLayoutNodes(
  nodes: WorkflowNode[],
  options: Partial<LayoutOptions> = {}
): WorkflowNode[] {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  return nodes.map((node, index) => {
    const row = Math.floor(index / (opts.maxNodesPerRow || 4));
    const col = index % (opts.maxNodesPerRow || 4);

    return {
      ...node,
      position: {
        x: opts.startX + col * (opts.nodeWidth + opts.horizontalGap),
        y: opts.startY + row * (opts.nodeHeight + opts.verticalGap),
      },
    };
  });
}

/**
 * 自动布局节点 - 树状布局（按照层级关系）
 */
export function autoLayoutNodesTree(
  nodes: WorkflowNode[],
  edges: any[],
  options: Partial<LayoutOptions> = {}
): WorkflowNode[] {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  // 构建节点层级关系
  const nodeLevels = new Map<string, number>();
  const visited = new Set<string>();

  // 找到根节点（没有输入的节点）
  const inputNodes = nodes.filter(node => {
    const hasInput = edges.some(edge => edge.target === node.id);
    return !hasInput;
  });

  // BFS 计算每个节点的层级
  const queue: Array<{ nodeId: string; level: number }> = [];
  inputNodes.forEach(node => {
    queue.push({ nodeId: node.id, level: 0 });
    nodeLevels.set(node.id, 0);
  });

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // 找到所有子节点
    const childEdges = edges.filter(edge => edge.source === nodeId);
    childEdges.forEach(edge => {
      if (!nodeLevels.has(edge.target)) {
        nodeLevels.set(edge.target, level + 1);
        queue.push({ nodeId: edge.target, level: level + 1 });
      }
    });
  }

  // 按层级分组节点
  const levelGroups = new Map<number, WorkflowNode[]>();
  nodes.forEach(node => {
    const level = nodeLevels.get(node.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  // 为每个层级的节点分配位置
  const layoutedNodes: WorkflowNode[] = [];
  levelGroups.forEach((nodesInLevel, level) => {
    const levelWidth = nodesInLevel.length * opts.nodeWidth + (nodesInLevel.length - 1) * opts.horizontalGap;
    const startX = opts.startX + Math.max(0, (opts.nodeWidth * 3 - levelWidth) / 2); // 居中

    nodesInLevel.forEach((node, index) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: startX + index * (opts.nodeWidth + opts.horizontalGap),
          y: opts.startY + level * (opts.nodeHeight + opts.verticalGap),
        },
      });
    });
  });

  return layoutedNodes;
}

/**
 * 检查节点是否有重叠
 */
export function hasOverlappingNodes(nodes: WorkflowNode[], threshold: number = 50): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const distanceX = Math.abs(nodeA.position.x - nodeB.position.x);
      const distanceY = Math.abs(nodeA.position.y - nodeB.position.y);

      if (distanceX < threshold && distanceY < threshold) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 检测节点是否过于拥挤
 */
export function isNodesCrowded(nodes: WorkflowNode[], maxNodesPerArea: number = 6): boolean {
  if (nodes.length <= 1) return false;

  // 计算边界框
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 300); // 假设节点宽度300
    maxY = Math.max(maxY, node.position.y + 200); // 假设节点高度200
  });

  const area = (maxX - minX) * (maxY - minY);
  const density = nodes.length / (area / 100000); // 每单位面积的节点数

  return density > maxNodesPerArea;
}
