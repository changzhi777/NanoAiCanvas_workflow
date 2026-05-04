/**
 * NanoBanana Pro API - 高端图像生成
 * 架构: Frontend → NanoAI Backend → wuyinkeji.com
 */

import { client } from './client'

const API_BASE = '/v2/image/nanobanana2'

export interface ImageGenerationOptions {
  prompt: string
  size: '1K' | '2K' | '4K'
  aspectRatio: string
  urls?: string[]
  signal?: AbortSignal
}

export interface NanoBananaAPI {
  generateImageWithProgress(
    options: ImageGenerationOptions,
    onProgress: (progress: number) => void
  ): Promise<string[]>
}

export type ImageModelType = 'nano-banana-pro' | 'nano-banana2'

interface TaskStatusResponse {
  task_id: string
  status: string
  images?: string[]
  error?: string
}

class NanoBananaAPIImpl implements NanoBananaAPI {
  async generateImageWithProgress(
    options: ImageGenerationOptions,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    const { signal, ...submitOptions } = options

    // 1. 提交任务到后端
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
}

/**
 * Create NanoBanana API instance
 * @param _apiKey - API key (now managed by backend, parameter kept for compatibility)
 * @param _model - Model type (reserved for future use)
 */
export function createNanoBananaAPI(
  _apiKey: string,
  _model: ImageModelType = 'nano-banana-pro'
): NanoBananaAPI {
  return new NanoBananaAPIImpl()
}

/**
 * Create NanoBanana Pro API instance
 */
export function createNanoBananaProAPI(_apiKey: string): NanoBananaAPI {
  return new NanoBananaAPIImpl()
}