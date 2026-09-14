import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStoryboardTaskStore } from '@/stores/nanoImageStoryboardTaskStore'

// Mock API dependencies using hoisted vi.mock
vi.mock('@/lib/api/tasks', () => ({
  getTasksApi: vi.fn(),
  createTaskApi: vi.fn(),
  updateTaskApi: vi.fn(),
  deleteTaskApi: vi.fn(),
}))

vi.mock('@/lib/api/assets', () => ({
  createAssetApi: vi.fn(),
  deleteAssetApi: vi.fn(),
  getAssetsApi: vi.fn(),
}))

vi.mock('@/lib/api/storyboard', () => ({
  generateAll: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}))

// Import mocked modules after vi.mock
import { getTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from '@/lib/api/tasks'
import { createAssetApi, deleteAssetApi, getAssetsApi } from '@/lib/api/assets'
import { generateAll } from '@/lib/api/storyboard'

const mockedGetTasksApi = vi.mocked(getTasksApi)
const mockedCreateTaskApi = vi.mocked(createTaskApi)
const mockedUpdateTaskApi = vi.mocked(updateTaskApi)
const mockedDeleteTaskApi = vi.mocked(deleteTaskApi)
const mockedGetAssetsApi = vi.mocked(getAssetsApi)
const mockedDeleteAssetApi = vi.mocked(deleteAssetApi)
const mockedCreateAssetApi = vi.mocked(createAssetApi)
const mockedGenerateAll = vi.mocked(generateAll)

describe('StoryboardTaskStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStoryboardTaskStore.setState({
      tasks: [],
      completedAssets: [],
      runningTaskId: null,
      abortControllers: new Map(),
      subTasks: new Map(),
      showCompletionToast: false,
    })
  })

  it('should have correct initial state', () => {
    const state = useStoryboardTaskStore.getState()
    expect(state.tasks).toEqual([])
    expect(state.completedAssets).toEqual([])
    expect(state.runningTaskId).toBeNull()
    expect(state.showCompletionToast).toBe(false)
  })

  describe('loadTasks', () => {
    it('should load tasks from API', async () => {
      const mockTasks = [{ id: 't1', title: 'Task 1', status: 'success' }]
      mockedGetTasksApi.mockResolvedValue({ success: true, tasks: mockTasks })

      await useStoryboardTaskStore.getState().loadTasks()

      expect(useStoryboardTaskStore.getState().tasks).toEqual(mockTasks)
    })

    it('should handle API failure gracefully', async () => {
      mockedGetTasksApi.mockRejectedValue(new Error('Network error'))

      await expect(useStoryboardTaskStore.getState().loadTasks()).resolves.toBeUndefined()
      expect(useStoryboardTaskStore.getState().tasks).toEqual([])
    })

    it('should not update state when result is not successful', async () => {
      mockedGetTasksApi.mockResolvedValue({ success: false })

      await useStoryboardTaskStore.getState().loadTasks()
      expect(useStoryboardTaskStore.getState().tasks).toEqual([])
    })
  })

  describe('loadAssets', () => {
    it('should load assets from API', async () => {
      const mockAssets = [{ id: 'a1', title: 'Asset 1' }]
      mockedGetAssetsApi.mockResolvedValue({ success: true, assets: mockAssets })

      await useStoryboardTaskStore.getState().loadAssets()

      expect(useStoryboardTaskStore.getState().completedAssets).toEqual(mockAssets)
    })

    it('should handle API failure gracefully', async () => {
      mockedGetAssetsApi.mockRejectedValue(new Error('Network error'))

      await expect(useStoryboardTaskStore.getState().loadAssets()).resolves.toBeUndefined()
    })
  })

  describe('startTask', () => {
    it('should create task and start generation', async () => {
      mockedCreateTaskApi.mockResolvedValue({ success: true })
      mockedGenerateAll.mockResolvedValue({
        script: { title: 'Test' },
        storyboardImages: ['img1.png'],
        characterDesigns: [{ id: 'c1' }],
      })

      const taskId = await useStoryboardTaskStore.getState().startTask(
        'user1', 'textKey', 'imageKey', 'A story about cats', 'comic'
      )

      expect(taskId).toBe('test-uuid-1234')
      expect(mockedCreateTaskApi).toHaveBeenCalled()
      expect(useStoryboardTaskStore.getState().tasks).toHaveLength(1)
    })

    it('should throw when createTaskApi fails', async () => {
      mockedCreateTaskApi.mockResolvedValue({ success: false, error: 'DB error' })

      await expect(
        useStoryboardTaskStore.getState().startTask('user1', 'k1', 'k2', 'text', 'comic')
      ).rejects.toThrow('创建任务失败')
    })
  })

  describe('_updateSubTask', () => {
    it('should update sub-task status', () => {
      useStoryboardTaskStore.setState({
        subTasks: new Map([['t1', [
          { id: 'script', type: 'script', label: '生成剧本', status: 'pending', progress: 0 },
          { id: 'storyboard', type: 'storyboard', label: '生成故事板', status: 'pending', progress: 0 },
        ]]]),
      })

      useStoryboardTaskStore.getState()._updateSubTask('t1', 'script', 'running', 50)

      const subTasks = useStoryboardTaskStore.getState().subTasks.get('t1')!
      expect(subTasks[0].status).toBe('running')
      expect(subTasks[0].progress).toBe(50)
    })

    it('should create default sub-tasks if not exist', () => {
      useStoryboardTaskStore.getState()._updateSubTask('new-task', 'script', 'running', 10)

      const subTasks = useStoryboardTaskStore.getState().subTasks.get('new-task')!
      expect(subTasks).toHaveLength(3)
      expect(subTasks[0].status).toBe('running')
    })

    it('should set error on sub-task', () => {
      useStoryboardTaskStore.setState({
        subTasks: new Map([['t1', [
          { id: 'script', type: 'script', label: '生成剧本', status: 'running', progress: 50 },
        ]]]),
      })

      useStoryboardTaskStore.getState()._updateSubTask('t1', 'script', 'error', 0, 'Timeout')

      const subTasks = useStoryboardTaskStore.getState().subTasks.get('t1')!
      expect(subTasks[0].status).toBe('error')
      expect(subTasks[0].error).toBe('Timeout')
    })
  })

  describe('dismissCompletionToast', () => {
    it('should dismiss the toast', () => {
      useStoryboardTaskStore.setState({ showCompletionToast: true })
      useStoryboardTaskStore.getState().dismissCompletionToast()
      expect(useStoryboardTaskStore.getState().showCompletionToast).toBe(false)
    })
  })

  describe('cancelTask', () => {
    it('should abort the controller and update status', async () => {
      const mockAbort = vi.fn()
      useStoryboardTaskStore.setState({
        abortControllers: new Map([['t1', { abort: mockAbort } as any]]),
      })
      mockedUpdateTaskApi.mockResolvedValue({})

      await useStoryboardTaskStore.getState().cancelTask('t1')

      expect(mockAbort).toHaveBeenCalled()
      expect(mockedUpdateTaskApi).toHaveBeenCalled()
    })
  })

  describe('deleteTask', () => {
    it('should remove task from list on success', async () => {
      useStoryboardTaskStore.setState({
        tasks: [{ id: 't1', title: 'Task 1' }, { id: 't2', title: 'Task 2' }] as any,
      })
      mockedDeleteTaskApi.mockResolvedValue({ success: true })

      await useStoryboardTaskStore.getState().deleteTask('t1')

      expect(useStoryboardTaskStore.getState().tasks).toHaveLength(1)
      expect(useStoryboardTaskStore.getState().tasks[0].id).toBe('t2')
    })

    it('should not remove task when API returns failure', async () => {
      useStoryboardTaskStore.setState({
        tasks: [{ id: 't1', title: 'Task 1' }] as any,
      })
      mockedDeleteTaskApi.mockResolvedValue({ success: false })

      await useStoryboardTaskStore.getState().deleteTask('t1')

      expect(useStoryboardTaskStore.getState().tasks).toHaveLength(1)
    })
  })

  describe('deleteAsset', () => {
    it('should remove asset from list on success', async () => {
      useStoryboardTaskStore.setState({
        completedAssets: [{ id: 'a1' }, { id: 'a2' }] as any,
      })
      mockedDeleteAssetApi.mockResolvedValue({ success: true })

      await useStoryboardTaskStore.getState().deleteAsset('a1')

      expect(useStoryboardTaskStore.getState().completedAssets).toHaveLength(1)
    })
  })

  describe('_updateTaskStatus', () => {
    it('should update task in local state', async () => {
      useStoryboardTaskStore.setState({
        tasks: [{ id: 't1', status: 'pending', progress: 0 }] as any,
      })
      mockedUpdateTaskApi.mockResolvedValue({})

      await useStoryboardTaskStore.getState()._updateTaskStatus('t1', 'running', 50)

      const task = useStoryboardTaskStore.getState().tasks.find(t => t.id === 't1')
      expect(task?.status).toBe('running')
      expect(task?.progress).toBe(50)
    })
  })
})
