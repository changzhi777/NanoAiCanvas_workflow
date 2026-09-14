import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import {
  createTeam,
  getTeam,
  getTeams,
  grantTeamPoints,
  useTeamPoints,
  getTeamMembers,
  addTeamMember,
} from '@/lib/api/teams-api'

describe('teams-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTeam', () => {
    it('should POST to create team', async () => {
      mockFetchResponse({ id: 't1', name: 'Team A', owner_id: 'u1' })

      const result = await createTeam('Team A')

      expect(result.name).toBe('Team A')
      expect(lastFetchUrl()).toContain('/api/teams')
    })
  })

  describe('getTeam', () => {
    it('should GET team by id', async () => {
      mockFetchResponse({ id: 't1', name: 'Team A' })

      const result = await getTeam('t1')

      expect(result.id).toBe('t1')
      expect(lastFetchUrl()).toContain('/api/teams/t1')
    })
  })

  describe('getTeams', () => {
    it('should GET teams list', async () => {
      mockFetchResponse([{ id: 't1', name: 'A' }, { id: 't2', name: 'B' }])

      const result = await getTeams()

      expect(result).toHaveLength(2)
    })
  })

  describe('grantTeamPoints', () => {
    it('should POST to grant points', async () => {
      mockFetchResponse({ balance: 1000, transaction_id: 'tx-1' })

      const result = await grantTeamPoints('t1', 500, 'Initial grant')

      expect(result.balance).toBe(1000)
      expect(lastFetchUrl()).toContain('/api/points/team/t1/grant')
    })
  })

  describe('useTeamPoints', () => {
    it('should POST to use points', async () => {
      mockFetchResponse({ balance: 500, transaction_id: 'tx-2' })

      const result = await useTeamPoints('t1', 100, 'Usage')

      expect(result.balance).toBe(500)
      expect(lastFetchUrl()).toContain('/api/points/team/t1/use')
    })
  })

  describe('getTeamMembers', () => {
    it('should GET team members', async () => {
      mockFetchResponse([
        { id: 'm1', team_id: 't1', user_id: 'u1', role: 'owner', can_edit: true, joined_at: '' },
      ])

      const result = await getTeamMembers('t1')

      expect(result).toHaveLength(1)
      expect(result[0].role).toBe('owner')
    })
  })

  describe('addTeamMember', () => {
    it('should POST to add member', async () => {
      mockFetchResponse({ success: true, message: 'Added' })

      const result = await addTeamMember('t1', 'u2', 'member')

      expect(result.success).toBe(true)
    })
  })
})
