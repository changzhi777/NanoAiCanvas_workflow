/**
 * 应用可见性配置 API（数据库版本）
 * 与后端 /api/v2/admin/app-visibility 交互
 */

import type { VisibilityState } from '@/stores/appVisibilityStore'

const API_BASE = '/api/v2/admin/app-visibility'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('nanoai_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  })
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`)
  return res.json()
}

// ============ 类型 ============

export interface VisibilityItem {
  id: number
  scope: string
  item_id: string
  item_name: string
  description: string
  category: string
  visibility: VisibilityState
  created_at: string | null
  updated_at: string | null
}

export interface AuditLogEntry {
  id: number
  admin_id: string | null
  admin_name: string | null
  scope: string
  action: string
  changes: Array<{
    item_id: string
    item_name: string
    old: string
    new: string
  }> | null
  snapshot: Record<string, unknown> | null
  created_at: string | null
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  total: number
  page: number
  page_size: number
}

export interface VisibilityStats {
  [scope: string]: {
    total: number
    active: number
    disabled: number
    hidden: number
  }
}

export interface AppVisibilityResponse {
  workflowTemplates: Record<string, VisibilityState>
  workflowNodes: Record<string, VisibilityState>
  nano2Modules: Record<string, VisibilityState>
}

// ============ API 函数 ============

export async function getAppVisibility(): Promise<AppVisibilityResponse> {
  return request<AppVisibilityResponse>('/config')
}

export async function saveAppVisibility(data: {
  workflowTemplates: Record<string, VisibilityState>
  workflowNodes: Record<string, VisibilityState>
  nano2Modules: Record<string, VisibilityState>
}): Promise<{ status: string }> {
  return request<{ status: string }>('/config', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function patchItem(
  scope: string,
  itemId: string,
  visibility: VisibilityState,
): Promise<VisibilityItem> {
  return request<VisibilityItem>(`/items/${scope}/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  })
}

export async function batchUpdate(
  scope: string,
  items: Array<{ item_id: string; visibility: VisibilityState }>,
): Promise<{ updated: number }> {
  return request<{ updated: number }>('/batch', {
    method: 'POST',
    body: JSON.stringify({ scope, items }),
  })
}

export async function resetConfig(scope: string): Promise<{ reset: number }> {
  return request<{ reset: number }>('/reset', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  })
}

export async function getAuditLog(params?: {
  scope?: string
  page?: number
  page_size?: number
}): Promise<AuditLogResponse> {
  const qs = new URLSearchParams()
  if (params?.scope) qs.set('scope', params.scope)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  const query = qs.toString() ? `?${qs}` : ''
  return request<AuditLogResponse>(`/audit-log${query}`)
}

export async function getStats(): Promise<VisibilityStats> {
  return request<VisibilityStats>('/stats')
}

export async function seedDefaults(): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>('/seed', { method: 'POST' })
}
