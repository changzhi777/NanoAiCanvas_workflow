/**
 * API 客户端 - 任务相关
 */

import type { StoryboardTask } from '@/types'

const API_BASE = '/nano2/api'

/**
 * 获取任务列表
 */
export async function getTasksApi(): Promise<{
  success: boolean
  tasks?: StoryboardTask[]
  total?: number
  error?: string
}> {
  const response = await fetch(`${API_BASE}/tasks`)
  return response.json()
}

/**
 * 获取单个任务
 */
export async function getTaskApi(id: string): Promise<{
  success: boolean
  task?: StoryboardTask
  error?: string
}> {
  const response = await fetch(`${API_BASE}/tasks/${id}`)
  return response.json()
}

/**
 * 创建任务
 */
export async function createTaskApi(task: Partial<StoryboardTask>): Promise<{
  success: boolean
  task?: StoryboardTask
  error?: string
}> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  return response.json()
}

/**
 * 更新任务
 */
export async function updateTaskApi(
  id: string,
  updates: Partial<StoryboardTask>
): Promise<{
  success: boolean
  task?: StoryboardTask
  error?: string
}> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return response.json()
}

/**
 * 删除任务
 */
export async function deleteTaskApi(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}
