/**
 * Workflow 节点配置类型定义
 * 用于工作流中 AI 节点的执行参数配置
 */

export interface NodeExecutionConfig {
  /** 节点超时时间 (ms) */
  timeout: number
  /** 节点重试次数 */
  retryCount: number
  /** 最大并发节点数 */
  maxConcurrent: number
  /** 节点池大小 */
  nodePoolSize: number
  /** 是否启用节点缓存 */
  nodeCacheEnabled: boolean
  /** 执行模式: sync=同步, async=异步 */
  executionMode: 'sync' | 'async'
}

/** 默认节点配置 */
export const DEFAULT_NODE_CONFIG: NodeExecutionConfig = {
  timeout: 60000,
  retryCount: 3,
  maxConcurrent: 5,
  nodePoolSize: 10,
  nodeCacheEnabled: true,
  executionMode: 'sync',
}