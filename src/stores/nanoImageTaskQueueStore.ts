/**
 * 任务队列状态管理
 * 支持单个任务取消/暂停和批量任务管理
 */

import { create } from 'zustand'
import type { ImageModelId, FullGenerationParams } from '@/types/image'

// ==================== 单个任务类型 ====================

export type SingleTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface SingleTask {
  id: string
  prompt: string
  model: ImageModelId
  params: Omit<FullGenerationParams, 'prompt' | 'model'>
  status: SingleTaskStatus
  progress: number
  result?: string[]
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// ==================== 批量任务类型 ====================

export type BatchTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'

export interface BatchTaskItem {
  id: string
  prompt: string
  status: SingleTaskStatus
  progress: number
  result?: string[]
  error?: string
}

export interface BatchTask {
  id: string
  name: string
  items: BatchTaskItem[]
  model: ImageModelId
  params: Omit<FullGenerationParams, 'prompt' | 'model'>
  status: BatchTaskStatus
  progress: number
  currentIndex: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// ==================== Store 接口 ====================

interface TaskQueueState {
  // AbortController registry for task termination
  abortControllers: Map<string, AbortController>

  // 单个任务（当前正在执行的任务）
  currentTask: SingleTask | null

  // 批量任务队列
  batchQueue: BatchTask[]
  isBatchExecuting: boolean

  // 单个任务 Actions
  registerAbortController: (taskId: string, controller: AbortController) => void
  unregisterAbortController: (taskId: string) => void
  abortTask: (taskId: string) => boolean

  // 当前任务 Actions
  setCurrentTask: (task: SingleTask | null) => void
  updateCurrentTask: (updates: Partial<SingleTask>) => void

  // 批量任务 Actions
  addBatchTask: (task: {
    name: string
    prompts: string[]
    model: ImageModelId
    params: Omit<FullGenerationParams, 'prompt' | 'model'>
  }) => BatchTask
  removeBatchTask: (taskId: string) => void
  clearBatchQueue: () => void

  // 批量执行控制
  startBatchExecution: () => void
  pauseBatchExecution: () => void
  resumeBatchExecution: () => void
  stopBatchExecution: () => void

  // 更新批量任务中的单个项目
  updateBatchItem: (taskId: string, itemId: string, updates: Partial<BatchTaskItem>) => void
  updateBatchTask: (taskId: string, updates: Partial<BatchTask>) => void
}

export const useTaskQueueStore = create<TaskQueueState>((set, get) => ({
  abortControllers: new Map(),
  currentTask: null,
  batchQueue: [],
  isBatchExecuting: false,

  // ==================== 单个任务 AbortController ====================

  registerAbortController: (taskId, controller) => {
    set((state) => {
      const newMap = new Map(state.abortControllers)
      newMap.set(taskId, controller)
      return { abortControllers: newMap }
    })
  },

  unregisterAbortController: (taskId) => {
    set((state) => {
      const newMap = new Map(state.abortControllers)
      newMap.delete(taskId)
      return { abortControllers: newMap }
    })
  },

  abortTask: (taskId) => {
    const controller = get().abortControllers.get(taskId)
    if (controller) {
      controller.abort()
      get().unregisterAbortController(taskId)
      return true
    }
    return false
  },

  // ==================== 当前任务 ====================

  setCurrentTask: (task) => set({ currentTask: task }),

  updateCurrentTask: (updates) =>
    set((state) => ({
      currentTask: state.currentTask
        ? { ...state.currentTask, ...updates }
        : null,
    })),

  // ==================== 批量任务 ====================

  addBatchTask: (taskData) => {
    const id = crypto.randomUUID()
    const items: BatchTaskItem[] = taskData.prompts.map((prompt) => ({
      id: crypto.randomUUID(),
      prompt,
      status: 'pending' as SingleTaskStatus,
      progress: 0,
    }))

    const newTask: BatchTask = {
      id,
      name: taskData.name || `批量任务 ${new Date().toLocaleTimeString()}`,
      items,
      model: taskData.model,
      params: taskData.params,
      status: 'pending',
      progress: 0,
      currentIndex: 0,
      createdAt: new Date().toISOString(),
    }

    set((state) => ({
      batchQueue: [...state.batchQueue, newTask],
    }))

    return newTask
  },

  removeBatchTask: (taskId) =>
    set((state) => ({
      batchQueue: state.batchQueue.filter((t) => t.id !== taskId),
    })),

  clearBatchQueue: () =>
    set({
      batchQueue: [],
      isBatchExecuting: false,
    }),

  // ==================== 批量执行控制 ====================

  startBatchExecution: () => {
    set((state) => ({
      isBatchExecuting: true,
      batchQueue: state.batchQueue.map((task) =>
        task.status === 'pending'
          ? { ...task, status: 'running' as BatchTaskStatus, startedAt: new Date().toISOString() }
          : task
      ),
    }))
  },

  pauseBatchExecution: () => {
    set((state) => ({
      isBatchExecuting: false,
      batchQueue: state.batchQueue.map((task) =>
        task.status === 'running'
          ? { ...task, status: 'paused' as BatchTaskStatus }
          : task
      ),
    }))
  },

  resumeBatchExecution: () => {
    set((state) => ({
      isBatchExecuting: true,
      batchQueue: state.batchQueue.map((task) =>
        task.status === 'paused'
          ? { ...task, status: 'running' as BatchTaskStatus }
          : task
      ),
    }))
  },

  stopBatchExecution: () => {
    const { batchQueue } = get()
    // Abort all running tasks
    batchQueue.forEach((task) => {
      task.items.forEach((item) => {
        if (item.status === 'running') {
          get().abortTask(item.id)
        }
      })
    })
    set({
      isBatchExecuting: false,
      batchQueue: batchQueue.map((task) => ({
        ...task,
        status: task.status === 'running' ? 'failed' as BatchTaskStatus : task.status,
      })),
    })
  },

  // ==================== 更新批量任务项目 ====================

  updateBatchItem: (taskId, itemId, updates) =>
    set((state) => ({
      batchQueue: state.batchQueue.map((task) => {
        if (task.id !== taskId) return task
        return {
          ...task,
          items: task.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
      }),
    })),

  updateBatchTask: (taskId, updates) =>
    set((state) => ({
      batchQueue: state.batchQueue.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),
}))
