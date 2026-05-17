/**
 * NanoBanana2 API - 多图融合/图像生成
 * 架构: Frontend → NanoAI Backend (64.118.135.134:8002) → wuyinkeji.com
 */

import { client } from './client'

const API_BASE = '/v2/image/nanobanana2'

export interface NanoBanana2Options {
  prompt: string
  size?: '1K' | '2K' | '4K'
  aspectRatio?: string
  urls?: string[]
  signal?: AbortSignal
}

export interface NanoBanana2API {
  generateImageWithProgress(
    options: NanoBanana2Options,
    onProgress: (progress: number) => void
  ): Promise<string[]>
}

interface TaskStatusResponse {
  task_id: string
  status: string
  images?: string[]
  error?: string
}

class NanoBanana2APIImpl implements NanoBanana2API {
  async generateImageWithProgress(
    options: NanoBanana2Options,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    const { signal, ...submitOptions } = options

    // 1. 提交任务到后端
    const requestBody = {
      prompt: submitOptions.prompt,
      size: submitOptions.size || '1K',
      aspect_ratio: submitOptions.aspectRatio || 'auto',
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
      // Check for abort signal
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

      // pending, processing 继续等待
      await new Promise((resolve) => setTimeout(resolve, 2000))
      attempts++
    }

    throw new Error('Image generation timeout')
  }
}

export function createNanoBanana2API(_apiKey: string): NanoBanana2API {
  // API Key 现在由后端管理，前端不需要传递
  return new NanoBanana2APIImpl()
}