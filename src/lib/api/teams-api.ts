/**
 * 团队管理 API
 */
import { client } from './client'

export interface Team {
  id: number
  name: string
  owner_id: string
  created_at: string
  updated_at?: string
  balance?: number
  member_count?: number
  members?: TeamMember[]
}

export interface TeamMember {
  id: number
  team_id: number
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user?: {
    id: string
    username: string
    email: string
  }
}

export interface CreateTeamRequest {
  name: string
}

export interface GrantTeamPointsRequest {
  amount: number
  description?: string
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

/**
 * 创建团队
 */
export async function createTeam(name: string): Promise<any> {
  return client.post('/api/points/team/create', { name }, getToken() || undefined)
}

/**
 * 获取团队详情
 */
export async function getTeam(teamId: number): Promise<any> {
  return client.get(`/api/points/team/${teamId}`, getToken() || undefined)
}

/**
 * 获取团队列表
 */
export async function getTeams(): Promise<any> {
  return client.get('/api/points/teams', getToken() || undefined)
}

/**
 * 给团队积分池发放积分
 */
export async function grantTeamPoints(
  teamId: number,
  amount: number,
  description?: string
): Promise<{ balance: number; transaction_id: string }> {
  return client.post(
    `/api/points/team/${teamId}/grant`,
    { amount, description },
    getToken() || undefined
  )
}

/**
 * 使用团队积分
 */
export async function useTeamPoints(
  teamId: number,
  amount: number,
  description?: string
): Promise<{ balance: number; transaction_id: string }> {
  return client.post(
    `/api/points/team/${teamId}/use`,
    { amount, description },
    getToken() || undefined
  )
}

/**
 * 获取团队成员列表
 */
export async function getTeamMembers(teamId: number): Promise<any[]> {
  return client.get(`/api/points/team/${teamId}/members`, getToken() || undefined)
}

/**
 * 添加团队成员
 */
export async function addTeamMember(
  teamId: number,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ success: boolean; message: string }> {
  return client.post(
    `/api/points/team/${teamId}/member/add`,
    { user_id: userId, role },
    getToken() || undefined
  )
}