import { openDB } from 'idb'
import type { Node, Edge } from 'reactflow'
import type { NodeData, EdgeData } from '@/types'

const DB_NAME = 'nanoai-canvas-db'
const DB_VERSION = 1
const NODES_STORE = 'nodes'
const EDGES_STORE = 'edges'

// 初始化数据库
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(NODES_STORE)) {
        db.createObjectStore(NODES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(EDGES_STORE)) {
        db.createObjectStore(EDGES_STORE, { keyPath: 'id' })
      }
    },
  })
}

// 添加节点
export async function addNode(node: Node<NodeData>) {
  const db = await initDB()
  await db.put(NODES_STORE, node)
}

// 添加连线
export async function addEdge(edge: Edge<EdgeData>) {
  const db = await initDB()
  await db.put(EDGES_STORE, edge)
}

// 更新节点
export async function updateNode(node: Node<NodeData>) {
  const db = await initDB()
  await db.put(NODES_STORE, node)
}

// 删除节点
export async function deleteNode(nodeId: string) {
  const db = await initDB()
  await db.delete(NODES_STORE, nodeId)
}

// 删除连线
export async function deleteEdge(edgeId: string) {
  const db = await initDB()
  await db.delete(EDGES_STORE, edgeId)
}

// 获取所有节点
export async function getAllNodes(): Promise<Node<NodeData>[]> {
  const db = await initDB()
  return db.getAll(NODES_STORE)
}

// 获取所有连线
export async function getAllEdges(): Promise<Edge<EdgeData>[]> {
  const db = await initDB()
  return db.getAll(EDGES_STORE)
}

// 清空数据库
export async function clearAll() {
  const db = await initDB()
  await db.clear(NODES_STORE)
  await db.clear(EDGES_STORE)
}

// 导出数据
export async function exportData() {
  const nodes = await getAllNodes()
  const edges = await getAllEdges()
  return JSON.stringify({ nodes, edges }, null, 2)
}

// 导入数据
export async function importData(jsonData: string) {
  const data = JSON.parse(jsonData)
  const db = await initDB()

  await db.clear(NODES_STORE)
  await db.clear(EDGES_STORE)

  for (const node of data.nodes) {
    await db.put(NODES_STORE, node)
  }

  for (const edge of data.edges) {
    await db.put(EDGES_STORE, edge)
  }
}
