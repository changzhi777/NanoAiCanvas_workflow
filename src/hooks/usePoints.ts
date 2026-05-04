/**
 * 积分 Hook
 * 提供积分余额查询、扣费、团队积分池等功能
 */
import { useState, useCallback, useEffect } from 'react'
import { pointsApi, type DeductResponse, type TransactionRecord } from '@/lib/api/points-api'
import { useAuthStore } from '@/stores/remoteStore'
import { useToast } from '@/hooks/useToast'

export interface UsePointsReturn {
  // 余额信息
  balance: number
  totalGranted: number
  totalUsed: number
  loading: boolean
  error: string | null

  // 操作方法
  refreshBalance: () => Promise<void>
  deduct: (
    amount: number,
    description?: string,
    relatedOrderId?: string
  ) => Promise<DeductResponse>
  getHistory: (limit?: number, offset?: number) => Promise<TransactionRecord[]>

  // 团队积分池
  currentTeamId: number | null
  setCurrentTeamId: (teamId: number | null) => void
  useTeamPoints: (
    amount: number,
    description?: string,
    relatedOrderId?: string
  ) => Promise<DeductResponse>
}

export function usePoints(): UsePointsReturn {
  const [balance, setBalance] = useState(0)
  const [totalGranted, setTotalGranted] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTeamId, setCurrentTeamIdState] = useState<number | null>(null)

  const token = useAuthStore((s) => s.token)
  const { toast } = useToast()

  // 检查是否已登录
  const isLoggedIn = !!token

  // 刷新余额
  const refreshBalance = useCallback(async () => {
    if (!isLoggedIn) {
      setBalance(0)
      setTotalGranted(0)
      setTotalUsed(0)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await pointsApi.getBalance()
      setBalance(data.balance)
      setTotalGranted(data.total_granted)
      setTotalUsed(data.total_used)
    } catch (err: any) {
      console.error('Failed to fetch balance:', err)
      setError(err.message || '获取余额失败')
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  // 扣减积分
  const deduct = useCallback(
    async (
      amount: number,
      description?: string,
      relatedOrderId?: string
    ): Promise<DeductResponse> => {
      if (!isLoggedIn) {
        throw new Error('请先登录')
      }

      if (amount <= 0) {
        throw new Error('扣减数量必须大于 0')
      }

      try {
        const result = await pointsApi.deduct(amount, description, relatedOrderId)

        // 重新获取余额确保准确（不信任返回值）
        await refreshBalance()

        toast.success(`扣费成功`)
        return result
      } catch (err: any) {
        // 扣费失败也要刷新余额
        await refreshBalance()
        if (err.insufficientBalance) {
          toast.error('积分不足，无法完成任务')
        } else {
          toast.error(err.message || '扣费失败')
        }
        throw err
      }
    },
    [isLoggedIn, toast]
  )

  // 获取交易历史
  const getHistory = useCallback(
    async (limit = 50, offset = 0): Promise<TransactionRecord[]> => {
      if (!isLoggedIn) {
        throw new Error('请先登录')
      }

      return pointsApi.getHistory(limit, offset)
    },
    [isLoggedIn]
  )

  // 设置当前团队ID
  const setCurrentTeamId = useCallback((teamId: number | null) => {
    setCurrentTeamIdState(teamId)
    if (teamId !== null) {
      localStorage.setItem('current_team_id', String(teamId))
    } else {
      localStorage.removeItem('current_team_id')
    }
  }, [])

  // 使用团队积分池
  const useTeamPoints = useCallback(
    async (
      amount: number,
      description?: string,
      relatedOrderId?: string
    ): Promise<DeductResponse> => {
      if (!currentTeamId) {
        throw new Error('未选择团队')
      }

      if (amount <= 0) {
        throw new Error('扣减数量必须大于 0')
      }

      try {
        const result = await pointsApi.useTeamPoints(
          currentTeamId,
          amount,
          description,
          relatedOrderId
        )

        toast.success(`团队积分池扣费成功`)
        return result
      } catch (err: any) {
        if (err.insufficientBalance) {
          toast.error('团队积分池不足')
        } else {
          toast.error(err.message || '团队积分池扣费失败')
        }
        throw err
      }
    },
    [currentTeamId, toast]
  )

  // 初始化：从 localStorage 恢复团队ID
  useEffect(() => {
    const savedTeamId = localStorage.getItem('current_team_id')
    if (savedTeamId) {
      setCurrentTeamIdState(parseInt(savedTeamId, 10))
    }
  }, [])

  // 初始化：登录时刷新余额
  useEffect(() => {
    if (isLoggedIn) {
      refreshBalance()
    } else {
      setBalance(0)
      setTotalGranted(0)
      setTotalUsed(0)
    }
  }, [isLoggedIn, refreshBalance])

  return {
    balance,
    totalGranted,
    totalUsed,
    loading,
    error,
    refreshBalance,
    deduct,
    getHistory,
    currentTeamId,
    setCurrentTeamId,
    useTeamPoints,
  }
}

/**
 * 积分扣费辅助函数 - 用于在工作流节点执行完成后调用
 *
 * @param amount 扣减积分数
 * @param options 配置选项
 * @returns 扣费结果或 null（如果未登录或积分不足）
 *
 * @example
 * ```typescript
 * // 在 AI 任务完成后扣费
 * const result = await deductPointsForTask(100, {
 *   description: '脚本生成',
 *   relatedOrderId: workflowNodeId,
 * });
 * if (!result) {
 *   // 积分不足，无法继续
 *   return;
 * }
 * ```
 */
export async function deductPointsForTask(
  amount: number,
  options: {
    description?: string
    relatedOrderId?: string
    useTeamPool?: boolean
    teamId?: number
  } = {}
): Promise<DeductResponse | null> {
  const { description, relatedOrderId, useTeamPool = false, teamId } = options

  try {
    if (useTeamPool && teamId) {
      // 使用团队积分池
      return await pointsApi.useTeamPoints(teamId, amount, description, relatedOrderId)
    } else {
      // 使用个人积分 - 直接调用 API
      return await pointsApi.deduct(amount, description, relatedOrderId)
    }
  } catch (err: any) {
    if (err.insufficientBalance) {
      return null // 积分不足
    }
    throw err
  }
}