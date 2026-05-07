/**
 * 团队管理 API
 * 后端路由: /api/teams (teams.py)
 */
import { client } from './client'

export interface Team {
  id: string
  name: string
  owner_id: string
  admin_id?: string
  created_at: string
  updated_at?: string
  balance?: number
  member_count?: number
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  can_edit: boolean
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
  return client.post('/api/teams', { name }, getToken() || undefined)
}

/**
 * 获取团队详情
 */
export async function getTeam(teamId: string): Promise<any> {
  return client.get(`/api/teams/${teamId}`, getToken() || undefined)
}

/**
 * 获取团队列表
 */
export async function getTeams(): Promise<Team[]> {
  return client.get('/api/teams', getToken() || undefined)
}

/**
 * 给团队积分池发放积分
 */
export async function grantTeamPoints(
  teamId: string,
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
  teamId: string,
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
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return client.get(`/api/teams/${teamId}/members`, getToken() || undefined)
}

/**
 * 添加团队成员
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ success: boolean; message: string }> {
  return client.post(
    `/api/teams/${teamId}/members`,
    { user_id: userId, role },
    getToken() || undefined
  )
}
