/**
 * Skills Queue 适配器
 * 统一 GPT-Image-2 调用路径：前端 → POST /api/v2/skills/generate → Redis 队列 → Worker 执行
 *
 * 支持 WebSocket 实时接收步骤进度，降级为轮询
 */

import type { ImageGenerationParams } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'
import { subscribeTaskStatus, type TaskStatusMessage } from '../websocket-client'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// 步骤定义
export interface TaskStepInfo {
  step: string
  progress: number
  message: string
}

export const TASK_STEPS: Record<string, { label: string; defaultProgress: number }> = {
  validating: { label: '参数校验', defaultProgress: 5 },
  prompt_building: { label: '构建提示词', defaultProgress: 15 },
  api_submitting: { label: '提交生成请求', defaultProgress: 30 },
  generating: { label: 'AI 生成中', defaultProgress: 50 },
  completed: { label: '生成完成', defaultProgress: 100 },
  failed: { label: '生成失败', defaultProgress: 0 },
  cancelled: { label: '任务已取消', defaultProgress: 0 },
}

export type StepCallback = (stepInfo: TaskStepInfo) => void

// API 响应类型
interface GenerateApiResponse {
  task_id: string
  status: string
  message: string
}

interface TaskStatusApiResponse {
  task_id: string
  status: string
  progress: number
  result?: { images?: Array<{ url: string }> }
  error?: string
}

/**
 * Skills Queue 图片生成适配器
 *
 * 注意：stepCallback 通过 generateImage 第三个参数传入，
 * 避免单例模式下并发调用的回调覆盖问题。
 */
export class SkillQueueAdapter implements ImageGeneratorAdapter {
  readonly modelId = 'gpt-image-2' as const
  readonly displayName = 'GPT Image 2 (Skills Queue)'
  readonly description = 'Skills 后台队列生成'

  /**
   * 兼容旧接口：onStep 设置全局回调。
   * 推荐使用 generateImage 的第三个参数 onStep 传递回调。
   */
  private _globalStepCallback: StepCallback | null = null

  /** 设置步骤回调（全局，会被 per-call 回调覆盖） */
  onStep(cb: StepCallback) {
    this._globalStepCallback = cb
  }

  async generateImage(
    params: ImageGenerationParams,
    onProgress: (progress: number) => void,
    onStep?: StepCallback,
  ): Promise<string[]> {
    const { prompt, size, signal } = params
    const stepCb = onStep || this._globalStepCallback

    const emitStep = (step: string, progress: number, message: string) => {
      stepCb?.({ step, progress, message })
    }

    // 1. 提交任务到后端队列
    emitStep('validating', 5, '参数校验中...')
    onProgress(5)

    const response = await fetch(`${API_BASE}/v2/skills/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: '__direct__',
        form_data: { prompt },
        skill_id: 'gpt_image_2',
        size: size || '1024x1024',
        quality: 'standard',
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    const result: GenerateApiResponse = await response.json()
    const taskId = result.task_id

    if (!taskId) {
      throw new Error('未获取到任务 ID')
    }

    emitStep('api_submitting', 30, '任务已提交队列')
    onProgress(30)

    // 2. WebSocket 监听 + 轮询降级
    return new Promise<string[]>((resolve, reject) => {
      let resolved = false
      let pollingTimer: ReturnType<typeof setInterval> | null = null
      let unsubscribe: (() => void) | null = null

      const cleanup = () => {
        resolved = true
        if (unsubscribe) {
          unsubscribe()
          unsubscribe = null
        }
        if (pollingTimer) {
          clearInterval(pollingTimer)
          pollingTimer = null
        }
      }

      // Abort 支持
      if (signal) {
        signal.addEventListener('abort', () => {
          cleanup()
          reject(new DOMException('Task aborted', 'AbortError'))
        }, { once: true })
      }

      // WebSocket 实时接收步骤
      try {
        unsubscribe = subscribeTaskStatus(taskId, (message: TaskStatusMessage) => {
          if (resolved) return

          const step = message.status || ''
          const progress = message.progress || 0

          const stepInfo = TASK_STEPS[step]
          if (stepInfo) {
            emitStep(step, progress, stepInfo.label)
            onProgress(progress)
          } else if (step === 'processing' || step === 'queued' || step === 'pending') {
            emitStep('generating', Math.max(progress, 35), 'AI 生成中...')
            onProgress(Math.max(progress, 35))
          }

          if (step === 'completed' && message.images) {
            cleanup()
            const urls = message.images.map(img => img.url)
            resolve(urls)
          }

          if (step === 'failed') {
            cleanup()
            reject(new Error(message.error || '图片生成失败'))
          }
        })
      } catch (wsError) {
        console.warn('[SkillQueueAdapter] WebSocket 连接失败，降级为轮询')
      }

      // 轮询降级（6 秒后开始）
      let pollAttempts = 0
      const maxPolls = 120 // 120 * 2s = 240s
      pollingTimer = setInterval(async () => {
        if (resolved) {
          clearInterval(pollingTimer!)
          return
        }

        pollAttempts++
        if (pollAttempts < 3) return // 前 3 次跳过，给 WebSocket 机会

        try {
          const statusResp = await fetch(`${API_BASE}/v2/skills/tasks/${taskId}`)
          if (!statusResp.ok) return

          const status: TaskStatusApiResponse = await statusResp.json()

          const stepInfo = TASK_STEPS[status.status]
          if (stepInfo) {
            emitStep(status.status, status.progress, stepInfo.label)
          }
          onProgress(status.progress)

          if (status.status === 'completed' && status.result?.images) {
            cleanup()
            const urls = status.result.images.map(img => img.url)
            resolve(urls)
          }

          if (status.status === 'failed') {
            cleanup()
            reject(new Error(status.error || '图片生成失败'))
          }

          if (pollAttempts > maxPolls) {
            cleanup()
            reject(new Error('图片生成超时'))
          }
        } catch (e) {
          console.error('[SkillQueueAdapter] 轮询错误:', e)
        }
      }, 2000)
    })
  }

  async cancelTask(taskId: string): Promise<void> {
    await fetch(`${API_BASE}/v2/skills/tasks/${taskId}/cancel`, { method: 'POST' })
  }
}

// 单例
let instance: SkillQueueAdapter | null = null

export function getSkillQueueAdapter(): SkillQueueAdapter {
  if (!instance) {
    instance = new SkillQueueAdapter()
  }
  return instance
}
