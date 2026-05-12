/**
 * API 客户端 - 图片资产相关
 * 后端返回 AssetResponse { id, type, name, url, metadata, tags, ... }
 * 前端使用 ImageAsset { id, imageUrl, prompt, params, ... }
 */

import type { ImageAsset } from '@/types'

const API_BASE = '/api'

// 后端 AssetResponse → 前端 ImageAsset
function mapToImageAsset(a: any): ImageAsset {
  const meta = a.metadata || {}
  return {
    id: String(a.id),
    userId: String(a.user_id || ''),
    groupId: undefined,
    isShared: false,
    imageUrl: a.url || a.thumbnail_url || '',
    prompt: meta.prompt || a.name || '',
    enhancedPrompt: meta.enhancedPrompt,
    params: meta.params || {},
    referenceImages: meta.referenceImages || [],
    createdAt: a.created_at || new Date().toISOString(),
  }
}

function getToken(): string | null {
  return localStorage.getItem('nanoai_token')
}

/**
 * 获取图片资产列表
 */
export async function getImageAssetsApi(options?: {
  page?: number
  pageSize?: number
}): Promise<{
  success: boolean
  assets?: ImageAsset[]
  total?: number
  error?: string
}> {
  const token = getToken()
  if (!token) return { success: true, assets: [], total: 0 }

  const params = new URLSearchParams()
  params.set('type_filter', 'image')
  params.set('page', String(options?.page || 1))
  params.set('page_size', String(options?.pageSize || 50))

  try {
    const response = await fetch(`${API_BASE}/assets?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    const items = data.items || []
    return {
      success: true,
      assets: items.map(mapToImageAsset),
      total: data.total || 0,
    }
  } catch {
    return { success: false, assets: [], total: 0 }
  }
}

/**
 * 获取单个图片资产
 */
export async function getImageAssetApi(id: string): Promise<{
  success: boolean
  asset?: ImageAsset
  error?: string
}> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not authenticated' }

  try {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` }
    const data = await response.json()
    return { success: true, asset: mapToImageAsset(data) }
  } catch {
    return { success: false }
  }
}

/**
 * 创建图片资产
 */
export async function createImageAssetApi(asset: {
  imageUrl?: string
  prompt?: string
  enhancedPrompt?: string
  params?: Record<string, any>
  referenceImages?: string[]
  version?: string
  sourceNodeId?: string
  workflowId?: string
  assetType?: string
}): Promise<{
  success: boolean
  asset?: ImageAsset
  error?: string
}> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not authenticated' }

  const backendAsset = {
    type: asset.assetType || asset.params?.type || 'image',
    name: asset.prompt?.slice(0, 50) || 'Generated Image',
    url: asset.imageUrl || '',
    tags: ['generated'],
    metadata: {
      prompt: asset.prompt,
      enhancedPrompt: asset.enhancedPrompt,
      params: asset.params,
      referenceImages: asset.referenceImages,
    },
    version: asset.version || undefined,
    source_node_id: asset.sourceNodeId || undefined,
    workflow_id: asset.workflowId || undefined,
  }

  try {
    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(backendAsset),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const result = await response.json()
    return { success: true, asset: mapToImageAsset(result) }
  } catch (err) {
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
  const token = getToken()
  if (!token) return { success: false, error: 'Not authenticated' }

  try {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` }
    return { success: true }
  } catch {
    return { success: false }
  }
}

/**
 * 按版本查询故事板分镜资产
 */
export async function getStoryboardShotAssetsApi(options?: {
  version?: string
  scriptTitle?: string
  page?: number
  pageSize?: number
}): Promise<{
  success: boolean
  items?: any[]
  total?: number
  error?: string
}> {
  const params = new URLSearchParams()
  params.set('type_filter', 'storyboard_image')
  if (options?.version) params.set('version', options.version)
  if (options?.page) params.set('page', String(options.page))
  if (options?.pageSize) params.set('page_size', String(options.pageSize))
  if (options?.scriptTitle) params.set('search', options.scriptTitle)

  const token = getToken()
  if (!token) return { success: true, items: [], total: 0 }

  try {
    const response = await fetch(`${API_BASE}/assets?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) return { success: false, error: await response.text() }
    const data = await response.json()
    return { success: true, items: data.items, total: data.total }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
