/**
 * API 客户端 - 资产相关
 */

import type { StoryboardAsset } from '@/types'

const API_BASE = '/nano2/api'

/**
 * 登录
 */
export async function loginApi(params: {
  imageApiKey: string
  textApiKey?: string
  username?: string
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  return response.json()
}

/**
 * 验证会话
 */
export async function verifySessionApi(): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  const response = await fetch(`${API_BASE}/auth/verify`)
  return response.json()
}

/**
 * 获取资产列表
 */
export async function getAssetsApi(params?: {
  shared?: boolean
}): Promise<{ success: boolean; assets?: StoryboardAsset[]; error?: string }> {
  const url = new URL(`${API_BASE}/v2/library/assets`, window.location.origin)
  if (params?.shared) {
    url.searchParams.set('shared', 'true')
  }

  const response = await fetch(url.toString())
  return response.json()
}

/**
 * 获取共享资产
 */
export async function getSharedAssetsApi(params?: {
  limit?: number
  offset?: number
  style?: string
}): Promise<{
  success: boolean
  assets?: StoryboardAsset[]
  total?: number
  error?: string
}> {
  const url = new URL(`${API_BASE}/v2/library/assets`, window.location.origin)
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  if (params?.offset) url.searchParams.set('offset', String(params.offset))
  if (params?.style) url.searchParams.set('style', params.style)

  const response = await fetch(url.toString())
  return response.json()
}

/**
 * 获取单个资产
 */
export async function getAssetApi(id: string): Promise<{
  success: boolean
  asset?: StoryboardAsset
  error?: string
}> {
  const response = await fetch(`${API_BASE}/v2/library/assets/${id}`)
  return response.json()
}

/**
 * 创建资产
 */
export async function createAssetApi(asset: Partial<StoryboardAsset>): Promise<{
  success: boolean
  asset?: StoryboardAsset
  error?: string
}> {
  const response = await fetch(`${API_BASE}/v2/library/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  })

  return response.json()
}

/**
 * 更新资产
 */
export async function updateAssetApi(
  id: string,
  updates: Partial<StoryboardAsset>
): Promise<{ success: boolean; asset?: StoryboardAsset; error?: string }> {
  const response = await fetch(`${API_BASE}/v2/library/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  return response.json()
}

/**
 * 删除资产
 */
export async function deleteAssetApi(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const response = await fetch(`${API_BASE}/v2/library/assets/${id}`, {
    method: 'DELETE',
  })

  return response.json()
}

/**
 * 从 API 获取图片资产列表（用于 Gallery 页面）
 * 注意：此函数获取的是 StoryboardAsset 类型的资产，用于智能图库显示
 */
export async function fetchAssetsFromAPI(_userId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/v2/library/assets`)
  const result = await response.json()

  if (result && Array.isArray(result)) {
    return result.map((asset: any) => ({
      id: asset.id,
      userId: asset.owner_id,
      groupId: asset.group_id || 'default-group',
      isShared: asset.is_public || false,
      prompt: asset.name || asset.description || '',
      enhancedPrompt: asset.description || '',
      imageUrl: asset.url || '',
      thumbnailUrl: asset.thumbnail_url || asset.url || '',
      params: {
        style: asset.category || 'comic',
        ...asset.params
      },
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
    }))
  }

  return []
}
