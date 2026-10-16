/**
 * 图片生成适配器统一导出
 * 提供统一的适配器获取接口
 */

import type { ImageModelId } from '@/types/image'
import type { ImageGeneratorAdapter } from './ImageAdapter'

import { getNanoBanana2Adapter } from './NanoBanana2Adapter'
import { getNanoBananaProAdapter } from './NanoBananaProAdapter'
import { getNanoBanana21Adapter } from './NanoBanana21Adapter'
import { getSkillQueueAdapter } from './SkillQueueAdapter'

const ADAPTERS: Record<ImageModelId, () => ImageGeneratorAdapter> = {
  'nano-banana2': getNanoBanana2Adapter,
  'nano-banana-pro': getNanoBananaProAdapter,
  'gpt-image-2': getSkillQueueAdapter,
  'nano-banana2.1': getNanoBanana21Adapter,
}

export function getAdapter(modelId: ImageModelId): ImageGeneratorAdapter {
  const factory = ADAPTERS[modelId]
  if (!factory) {
    throw new Error(`Unknown image model: ${modelId}`)
  }
  return factory()
}

export function getAllModelInfo(): Array<{ id: ImageModelId; name: string; description: string }> {
  return [
    { id: 'nano-banana2', name: 'Nano Banana2', description: '多图融合' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: '专业版' },
    { id: 'gpt-image-2', name: 'GPT Image 2 (Skills Queue)', description: '后台队列生成' },
    { id: 'nano-banana2.1', name: 'Nano Banana 2.1', description: '多图融合 + 比例控制' },
  ]
}

export { NanoBanana2Adapter } from './NanoBanana2Adapter'
export { NanoBananaProAdapter } from './NanoBananaProAdapter'
export { NanoBanana21Adapter } from './NanoBanana21Adapter'
export { SkillQueueAdapter } from './SkillQueueAdapter'
export type { ImageGeneratorAdapter } from './ImageAdapter'
