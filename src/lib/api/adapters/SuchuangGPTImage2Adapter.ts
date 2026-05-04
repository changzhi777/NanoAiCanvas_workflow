/**
 * Suchuang GPT-Image-2 适配器
 * 使用速创API渠道调用GPT-Image-2模型
 */

import type { ImageGenerationParams } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'
import { generateGPTImage2WithPolling } from '../suchuang-api'

/**
 * Suchuang GPT-Image-2 图片生成适配器
 */
export class SuchuangGPTImage2Adapter implements ImageGeneratorAdapter {
  readonly modelId = 'gpt-image-2' as const
  readonly displayName = 'GPT Image 2 (速创)'
  readonly description = 'OpenAI图像模型 via 速创渠道'

  async generateImage(
    params: ImageGenerationParams,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    const { signal, ...submitOptions } = params

    // 使用速创API生成图片
    // 注意：API的size参数就是aspectRatio值，如"auto"、"1:1"等
    const images = await generateGPTImage2WithPolling(
      {
        prompt: submitOptions.prompt,
        size: submitOptions.size || '1K',
        aspectRatio: (submitOptions.aspectRatio || 'auto') as 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9',
        urls: submitOptions.urls,
      },
      (status, progress) => {
        // 转换进度回调
        if (progress < 30) {
          onProgress(progress * 0.3) // 0-10%
        } else if (progress < 100) {
          onProgress(10 + (progress - 30) * 0.9) // 10-100%
        } else {
          onProgress(100)
        }
      }
    )

    return images
  }

  async cancelTask(taskId: string): Promise<void> {
    // 速创API暂时不支持取消任务
    console.warn('Suchuang API 不支持取消任务')
  }
}

// 单例实例
let instance: SuchuangGPTImage2Adapter | null = null

export function getSuchuangGPTImage2Adapter(): SuchuangGPTImage2Adapter {
  if (!instance) {
    instance = new SuchuangGPTImage2Adapter()
  }
  return instance
}
