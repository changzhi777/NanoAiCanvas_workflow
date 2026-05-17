/**
 * TVC 视频生成 Store（nano2 独立面板用）
 *
 * 使用方法:
 *   import { useTvcStore } from '@/stores/tvcStore'
 *   const { inputText, executeAuto } = useTvcStore()
 */

import { create } from 'zustand'
import { tvcApi, type TvcScript, type ProductAnalysis, type TvcTaskProgress } from '@/lib/api/tvc-api'
import { tvcProjectsApi, type TvcProject, type TvcProjectListItem } from '@/lib/api/tvc-projects-api'
import { calcTvcParams } from '@/lib/tvc-cascade'

// ==================== 类型 ====================

export type TvcPhase = 'input' | 'executing' | 'result'

export interface TvcStoreState {
  // 输入
  inputText: string
  referenceImage: string | null
  referenceSource: 'upload' | 'asset' | null

  // 配置
  optimizeMode: string
  style: string
  totalDuration: number
  shotDuration: number
  shotCount: number
  videoModel: string
  imageModel: string
  quality: string
  cameraMovement: string
  lightStyle: string
  negativePrompts: string[]

  // 级联计算结果
  calcResult: ReturnType<typeof calcTvcParams> | null

  // 执行
  phase: TvcPhase
  isExecuting: boolean
  progress: TvcTaskProgress | null
  sseRef: EventSource | null

  // 结果
  script: TvcScript | null
  analysis: ProductAnalysis | null
  taskId: string | null
  projectId: string | null
  project: TvcProject | null

  // 项目列表
  projects: TvcProjectListItem[]
  isLoadingProjects: boolean

  // 错误
  error: string | null
}

export interface TvcStoreActions {
  // 输入
  setInputText: (text: string) => void
  setReferenceImage: (image: string | null, source: 'upload' | 'asset' | null) => void

  // 配置
  setOptimizeMode: (mode: string) => void
  setStyle: (style: string) => void
  setTotalDuration: (duration: number) => void
  setVideoModel: (model: string) => void
  setImageModel: (model: string) => void
  setQuality: (quality: string) => void
  setCameraMovement: (movement: string) => void
  setLightStyle: (light: string) => void
  setNegativePrompts: (prompts: string[]) => void
  recalcParams: () => void

  // 执行
  executeAuto: () => Promise<void>
  cancelExecution: () => void

  // 参考图分析
  analyzeReferenceImage: (imageUrl: string) => Promise<void>

  // 项目
  loadProjects: () => Promise<void>
  selectProject: (projectId: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>

  // 通用
  reset: () => void
  setError: (error: string | null) => void
}

const initialState: TvcStoreState = {
  inputText: '',
  referenceImage: null,
  referenceSource: null,
  optimizeMode: 'tvc_deep',
  style: 'cinematic',
  totalDuration: 30,
  shotDuration: 5,
  shotCount: 6,
  videoModel: 'auto',
  imageModel: 'auto',
  quality: 'standard',
  cameraMovement: 'push-in',
  lightStyle: 'golden_hour',
  negativePrompts: ['avoid_jitter', 'avoid_bent_limbs'],
  calcResult: null,
  phase: 'input',
  isExecuting: false,
  progress: null,
  sseRef: null,
  script: null,
  analysis: null,
  taskId: null,
  projectId: null,
  project: null,
  projects: [],
  isLoadingProjects: false,
  error: null,
}

export const useTvcStore = create<TvcStoreState & TvcStoreActions>()((set, get) => ({
  ...initialState,

  // ---- 输入 ----
  setInputText: (text) => set({ inputText: text }),
  setReferenceImage: (image, source) => set({
    referenceImage: image,
    referenceSource: source,
    optimizeMode: image ? 'tvc_vision' : get().optimizeMode,
  }),

  // ---- 配置 ----
  setOptimizeMode: (mode) => set({ optimizeMode: mode }),
  setStyle: (style) => set({ style }),
  setTotalDuration: (duration) => {
    set({ totalDuration: duration })
    get().recalcParams()
  },
  setVideoModel: (model) => {
    set({ videoModel: model })
    get().recalcParams()
  },
  setImageModel: (model) => set({ imageModel: model }),
  setQuality: (quality) => set({ quality }),
  setCameraMovement: (movement) => set({ cameraMovement: movement }),
  setLightStyle: (light) => set({ lightStyle: light }),
  setNegativePrompts: (prompts) => set({ negativePrompts: prompts }),
  recalcParams: () => {
    const { totalDuration, videoModel } = get()
    const model = videoModel === 'auto' ? 'jimeng-video-01' : videoModel
    const result = calcTvcParams(totalDuration, model)
    set({ calcResult: result, shotCount: result.shotCount, shotDuration: result.shotDuration })
  },

  // ---- 执行 ----
  executeAuto: async () => {
    const { inputText, optimizeMode, style, totalDuration, shotCount, shotDuration, videoModel, imageModel, quality, referenceImage, cameraMovement, lightStyle, negativePrompts } = get()
    if (!inputText.trim()) {
      set({ error: '请输入 TVC 描述' })
      return
    }

    set({ phase: 'executing', isExecuting: true, error: null })

    try {
      // 积分预检
      try {
        const estimate = await tvcApi.estimatePoints({ shotCount, includeBgm: true })
        if (!estimate.sufficient) {
          set({ error: `积分不足：需要 ${estimate.total}，当前余额 ${estimate.balance}`, phase: 'input', isExecuting: false })
          return
        }
      } catch {
        // 积分服务不可用时放行
      }

      const response = await tvcApi.submitTask({
        workflowId: `nano2-tvc-${Date.now()}`,
        prompt: inputText,
        shotCount,
        shotDuration,
        totalDuration,
        style,
        optimizeMode,
        imageModel: imageModel === 'auto' ? undefined : imageModel,
        videoModel: videoModel === 'auto' ? undefined : videoModel,
        quality,
        referenceImage: referenceImage || undefined,
        cameraMovement,
        lightStyle,
        negativePrompts,
      })

      const taskId = response.task_id
      set({ taskId })

      // 创建/关联 TVC 项目
      try {
        const created = await tvcProjectsApi.create({
          name: `TVC ${new Date().toLocaleDateString('zh-CN')}`,
          original_text: inputText,
        })
        await tvcProjectsApi.update(created.id, { task_id: taskId, status: 'processing' })
        set({ projectId: created.id })
      } catch {
        // 项目创建失败不影响主流程
      }

      // SSE 实时进度
      const es = tvcApi.streamProgress(
        taskId,
        (progress) => {
          set({ progress })
          if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
            set({ isExecuting: false })
            if (progress.status === 'completed') {
              set({ phase: 'result' })
              if (get().projectId) {
                get().selectProject(get().projectId!)
              }
            }
            if (progress.status === 'failed') {
              set({ error: '任务执行失败', phase: 'result' })
            }
          }
        },
        (err) => {
          set({ error: err.message, isExecuting: false, phase: 'result' })
        },
      )
      set({ sseRef: es })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: `任务提交失败: ${message}`, phase: 'input', isExecuting: false })
    }
  },

  cancelExecution: () => {
    const { sseRef, taskId } = get()
    sseRef?.close()
    if (taskId) {
      tvcApi.cancelTask(taskId).catch(() => {})
    }
    set({ isExecuting: false, phase: 'input', sseRef: null })
  },

  // ---- 参考图分析 ----
  analyzeReferenceImage: async (imageUrl: string) => {
    try {
      const { analysis } = await tvcApi.analyzeProductReference({ imageUrl })
      set({ analysis, optimizeMode: 'tvc_vision' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: `参考图分析失败: ${message}` })
    }
  },

  // ---- 项目管理 ----
  loadProjects: async () => {
    set({ isLoadingProjects: true })
    try {
      const data = await tvcProjectsApi.list({ limit: 50 })
      set({ projects: data.items })
    } catch {
      // 未登录或网络错误
    } finally {
      set({ isLoadingProjects: false })
    }
  },

  selectProject: async (projectId: string) => {
    try {
      const project = await tvcProjectsApi.get(projectId)
      set({ project, projectId, phase: 'result' })
    } catch {
      set({ error: '加载项目失败' })
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      await tvcProjectsApi.delete(projectId)
      set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }))
    } catch {
      set({ error: '删除项目失败' })
    }
  },

  // ---- 通用 ----
  reset: () => {
    get().sseRef?.close()
    set(initialState)
  },
  setError: (error) => set({ error }),
}))
