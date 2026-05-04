/**
 * API 客户端 - 图片资产相关
 */

import type { ImageAsset } from '@/types'

const API_BASE = '/nano2/api'

/**
 * 获取图片资产列表
 */
export async function getImageAssetsApi(options?: {
  shared?: boolean
}): Promise<{
  success: boolean
  assets?: ImageAsset[]
  total?: number
  error?: string
}> {
  const params = new URLSearchParams()
  if (options?.shared) {
    params.set('shared', 'true')
  }

  const url = `${API_BASE}/image-assets${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)
  return response.json()
}

/**
 * 获取单个图片资产
 */
export async function getImageAssetApi(id: string): Promise<{
  success: boolean
  asset?: ImageAsset
  error?: string
}> {
  const response = await fetch(`${API_BASE}/image-assets/${id}`)
  return response.json()
}

/**
 * 创建图片资产
 */
export async function createImageAssetApi(asset: Partial<ImageAsset>): Promise<{
  success: boolean
  asset?: ImageAsset
  error?: string
}> {
  const response = await fetch(`${API_BASE}/image-assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  })
  return response.json()
}

/**
 * 删除图片资产
 */
export async function deleteImageAssetApi(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const response = await fetch(`${API_BASE}/image-assets/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}
