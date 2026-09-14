import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, mockFetchError, lastFetchUrl } from '@/test/mock-fetch'
import { pointsApi } from '@/lib/api/points-api'

describe('pointsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBalance', () => {
    it('should fetch balance', async () => {
      mockFetchResponse({ balance: 100, total_granted: 200, total_used: 100 })
      const result = await pointsApi.getBalance('token')
      expect(result.balance).toBe(100)
      expect(result.total_used).toBe(100)
    })
  })

  describe('checkBalance', () => {
    it('should post model_type', async () => {
      mockFetchResponse({ sufficient: true, required: 10, balance: 100, account_id: 1 })
      const result = await pointsApi.checkBalance('image')
      expect(result.sufficient).toBe(true)
      expect(result.required).toBe(10)
    })
  })

  describe('deductByModel', () => {
    it('should deduct by model type', async () => {
      mockFetchResponse({ success: true, balance_before: 100, balance_after: 90, transaction_id: 1 })
      const result = await pointsApi.deductByModel('nano_banana_2', 'AI任务')
      expect(result.success).toBe(true)
      expect(result.balance_after).toBe(90)
    })

    it('should throw insufficient error on 402', async () => {
      mockFetchError(402, '积分不足')
      try {
        await pointsApi.deductByModel('nano_banana_2')
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err.message).toContain('积分不足')
        expect(err.insufficientBalance).toBe(true)
      }
    })
  })

  describe('getHistory', () => {
    it('should fetch with default pagination', async () => {
      mockFetchResponse([])
      await pointsApi.getHistory()
      const url = lastFetchUrl()
      expect(url).toContain('limit=50')
      expect(url).toContain('offset=0')
    })

    it('should use custom pagination', async () => {
      mockFetchResponse([])
      await pointsApi.getHistory(20, 10)
      const url = lastFetchUrl()
      expect(url).toContain('limit=20')
      expect(url).toContain('offset=10')
    })
  })

  describe('team operations', () => {
    it('createTeam should post team name', async () => {
      mockFetchResponse({ id: 1, name: 'Test Team', created_at: '2026-01-01' })
      const result = await pointsApi.createTeam('Test Team')
      expect(result.name).toBe('Test Team')
    })

    it('grantToTeamPool should post amount', async () => {
      mockFetchResponse({ balance: 500, total_granted: 500, total_used: 0 })
      const result = await pointsApi.grantToTeamPool(1, 500, '充值')
      expect(result.balance).toBe(500)
    })
  })
})
