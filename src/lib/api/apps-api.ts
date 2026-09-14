/**
 * 应用配置 API
 * 后端路由: /api/v2/admin/app-visibility
 * 后端返回: { workflowTemplates, workflowNodes, nano2Modules }
 * 前端使用: AppConfig[] (appsConfigStore)
 */

import { AppConfig, APPS_LIST } from '@/stores/appsConfigStore'

const API_BASE = '/api/v2/admin/app-visibility'

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

// 获取应用配置（后端格式 → 前端 AppConfig[]）
export async function getAppsConfig(): Promise<{ apps: AppConfig[]; updated_at: string }> {
  const token = getToken()
  try {
    const res = await fetch(`${API_BASE}/config`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('获取应用配置失败')
    await res.json()

    // 后端不返回 apps 格式，使用本地默认
    return {
      apps: APPS_LIST,
      updated_at: new Date().toISOString(),
    }
  } catch {
    return {
      apps: APPS_LIST,
      updated_at: new Date().toISOString(),
    }
  }
}

// 保存应用配置（前端 AppConfig[] → 后端格式）
export async function saveAppsConfig(apps: AppConfig[]): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    // 构建 app-visibility 格式的 payload
    const payload: Record<string, string> = {}
    for (const app of apps) {
      payload[app.id] = app.enabled ? 'active' : 'disabled'
    }

    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ nano2Modules: payload }),
    })
    if (!res.ok) throw new Error('保存应用配置失败')
    return true
  } catch {
    return false
  }
}
