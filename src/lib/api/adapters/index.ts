/**
 * 图片生成适配器统一导出
 * 提供统一的适配器获取接口
 */

import type { ImageModelId } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'

import { NanoBanana2Adapter, getNanoBanana2Adapter } from './NanoBanana2Adapter'
import { NanoBananaProAdapter, getNanoBananaProAdapter } from './NanoBananaProAdapter'
import { GPTImageAdapter, getGPTImageAdapter } from './GPTImageAdapter'
import { SuchuangGPTImage2Adapter, getSuchuangGPTImage2Adapter } from './SuchuangGPTImage2Adapter'

/**
 * 适配器映射表
 */
const ADAPTERS: Record<ImageModelId, () => ImageGeneratorAdapter> = {
  'nano-banana2': getNanoBanana2Adapter,
  'nano-banana-pro': getNanoBananaProAdapter,
  'gpt-image-2': getSuchuangGPTImage2Adapter,
}

/**
 * 获取指定模型的适配器
 * @param modelId 模型 ID
 * @returns 对应的适配器实例
 */
export function getAdapter(modelId: ImageModelId): ImageGeneratorAdapter {
  const factory = ADAPTERS[modelId]
  if (!factory) {
    throw new Error(`Unknown image model: ${modelId}`)
  }
  return factory()
}

/**
 * 获取所有可用模型的信息
 */
export function getAllModelInfo(): Array<{ id: ImageModelId; name: string; description: string }> {
  return [
    { id: 'nano-banana2', name: 'Nano Banana2', description: '多图融合' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: '专业版' },
    { id: 'gpt-image-2', name: 'GPT Image 2 (速创)', description: 'OpenAI图像模型 via 速创渠道' },
  ]
}

// 导出各个适配器
export { NanoBanana2Adapter } from './NanoBanana2Adapter'
export { NanoBananaProAdapter } from './NanoBananaProAdapter'
export { GPTImageAdapter } from './GPTImageAdapter'
export { SuchuangGPTImage2Adapter } from './SuchuangGPTImage2Adapter'
export type { ImageGeneratorAdapter } from './ImageAdapter'
