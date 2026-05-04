/**
 * GPT-Image-2 适配器
 * 复用现有 gpt-image-api.ts 逻辑
 */

import { client } from '../client'
import type { ImageGenerationParams } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'

const API_BASE = '/v2/image/gpt2'

interface TaskStatusResponse {
  task_id: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  message: string
  images?: string[]
  mode: string
  error?: string
  created_at: string
  completed_at?: string
}

/**
 * GPT-Image-2 图片生成适配器
 */
export class GPTImageAdapter implements ImageGeneratorAdapter {
  readonly modelId = 'gpt-image-2' as const
  readonly displayName = 'GPT Image 2'
  readonly description = 'OpenAI图像模型'

  async generateImage(
    params: ImageGenerationParams,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    const { signal, ...submitOptions } = params

    // 1. 提交任务
    const requestBody = {
      prompt: submitOptions.prompt,
      size: submitOptions.size || 'auto',
    }

    const submitResponse = await client.post<{ task_id: string; status: string }>(
      `${API_BASE}/generate`,
      requestBody
    )

    const taskId = submitResponse.task_id
    onProgress(10)

    // 2. 轮询任务状态
    const maxAttempts = 30
    let attempts = 0

    while (attempts < maxAttempts) {
      if (signal?.aborted) {
        throw new DOMException('Task aborted', 'AbortError')
      }

      const statusResponse = await client.get<TaskStatusResponse>(
        `${API_BASE}/task/${taskId}`
      )

      const progress = Math.min(90, 10 + Math.floor((attempts / maxAttempts) * 80))
      onProgress(progress)

      if (statusResponse.status === 'success' && statusResponse.images && statusResponse.images.length > 0) {
        onProgress(100)
        return statusResponse.images
      }

      if (statusResponse.status === 'failed') {
        throw new Error(statusResponse.error || '图片生成失败')
      }

      // pending 和 processing 继续等待
      if (statusResponse.status === 'pending' || statusResponse.status === 'processing') {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      attempts++
    }

    throw new Error('图片生成超时，请稍后重试')
  }

  async cancelTask(taskId: string): Promise<void> {
    await client.post(`${API_BASE}/task/${taskId}/cancel`, {})
  }
}

// 单例实例
let instance: GPTImageAdapter | null = null

export function getGPTImageAdapter(): GPTImageAdapter {
  if (!instance) {
    instance = new GPTImageAdapter()
  }
  return instance
}
