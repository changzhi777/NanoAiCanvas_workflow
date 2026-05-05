/**
 * 积分系统 API 客户端
 */
import { client } from './client'

export interface BalanceResponse {
  balance: number
  total_granted: number
  total_used: number
}

export interface DeductRequest {
  amount: number
  description?: string
  related_order_id?: string
  metadata?: Record<string, any>
}

export interface DeductResponse {
  success: boolean
  balance_before: number
  balance_after: number
  transaction_id: number
}

export interface GrantRequest {
  user_id?: string
  team_id?: number
  amount: number
  description?: string
}

export interface TransferRequest {
  from_user_id?: string
  from_team_id?: number
  to_user_id?: string
  to_team_id?: number
  amount: number
  description?: string
}

export interface TransactionRecord {
  id: number
  transaction_type: string
  amount: number
  balance_before: number
  balance_after: number
  status: string
  description?: string
  related_order_id?: string
  created_at: string
}

export interface TeamInfo {
  id: number
  name: string
  owner_id: string
  points_balance: number
  total_granted: number
  total_used: number
  members: TeamMemberInfo[]
}

export interface TeamMemberInfo {
  user_id: string
  role: string
  joined_at: string
}

// 积分 API
export const pointsApi = {
  /**
   * 获取当前用户积分余额
   */
  async getBalance(token?: string): Promise<BalanceResponse> {
    return client.get<BalanceResponse>('/points/balance', token)
  },

  /**
   * 扣减积分（AI任务完成时调用）
   */
  async deduct(
    amount: number,
    description?: string,
    relatedOrderId?: string,
    metadata?: Record<string, any>
  ): Promise<DeductResponse> {
    try {
      return await client.post<DeductResponse>('/points/deduct', {
        amount,
        description,
        related_order_id: relatedOrderId,
        metadata,
      })
    } catch (error: any) {
      if (error?.status === 402) {
        const err = new Error('积分不足，无法完成任务') as any
        err.status = 402
        err.insufficientBalance = true
        throw err
      }
      throw error
    }
  },

  /**
   * 发放积分（管理员功能）
   */
  async grant(request: GrantRequest): Promise<BalanceResponse> {
    return client.post<BalanceResponse>('/points/grant', request)
  },

  /**
   * 转账积分
   */
  async transfer(request: TransferRequest): Promise<DeductResponse> {
    return client.post<DeductResponse>('/points/transfer', request)
  },

  /**
   * 获取交易历史
   */
  async getHistory(limit = 50, offset = 0): Promise<TransactionRecord[]> {
    return client.get<TransactionRecord[]>(`/points/history?limit=${limit}&offset=${offset}`)
  },

  /**
   * 创建团队（自动创建团队积分池）
   */
  async createTeam(name: string): Promise<{ id: number; name: string; created_at: string }> {
    return client.post('/points/team/create', { name })
  },

  /**
   * 获取团队信息（包含积分池余额）
   */
  async getTeam(teamId: number): Promise<TeamInfo> {
    return client.get<TeamInfo>(`/points/team/${teamId}`)
  },

  /**
   * 向团队积分池发放积分
   */
  async grantToTeamPool(teamId: number, amount: number, description?: string): Promise<BalanceResponse> {
    return client.post<BalanceResponse>(`/points/team/${teamId}/grant`, {
      amount,
      description,
    })
  },

  /**
   * 使用团队积分池（成员调用）
   */
  async useTeamPoints(
    teamId: number,
    amount: number,
    description?: string,
    relatedOrderId?: string
  ): Promise<DeductResponse> {
    try {
      return await client.post<DeductResponse>(`/points/team/${teamId}/use`, {
        amount,
        description,
        related_order_id: relatedOrderId,
      })
    } catch (error: any) {
      if (error?.status === 402) {
        const err = new Error('团队积分池不足') as any
        err.status = 402
        err.insufficientBalance = true
        throw err
      }
      throw error
    }
  },

  /**
   * 添加团队成员
   */
  async addTeamMember(teamId: number, userId: string, role = 'member'): Promise<void> {
    await client.post(`/points/team/${teamId}/member/add`, {
      user_id: userId,
      role,
    })
  },

  /**
   * 列出团队成员
   */
  async listTeamMembers(teamId: number): Promise<TeamMemberInfo[]> {
    return client.get<TeamMemberInfo[]>(`/points/team/${teamId}/members`)
  },
}