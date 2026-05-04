/**
 * 图片生成器适配器接口
 * 定义统一的图片生成 API 规范
 */

import type { ImageModelId, ImageGenerationParams } from '@/types/image'

/**
 * 图片生成器适配器接口
 * 所有图片生成模型都实现此接口
 */
export interface ImageGeneratorAdapter {
  /** 模型 ID */
  readonly modelId: ImageModelId
  /** 显示名称 */
  readonly displayName: string
  /** 描述 */
  readonly description: string

  /**
   * 生成图片
   * @param params 生成参数
   * @param onProgress 进度回调 (0-100)
   * @returns 生成的图片 URL 数组
   */
  generateImage(
    params: ImageGenerationParams,
    onProgress: (progress: number) => void
  ): Promise<string[]>

  /**
   * 取消任务（可选实现）
   * @param taskId 任务 ID
   */
  cancelTask?(taskId: string): Promise<void>
}

/**
 * 适配器错误类
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly modelId: ImageModelId,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}
