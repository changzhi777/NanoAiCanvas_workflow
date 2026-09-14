import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import { getAgentAbout, startPipeline, getPipelineStatus, agentChat, listAgents, AGENT_VERSION, AGENT_COPYRIGHT } from '@/lib/api/agent-api'

describe('agent-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constants', () => {
    it('should export version and copyright', () => {
      expect(AGENT_VERSION).toBe('V0.3.0')
      expect(AGENT_COPYRIGHT).toContain('AiHXC.Team')
    })
  })

  describe('getAgentAbout', () => {
    it('should GET /api/v2/agent/about', async () => {
      const mockAbout = {
        name: 'Nanoai Team8',
        version: 'V0.3.0',
        copyright: 'Copyright © 2026 AiHXC.Team',
        agents: ['producer', 'screenwriter', 'director'],
        agents_detail: [],
        model_mode: 'cloud',
        health: { local: false, cloud: true },
        skills_count: 0,
        users_count: 0,
      }
      mockFetchResponse(mockAbout)
      const result = await getAgentAbout()
      expect(result.version).toBe('V0.3.0')
      expect(result.agents).toHaveLength(3)
      expect(lastFetchUrl()).toContain('/api/v2/agent/about')
    })
  })

  describe('startPipeline', () => {
    it('should POST to start pipeline', async () => {
      mockFetchResponse({ task_id: 'task-123', status: 'started' })
      const result = await startPipeline({ prompt: 'test' }, 'adaptation')
      expect(result.task_id).toBe('task-123')
      expect(result.status).toBe('started')
    })
  })

  describe('getPipelineStatus', () => {
    it('should GET pipeline status by taskId', async () => {
      mockFetchResponse({
        task_id: 'task-123',
        user_id: 'u1',
        status: 'running',
        current_stage: 2,
        total_stages: 8,
        stages: [],
        result: null,
        created_at: Date.now() / 1000,
      })
      const result = await getPipelineStatus('task-123')
      expect(result.status).toBe('running')
      expect(result.current_stage).toBe(2)
      expect(lastFetchUrl()).toContain('/api/v2/agent/pipeline/task-123')
    })
  })

  describe('agentChat', () => {
    it('should POST chat messages', async () => {
      mockFetchResponse({ status: 'ok', agent: 'producer' })
      const result = await agentChat(
        [{ role: 'user', content: 'Hello' }],
        'producer',
      )
      expect(result.status).toBe('ok')
      expect(result.agent).toBe('producer')
    })
  })

  describe('listAgents', () => {
    it('should GET agent list', async () => {
      mockFetchResponse({
        agents: [
          { name: 'producer', description: '全局编排' },
          { name: 'screenwriter', description: '剧本创作' },
        ],
      })
      const result = await listAgents()
      expect(result.agents).toHaveLength(2)
      expect(result.agents[0].name).toBe('producer')
    })
  })
})
