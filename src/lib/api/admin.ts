/**
 * 管理后台 API 客户端
 */

import type { SystemMetrics, DockerContainer, Alert, AuditLog, PaginatedResponse } from '@/types/admin'

const API_BASE = '/nano2/api/admin'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 获取系统指标
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const response = await fetch(`${API_BASE}/system/metrics`)
  const result: ApiResponse<SystemMetrics> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取系统指标失败')
  }

  return result.data
}

/**
 * 获取容器列表
 */
export async function getContainers(): Promise<DockerContainer[]> {
  const response = await fetch(`${API_BASE}/containers`)
  const result: ApiResponse<DockerContainer[]> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取容器列表失败')
  }

  return result.data
}

/**
 * 重启容器
 */
export async function restartContainer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/containers/${id}/restart`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '重启容器失败')
  }
}

/**
 * 停止容器
 */
export async function stopContainer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/containers/${id}/stop`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '停止容器失败')
  }
}

/**
 * 启动容器
 */
export async function startContainer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/containers/${id}/start`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '启动容器失败')
  }
}

/**
 * 获取容器日志
 */
export async function getContainerLogs(id: string, tail: number = 100): Promise<string> {
  const response = await fetch(`${API_BASE}/containers/${id}/logs?tail=${tail}`)
  const result: ApiResponse<string> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取容器日志失败')
  }

  return result.data
}

/**
 * 获取告警列表
 */
export async function getAlerts(): Promise<Alert[]> {
  const response = await fetch(`${API_BASE}/alerts`)
  const result: ApiResponse<Alert[]> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取告警列表失败')
  }

  return result.data
}

/**
 * 标记告警已读
 */
export async function markAlertRead(alertId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/read`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '标记告警失败')
  }
}

/**
 * 清除所有告警
 */
export async function clearAllAlerts(): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/clear`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '清除告警失败')
  }
}

/**
 * 获取操作日志
 */
export async function getAuditLogs(params: {
  page?: number
  page_size?: number
  user_id?: number
}): Promise<PaginatedResponse<AuditLog>> {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.page_size) queryParams.set('page_size', String(params.page_size))
  if (params.user_id) queryParams.set('user_id', String(params.user_id))

  const response = await fetch(`${API_BASE}/audit-logs?${queryParams}`)
  const result: ApiResponse<PaginatedResponse<AuditLog>> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取操作日志失败')
  }

  return result.data
}

/**
 * 清理磁盘
 */
export async function cleanDisk(): Promise<{ freed: number }> {
  const response = await fetch(`${API_BASE}/system/clean-disk`, {
    method: 'POST'
  })
  const result: ApiResponse<{ freed: number }> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '清理磁盘失败')
  }

  return result.data
}

/**
 * 获取指标基线
 */
export async function getThresholdBaseline(metricType: string, hours: number = 24) {
  const response = await fetch(`${API_BASE}/thresholds/baseline/${metricType}?hours=${hours}`)
  const result: ApiResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取基线失败')
  }

  return result.data
}

/**
 * 获取推荐阈值
 */
export async function recommendThreshold(metricType: string, hours: number = 24) {
  const response = await fetch(`${API_BASE}/thresholds/recommend/${metricType}?hours=${hours}`)
  const result: ApiResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取推荐阈值失败')
  }

  return result.data
}

/**
 * 更新阈值规则
 */
export async function updateThresholds(metricType?: string, autoCommit: boolean = false) {
  const queryParams = new URLSearchParams()
  if (metricType) queryParams.set('metric_type', metricType)
  queryParams.set('auto_commit', String(autoCommit))

  const response = await fetch(`${API_BASE}/thresholds/update?${queryParams}`, {
    method: 'POST'
  })
  const result: ApiResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '更新阈值失败')
  }

  return result.data
}

/**
 * 获取阈值调整历史
 */
export async function getThresholdHistory(metricType: string, days: number = 7) {
  const response = await fetch(`${API_BASE}/thresholds/history/${metricType}?days=${days}`)
  const result: ApiResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取历史失败')
  }

  return result.data
}

/**
 * 导出所有 API
 */
export const adminApi = {
  getSystemMetrics,
  getContainers,
  restartContainer,
  stopContainer,
  startContainer,
  getContainerLogs,
  getAlerts,
  markAlertRead,
  clearAllAlerts,
  getAuditLogs,
  cleanDisk,
  getThresholdBaseline,
  recommendThreshold,
  updateThresholds,
  getThresholdHistory
}
