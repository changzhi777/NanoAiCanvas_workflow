/**
 * API 客户端 - 图片资产相关
 */

import type { ImageAsset } from '@/types'

// 后端 API 基础路径
const API_BASE = '/api'

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

  const token = localStorage.getItem('nanoai_token')
  const url = `${API_BASE}/assets${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  })
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
  const token = localStorage.getItem('nanoai_token')
  const response = await fetch(`${API_BASE}/assets/${id}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  })
  return response.json()
}

/**
 * 创建图片资产
 * 注意：frontend format -> backend format 转换
 */
export async function createImageAssetApi(asset: {
  imageUrl?: string
  prompt?: string
  enhancedPrompt?: string
  params?: Record<string, any>
  referenceImages?: string[]
}): Promise<{
  success: boolean
  asset?: ImageAsset
  error?: string
}> {
  const token = localStorage.getItem('nanoai_token')

  // Transform frontend format to backend format
  const backendAsset = {
    type: 'IMAGE',
    name: asset.prompt?.slice(0, 50) || 'Generated Image',
    url: asset.imageUrl || '',
    tags: ['generated'],
    metadata: {
      prompt: asset.prompt,
      enhancedPrompt: asset.enhancedPrompt,
      params: asset.params,
      referenceImages: asset.referenceImages,
    }
  }

  try {
    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(backendAsset),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Create asset failed:', error)
      return { success: false, error: error || 'Failed to create asset' }
    }

    const result = await response.json()
    return { success: true, asset: result }
  } catch (err) {
    console.error('Create asset error:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * 删除图片资产
 */
export async function deleteImageAssetApi(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const token = localStorage.getItem('nanoai_token')
  const response = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'DELETE',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  })
  return response.json()
}
