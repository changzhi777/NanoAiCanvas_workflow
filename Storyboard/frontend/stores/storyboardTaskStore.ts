/**
 * 故事板任务队列状态管理
 * 支持后台生成、任务追踪、结果保存
 * 使用 Redis 存储（通过 API）
 */

import { create } from 'zustand'
import type { StoryboardTask, StoryboardAsset, StoryboardTaskStatus, StoryboardSubTask } from '@/types'
import { getTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from '@/lib/api/tasks'
import { createAssetApi, deleteAssetApi, getAssetsApi } from '@/lib/api/assets'
import { generateAll } from '@/lib/api/storyboard'
import { v4 as uuidv4 } from 'uuid'

// 默认用户 ID（单用户模式）
const DEFAULT_USER_ID = 'changzhi'

// 子任务定义
const createSubTasks = (): StoryboardSubTask[] => [
  { id: 'script', type: 'script', label: '生成剧本', status: 'pending', progress: 0 },
  { id: 'storyboard', type: 'storyboard', label: '生成故事板', status: 'pending', progress: 0 },
  { id: 'character', type: 'character', label: '生成角色设计', status: 'pending', progress: 0 },
]

interface StoryboardTaskState {
  // 任务列表
  tasks: StoryboardTask[]
  completedAssets: StoryboardAsset[]

  // 当前运行的任务
  runningTaskId: string | null
  abortControllers: Map<string, AbortController>

  // 子任务状态
  subTasks: Map<string, StoryboardSubTask[]>

  // 完成提示
  showCompletionToast: boolean

  // Actions
  loadTasks: () => Promise<void>
  startTask: (userId: string, textApiKey: string, imageApiKey: string, inputText: string, style: string) => Promise<string>
  cancelTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  loadAssets: () => Promise<void>
  deleteAsset: (assetId: string) => Promise<void>
  dismissCompletionToast: () => void

  // 内部方法
  _updateTaskStatus: (taskId: string, status: StoryboardTaskStatus, progress: number, error?: string) => Promise<void>
  _updateSubTask: (taskId: string, subTaskId: string, status: StoryboardSubTask['status'], progress: number, error?: string) => void
  _completeTask: (taskId: string, script: any, storyboardImages: string[], characterDesigns: any[]) => Promise<void>
  _runGeneration: (taskId: string, textApiKey: string, imageApiKey: string, inputText: string, style: string, signal: AbortSignal) => Promise<void>
}

export const useStoryboardTaskStore = create<StoryboardTaskState>((set, get) => ({
  tasks: [],
  completedAssets: [],
  runningTaskId: null,
  abortControllers: new Map(),
  subTasks: new Map(),
  showCompletionToast: false,

  // 从 Redis API 加载任务列表
  loadTasks: async () => {
    try {
      const result = await getTasksApi()
      if (result.success && result.tasks) {
        set({ tasks: result.tasks })
      }
    } catch (error) {
      console.error('[StoryboardTaskStore] Load tasks error:', error)
    }
  },

  // 从 Redis API 加载资产列表
  loadAssets: async () => {
    try {
      const result = await getAssetsApi()
      if (result.success && result.assets) {
        set({ completedAssets: result.assets })
      }
    } catch (error) {
      console.error('[StoryboardTaskStore] Load assets error:', error)
    }
  },

  // 启动新任务
  startTask: async (userId: string, textApiKey: string, imageApiKey: string, inputText: string, style: string) => {
    const taskId = uuidv4()
    const now = new Date().toISOString()

    // 创建任务对象
    const task: StoryboardTask = {
      id: taskId,
      userId: userId || DEFAULT_USER_ID,
      title: inputText.slice(0, 50) + (inputText.length > 50 ? '...' : ''),
      inputText,
      style,
      status: 'pending',
      progress: 0,
      storyboardImages: [],
      characterDesigns: [],
      createdAt: now,
      updatedAt: now,
    }

    // 保存到 Redis（通过 API）
    const result = await createTaskApi(task)
    if (!result.success) {
      console.error('[StoryboardTaskStore] Failed to create task:', result.error)
      throw new Error('创建任务失败')
    }

    // 初始化子任务
    const subTasks = createSubTasks()

    // 更新本地状态
    set((state) => ({
      tasks: [task, ...state.tasks],
      runningTaskId: taskId,
      subTasks: new Map(state.subTasks).set(taskId, subTasks),
    }))

    // 创建 AbortController
    const abortController = new AbortController()
    set((state) => {
      const newMap = new Map(state.abortControllers)
      newMap.set(taskId, abortController)
      return { abortControllers: newMap }
    })

    // 异步执行生成任务
    get()._runGeneration(taskId, textApiKey, imageApiKey, inputText, style, abortController.signal)

    return taskId
  },

  // 更新子任务状态（仅本地状态）
  _updateSubTask: (taskId: string, subTaskId: string, status: StoryboardSubTask['status'], progress: number, error?: string) => {
    set((state) => {
      const newMap = new Map(state.subTasks)
      const tasks = newMap.get(taskId) || createSubTasks()
      const updatedTasks = tasks.map(t =>
        t.id === subTaskId ? { ...t, status, progress, error } : t
      )
      newMap.set(taskId, updatedTasks)
      return { subTasks: newMap }
    })
  },

  dismissCompletionToast: () => {
    set({ showCompletionToast: false })
  },

  // 执行生成任务
  _runGeneration: async (
    taskId: string,
    textApiKey: string,
    imageApiKey: string,
    inputText: string,
    style: string,
    signal: AbortSignal
  ) => {
    const { _updateTaskStatus, _completeTask, _updateSubTask } = get()

    try {
      // 检查是否已取消
      if (signal.aborted) throw new Error('任务已取消')

      // 更新状态：生成脚本
      await _updateTaskStatus(taskId, 'generating_script', 10)
      _updateSubTask(taskId, 'script', 'running', 0)

      // 调用生成API
      const result = await generateAll(
        textApiKey,
        imageApiKey,
        inputText,
        style as any,
        (task) => {
          const status: StoryboardTaskStatus = task === 'script' ? 'generating_script' :
            task === 'storyboard' ? 'generating_storyboard' : 'generating_characters'

          // 标记前一个任务完成
          if (task === 'storyboard') {
            _updateSubTask(taskId, 'script', 'success', 100)
            _updateSubTask(taskId, 'storyboard', 'running', 0)
          } else if (task === 'character') {
            _updateSubTask(taskId, 'script', 'success', 100)
            _updateSubTask(taskId, 'storyboard', 'success', 100)
            _updateSubTask(taskId, 'character', 'running', 0)
          }

          // 根据任务类型更新进度
          const progressMap: Record<string, number> = {
            'script': 20,
            'storyboard': 50,
            'character': 80,
          }
          _updateTaskStatus(taskId, status, progressMap[task || 'script'] || 10)
        },
        (p) => {
          // 细粒度进度更新
          const task = get().tasks.find(t => t.id === taskId)
          if (task) {
            // 更新当前子任务进度
            const currentSubTask = task.status === 'generating_script' ? 'script' :
              task.status === 'generating_storyboard' ? 'storyboard' : 'character'

            _updateSubTask(taskId, currentSubTask, 'running', Math.min(p * 100, 95))

            const baseProgress = task.status === 'generating_script' ? 10 :
              task.status === 'generating_storyboard' ? 40 : 70
            const newProgress = Math.min(baseProgress + p * 0.3, 95)
            get()._updateTaskStatus(taskId, task.status, newProgress)
          }
        }
      )

      // 检查是否已取消
      if (signal.aborted) throw new Error('任务已取消')

      // 标记所有子任务完成
      _updateSubTask(taskId, 'script', 'success', 100)
      _updateSubTask(taskId, 'storyboard', 'success', 100)
      _updateSubTask(taskId, 'character', 'success', 100)

      // 完成任务
      await _completeTask(taskId, result.script, result.storyboardImages, result.characterDesigns)

      // 显示完成提示
      set({ showCompletionToast: true })

    } catch (error: any) {
      if (signal.aborted || error.message === '任务已取消') {
        await _updateTaskStatus(taskId, 'error', 0, '任务已取消')
        _updateSubTask(taskId, 'script', 'error', 0, '已取消')
        _updateSubTask(taskId, 'storyboard', 'error', 0, '已取消')
        _updateSubTask(taskId, 'character', 'error', 0, '已取消')
      } else {
        console.error('[StoryboardTaskStore] Generation error:', error)
        await _updateTaskStatus(taskId, 'error', 0, error.message || '生成失败')
        // 标记当前运行的子任务为错误
        const task = get().tasks.find(t => t.id === taskId)
        if (task) {
          const currentSubTask = task.status === 'generating_script' ? 'script' :
            task.status === 'generating_storyboard' ? 'storyboard' : 'character'
          _updateSubTask(taskId, currentSubTask, 'error', 0, error.message)
        }
      }
    } finally {
      // 清理 AbortController
      set((state) => {
        const newMap = new Map(state.abortControllers)
        newMap.delete(taskId)
        return { abortControllers: newMap, runningTaskId: null }
      })
    }
  },

  // 更新任务状态（同步到 Redis）
  _updateTaskStatus: async (taskId: string, status: StoryboardTaskStatus, progress: number, error?: string) => {
    // 更新 Redis
    const result = await updateTaskApi(taskId, { status, progress, error })

    // 更新本地状态
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status,
            progress,
            error,
            updatedAt: new Date().toISOString(),
          }
        }
        return t
      }),
    }))
  },

  // 完成任务（保存资产到 Redis）
  _completeTask: async (taskId: string, script: any, storyboardImages: string[], characterDesigns: any[]) => {
    const now = new Date().toISOString()

    // 更新任务状态
    const taskUpdates = {
      status: 'success' as const,
      progress: 100,
      script,
      storyboardImages,
      characterDesigns,
      completedAt: now,
      updatedAt: now,
    }

    await updateTaskApi(taskId, taskUpdates)

    // 保存到资产库（通过 API）
    const assetData: Partial<StoryboardAsset> = {
      taskId,
      isShared: false,
      title: script?.title || '未命名故事板',
      synopsis: script?.synopsis || '',
      script,
      storyboardImages,
      characterDesigns,
    }

    const result = await createAssetApi(assetData)

    // 更新本地状态
    set((state) => {
      const newTasks = state.tasks.map(t =>
        t.id === taskId ? { ...t, ...taskUpdates } : t
      )

      if (result.success && result.asset) {
        return {
          tasks: newTasks,
          completedAssets: [result.asset, ...state.completedAssets],
        }
      }

      return { tasks: newTasks }
    })
  },

  // 取消任务
  cancelTask: async (taskId: string) => {
    const { abortControllers } = get()
    const controller = abortControllers.get(taskId)
    if (controller) {
      controller.abort()
    }
    await get()._updateTaskStatus(taskId, 'error', 0, '用户取消')
  },

  // 删除任务
  deleteTask: async (taskId: string) => {
    const result = await deleteTaskApi(taskId)
    if (result.success) {
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      }))
    }
  },

  // 删除资产
  deleteAsset: async (assetId: string) => {
    const result = await deleteAssetApi(assetId)
    if (result.success) {
      set((state) => ({
        completedAssets: state.completedAssets.filter(a => a.id !== assetId)
      }))
    }
  },
}))
