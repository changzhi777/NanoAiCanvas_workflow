// 节点类型
export enum NodeType {
  TASK = 'task',
  EVENT = 'event',
  MILESTONE = 'milestone',
  DECISION = 'decision',
  DATA = 'data',
  START = 'start',
  END = 'end',
  CUSTOM = 'custom',
}

// 节点状态
export enum NodeStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

// 节点数据结构
export interface NodeData {
  id: string
  type: NodeType
  label: string
  description?: string
  status: NodeStatus
  color?: string
  icon?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
}

// 边数据结构
export interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  color?: string
  type?: 'default' | 'straight' | 'step' | 'smoothstep'
  animated?: boolean
  style?: {
    strokeWidth?: number
    strokeDasharray?: string
  }
  condition?: string
  createdAt: number
}

// 画布状态
export interface CanvasState {
  nodes: NodeData[]
  edges: EdgeData[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
  selectedNodes: string[]
  selectedEdges: string[]
}

// 主题类型
export type Theme = 'light' | 'dark'

// 应用状态
export interface AppState {
  theme: Theme
  locale: string
  autosave: boolean
  autosaveInterval: number
}
