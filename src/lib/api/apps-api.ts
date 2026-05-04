/**
 * 应用配置 API
 * 前后端数据同步
 */

import { AppConfig } from '@/stores/appsConfigStore'

const API_BASE = '/api/v2/admin/apps'

export interface AppsConfigResponse {
  apps: AppConfig[]
  updated_at: string
}

// 获取应用配置
export async function getAppsConfig(): Promise<AppsConfigResponse> {
  try {
    const res = await fetch(`${API_BASE}/config`)
    if (!res.ok) throw new Error('获取应用配置失败')
    return res.json()
  } catch (error) {
    console.error('Failed to fetch apps config:', error)
    // 返回本地存储的配置或默认配置
    return {
      apps: [],
      updated_at: new Date().toISOString(),
    }
  }
}

// 保存应用配置
export async function saveAppsConfig(apps: AppConfig[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apps }),
    })
    if (!res.ok) throw new Error('保存应用配置失败')
    return true
  } catch (error) {
    console.error('Failed to save apps config:', error)
    return false
  }
}