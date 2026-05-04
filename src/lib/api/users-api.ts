/**
 * 用户管理 API
 */
import { client } from './client'

export interface UserInfo {
  user_id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login_at?: string
  balance: number
  total_granted: number
  total_used: number
}

export interface UserListResponse {
  users: UserInfo[]
  total: number
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

/**
 * 获取用户列表
 */
export async function getUsers(
  page = 1,
  pageSize = 20,
  search?: string
): Promise<UserListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (search) params.set('search', search)

  return client.get(`/api/v2/admin/points/users?${params}`, getToken() || undefined)
}

/**
 * 获取用户详情
 */
export async function getUser(userId: string): Promise<UserInfo> {
  return client.get(`/api/v2/admin/points/users/${userId}`, getToken() || undefined)
}

/**
 * 更新用户信息
 */
export async function updateUser(
  userId: string,
  data: { username?: string; is_verified?: boolean }
): Promise<{ success: boolean; message: string }> {
  return client.put(
    `/api/v2/admin/points/users/${userId}`,
    data,
    getToken() || undefined
  )
}

/**
 * 禁用用户
 */
export async function disableUser(userId: string): Promise<{ success: boolean; message: string }> {
  return client.post(
    `/api/v2/admin/points/users/${userId}/disable`,
    undefined,
    getToken() || undefined
  )
}

/**
 * 启用用户
 */
export async function enableUser(userId: string): Promise<{ success: boolean; message: string }> {
  return client.post(
    `/api/v2/admin/points/users/${userId}/enable`,
    undefined,
    getToken() || undefined
  )
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  return client.delete(`/api/v2/admin/points/users/${userId}`, getToken() || undefined)
}