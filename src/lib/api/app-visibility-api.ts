/**
 * 应用可见性配置 API
 * 与后端配置文件同步
 */

import type { VisibilityState } from '@/stores/appVisibilityStore'

const API_BASE = '/api/v2/admin/app-visibility'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('nanoai_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export interface AppVisibilityPayload {
  workflowTemplates: Record<string, VisibilityState>
  workflowNodes: Record<string, VisibilityState>
  nano2Modules: Record<string, VisibilityState>
}

export interface AppVisibilityResponse extends AppVisibilityPayload {
  updated_at: string
}

export async function getAppVisibility(): Promise<AppVisibilityResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/config`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('获取应用可见性配置失败')
    return res.json()
  } catch (error) {
    console.error('Failed to fetch app visibility config:', error)
    return null
  }
}

export async function saveAppVisibility(data: AppVisibilityPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('保存应用可见性配置失败')
    return true
  } catch (error) {
    console.error('Failed to save app visibility config:', error)
    return false
  }
}
