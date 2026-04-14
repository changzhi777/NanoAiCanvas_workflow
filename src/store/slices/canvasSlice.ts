import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from 'reactflow'
import { addNode as dbAddNode, addEdge as dbAddEdge, updateNode, deleteNode, deleteEdge } from '../db'
import type { NodeData, EdgeData } from '@/types'

interface CanvasState {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

// 异步 thunk：添加节点
export const addNodeAsync = createAsyncThunk(
  'canvas/addNode',
  async (node: Node<NodeData>) => {
    await dbAddNode(node)
    return node
  },
)

// 异步 thunk：添加连线
export const addEdgeAsync = createAsyncThunk(
  'canvas/addEdge',
  async (edge: Edge<EdgeData>) => {
    await dbAddEdge(edge)
    return edge
  },
)

// 异步 thunk：更新节点
export const updateNodeAsync = createAsyncThunk(
  'canvas/updateNode',
  async (node: Node<NodeData>) => {
    await updateNode(node)
    return node
  },
)

// 异步 thunk：删除节点
export const deleteNodeAsync = createAsyncThunk(
  'canvas/deleteNode',
  async (nodeId: string) => {
    await deleteNode(nodeId)
    return nodeId
  },
)

// 异步 thunk：删除连线
export const deleteEdgeAsync = createAsyncThunk(
  'canvas/deleteEdge',
  async (edgeId: string) => {
    await deleteEdge(edgeId)
    return edgeId
  },
)

// 异步 thunk：从存储加载
export const loadFromStorage = createAsyncThunk(
  'canvas/loadFromStorage',
  async () => {
    // 这里会从 IndexedDB 加载数据
    // 暂时返回初始状态
    return { nodes: [], edges: [] }
  },
)

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<Node<NodeData>[]>) => {
      state.nodes = action.payload
    },
    setEdges: (state, action: PayloadAction<Edge<EdgeData>[]>) => {
      state.edges = action.payload
    },
    onNodesChange: (state, action: PayloadAction<NodeChange[]>) => {
      state.nodes = applyNodeChanges(action.payload, state.nodes)
    },
    onEdgesChange: (state, action: PayloadAction<EdgeChange[]>) => {
      state.edges = applyEdgeChanges(action.payload, state.edges)
    },
    onConnect: (state, action: PayloadAction<Connection>) => {
      const newEdge: Edge<EdgeData> = {
        ...action.payload,
        id: `edge_${Date.now()}`,
        type: 'smoothstep',
        animated: false,
        data: {
          id: `edge_${Date.now()}`,
          source: action.payload.source,
          target: action.payload.target,
          createdAt: Date.now(),
        },
      }
      state.edges = addEdge({ ...newEdge, animated: false }, state.edges)
    },
    setViewport: (state, action: PayloadAction<Partial<typeof state.viewport>>) => {
      state.viewport = { ...state.viewport, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addNodeAsync.fulfilled, (state, action) => {
        state.nodes.push(action.payload)
      })
      .addCase(addEdgeAsync.fulfilled, (state, action) => {
        state.edges.push(action.payload)
      })
      .addCase(updateNodeAsync.fulfilled, (state, action) => {
        const index = state.nodes.findIndex((n) => n.id === action.payload.id)
        if (index !== -1) {
          state.nodes[index] = action.payload
        }
      })
      .addCase(deleteNodeAsync.fulfilled, (state, action) => {
        state.nodes = state.nodes.filter((n) => n.id !== action.payload)
        state.edges = state.edges.filter((e) => e.source !== action.payload && e.target !== action.payload)
      })
      .addCase(deleteEdgeAsync.fulfilled, (state, action) => {
        state.edges = state.edges.filter((e) => e.id !== action.payload)
      })
      .addCase(loadFromStorage.fulfilled, (state, action) => {
        state.nodes = action.payload.nodes
        state.edges = action.payload.edges
      })
  },
})

export const {
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setViewport,
} = canvasSlice.actions

export const selectNodes = (state: RootState) => state.canvas.nodes
export const selectEdges = (state: RootState) => state.canvas.edges
export const selectViewport = (state: RootState) => state.canvas.viewport

export default canvasSlice.reducer
