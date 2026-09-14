import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskQueueStore, type SingleTask, type BatchTaskItem } from '@/stores/nanoImageTaskQueueStore'

const mockSingleTask = (id = 't1'): SingleTask => ({
  id,
  prompt: 'test prompt',
  model: 'nanobanana2' as any,
  params: {} as any,
  status: 'pending',
  progress: 0,
  createdAt: new Date().toISOString(),
})

describe('taskQueueStore', () => {
  beforeEach(() => {
    useTaskQueueStore.setState({
      abortControllers: new Map(),
      currentTask: null,
      batchQueue: [],
      isBatchExecuting: false,
    })
  })

  // ==================== AbortController ====================

  describe('abortControllers', () => {
    it('should register and retrieve controller', () => {
      const ctrl = new AbortController()
      useTaskQueueStore.getState().registerAbortController('t1', ctrl)
      expect(useTaskQueueStore.getState().abortControllers.get('t1')).toBe(ctrl)
    })

    it('should unregister controller', () => {
      const ctrl = new AbortController()
      useTaskQueueStore.getState().registerAbortController('t1', ctrl)
      useTaskQueueStore.getState().unregisterAbortController('t1')
      expect(useTaskQueueStore.getState().abortControllers.has('t1')).toBe(false)
    })

    it('abortTask should abort and unregister', () => {
      const ctrl = new AbortController()
      useTaskQueueStore.getState().registerAbortController('t1', ctrl)
      const result = useTaskQueueStore.getState().abortTask('t1')
      expect(result).toBe(true)
      expect(ctrl.signal.aborted).toBe(true)
      expect(useTaskQueueStore.getState().abortControllers.has('t1')).toBe(false)
    })

    it('abortTask returns false for unknown task', () => {
      expect(useTaskQueueStore.getState().abortTask('unknown')).toBe(false)
    })
  })

  // ==================== Single Task ====================

  describe('currentTask', () => {
    it('should set and update current task', () => {
      const task = mockSingleTask()
      useTaskQueueStore.getState().setCurrentTask(task)
      expect(useTaskQueueStore.getState().currentTask?.id).toBe('t1')

      useTaskQueueStore.getState().updateCurrentTask({ status: 'running', progress: 50 })
      const updated = useTaskQueueStore.getState().currentTask!
      expect(updated.status).toBe('running')
      expect(updated.progress).toBe(50)
    })

    it('updateCurrentTask should do nothing when no current task', () => {
      useTaskQueueStore.getState().updateCurrentTask({ status: 'running' })
      expect(useTaskQueueStore.getState().currentTask).toBeNull()
    })

    it('should clear current task', () => {
      useTaskQueueStore.getState().setCurrentTask(mockSingleTask())
      useTaskQueueStore.getState().setCurrentTask(null)
      expect(useTaskQueueStore.getState().currentTask).toBeNull()
    })
  })

  // ==================== Batch Tasks ====================

  describe('batch tasks', () => {
    it('addBatchTask should create batch with items', () => {
      const task = useTaskQueueStore.getState().addBatchTask({
        name: 'Test Batch',
        prompts: ['prompt1', 'prompt2', 'prompt3'],
        model: 'nanobanana2' as any,
        params: {} as any,
      })
      expect(task.id).toBeDefined()
      expect(task.items).toHaveLength(3)
      expect(task.status).toBe('pending')
      expect(useTaskQueueStore.getState().batchQueue).toHaveLength(1)
    })

    it('removeBatchTask should remove from queue', () => {
      const task = useTaskQueueStore.getState().addBatchTask({
        name: 'Test',
        prompts: ['p1'],
        model: 'nanobanana2' as any,
        params: {} as any,
      })
      useTaskQueueStore.getState().removeBatchTask(task.id)
      expect(useTaskQueueStore.getState().batchQueue).toHaveLength(0)
    })

    it('clearBatchQueue should clear all', () => {
      useTaskQueueStore.getState().addBatchTask({
        name: 'A', prompts: ['p1'], model: 'nanobanana2' as any, params: {} as any,
      })
      useTaskQueueStore.getState().addBatchTask({
        name: 'B', prompts: ['p2'], model: 'nanobanana2' as any, params: {} as any,
      })
      useTaskQueueStore.getState().clearBatchQueue()
      expect(useTaskQueueStore.getState().batchQueue).toHaveLength(0)
      expect(useTaskQueueStore.getState().isBatchExecuting).toBe(false)
    })
  })

  // ==================== Batch Execution ====================

  describe('batch execution control', () => {
    let taskId: string

    beforeEach(() => {
      const task = useTaskQueueStore.getState().addBatchTask({
        name: 'Exec Test',
        prompts: ['p1', 'p2'],
        model: 'nanobanana2' as any,
        params: {} as any,
      })
      taskId = task.id
    })

    it('startBatchExecution should set running', () => {
      useTaskQueueStore.getState().startBatchExecution()
      expect(useTaskQueueStore.getState().isBatchExecuting).toBe(true)
      expect(useTaskQueueStore.getState().batchQueue[0].status).toBe('running')
    })

    it('pauseBatchExecution should pause running tasks', () => {
      useTaskQueueStore.getState().startBatchExecution()
      useTaskQueueStore.getState().pauseBatchExecution()
      expect(useTaskQueueStore.getState().isBatchExecuting).toBe(false)
      expect(useTaskQueueStore.getState().batchQueue[0].status).toBe('paused')
    })

    it('resumeBatchExecution should resume paused tasks', () => {
      useTaskQueueStore.getState().startBatchExecution()
      useTaskQueueStore.getState().pauseBatchExecution()
      useTaskQueueStore.getState().resumeBatchExecution()
      expect(useTaskQueueStore.getState().isBatchExecuting).toBe(true)
      expect(useTaskQueueStore.getState().batchQueue[0].status).toBe('running')
    })
  })

  // ==================== Batch Item Updates ====================

  describe('updateBatchItem', () => {
    it('should update specific item in batch', () => {
      const task = useTaskQueueStore.getState().addBatchTask({
        name: 'Update Test',
        prompts: ['p1'],
        model: 'nanobanana2' as any,
        params: {} as any,
      })
      const itemId = task.items[0].id
      useTaskQueueStore.getState().updateBatchItem(task.id, itemId, {
        status: 'completed',
        progress: 100,
        result: ['url1'],
      })
      const item = useTaskQueueStore.getState().batchQueue[0].items[0]
      expect(item.status).toBe('completed')
      expect(item.progress).toBe(100)
      expect(item.result).toEqual(['url1'])
    })
  })

  describe('updateBatchTask', () => {
    it('should update batch task properties', () => {
      const task = useTaskQueueStore.getState().addBatchTask({
        name: 'Task Update',
        prompts: ['p1'],
        model: 'nanobanana2' as any,
        params: {} as any,
      })
      useTaskQueueStore.getState().updateBatchTask(task.id, {
        currentIndex: 5,
        progress: 50,
      })
      const updated = useTaskQueueStore.getState().batchQueue[0]
      expect(updated.currentIndex).toBe(5)
      expect(updated.progress).toBe(50)
    })
  })
})
