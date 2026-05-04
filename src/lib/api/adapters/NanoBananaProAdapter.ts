/**
 * NanoBananaPro 适配器
 * 复用现有 nanobanana-pro.ts 逻辑
 */

import { client } from '../client'
import type { ImageGenerationParams } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'

const API_BASE = '/v2/image/nanobanana2'

interface TaskStatusResponse {
  task_id: string
  status: string
  images?: string[]
  error?: string
}

/**
 * NanoBananaPro 图片生成适配器
 */
export class NanoBananaProAdapter implements ImageGeneratorAdapter {
  readonly modelId = 'nano-banana-pro' as const
  readonly displayName = 'Nano Banana Pro'
  readonly description = '专业版'

  async generateImage(
    params: ImageGenerationParams,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    const { signal, ...submitOptions } = params

    // 1. 提交任务
    const requestBody = {
      prompt: submitOptions.prompt,
      size: submitOptions.size,
      aspect_ratio: submitOptions.aspectRatio,
      urls: submitOptions.urls || [],
    }

    const submitResponse = await client.post<{ task_id: string; status: string }>(
      `${API_BASE}/generate`,
      requestBody
    )

    const taskId = submitResponse.task_id
    onProgress(10)

    // 2. 轮询任务状态
    const maxAttempts = 60
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
        throw new Error(statusResponse.error || 'Image generation failed')
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
      attempts++
    }

    throw new Error('Image generation timeout')
  }

  async cancelTask(taskId: string): Promise<void> {
    await client.post(`${API_BASE}/task/${taskId}/cancel`, {})
  }
}

// 单例实例
let instance: NanoBananaProAdapter | null = null

export function getNanoBananaProAdapter(): NanoBananaProAdapter {
  if (!instance) {
    instance = new NanoBananaProAdapter()
  }
  return instance
}
