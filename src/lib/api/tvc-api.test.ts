import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock client before importing tvcApi
const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock('./client', () => ({
  client: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
  },
}))

import { tvcApi } from './tvc-api'

describe('tvcApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockGet.mockReset()
  })

  describe('generateScript', () => {
    it('calls GLM endpoint by default', async () => {
      const mockScript = { tvc_title: 'Test', shots: [] }
      mockPost.mockResolvedValue({ screenplay: mockScript })

      const result = await tvcApi.generateScript({ prompt: 'test prompt' })

      expect(mockPost).toHaveBeenCalledWith('/api/glm/screenplay', expect.objectContaining({
        premise: 'test prompt',
        shot_count: 6,
        style: 'realistic',
      }))
      expect(result.script).toEqual(mockScript)
    })

    it('calls MiniMax endpoint when provider is minimax', async () => {
      const mockScript = { tvc_title: 'Test', shots: [] }
      mockPost.mockResolvedValue({ screenplay: mockScript })

      await tvcApi.generateScript({ prompt: 'test', modelProvider: 'minimax' })

      expect(mockPost).toHaveBeenCalledWith('/api/minimax/screenplay', expect.objectContaining({
        model: 'MiniMax-M2.7',
      }))
    })

    it('uses custom shotCount and style', async () => {
      mockPost.mockResolvedValue({ screenplay: {} })

      await tvcApi.generateScript({ prompt: 'test', shotCount: 10, style: 'anime' })

      expect(mockPost).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        shot_count: 10,
        style: 'anime',
      }))
    })
  })

  describe('analyzeProductReference', () => {
    it('calls product-reference endpoint with image_url', async () => {
      const mockAnalysis = { product_name: 'Coffee', visual_style: 'warm' }
      mockPost.mockResolvedValue({ analysis: mockAnalysis })

      const result = await tvcApi.analyzeProductReference({ imageUrl: 'data:image/png;base64,abc' })

      expect(mockPost).toHaveBeenCalledWith('/api/glm/product-reference', expect.objectContaining({
        image_url: 'data:image/png;base64,abc',
        intent: 'tvc',
        model: 'glm-5v-turbo',
      }))
      expect(result.analysis).toEqual(mockAnalysis)
    })
  })

  describe('estimatePoints', () => {
    it('calls tvc-estimate endpoint', async () => {
      mockPost.mockResolvedValue({ total: 100, balance: 200, sufficient: true })

      const result = await tvcApi.estimatePoints({ shotCount: 6 })

      expect(mockPost).toHaveBeenCalledWith('/points/tvc-estimate', {
        shot_count: 6,
        include_bgm: true,
      })
      expect(result.sufficient).toBe(true)
    })
  })

  describe('submitTask', () => {
    it('submits with correct defaults', async () => {
      mockPost.mockResolvedValue({ task_id: 'tvc_abc123', status: 'submitted' })

      const result = await tvcApi.submitTask({ workflowId: 'wf-1', prompt: 'test' })

      expect(mockPost).toHaveBeenCalledWith('/v2/tvc-tasks/submit', expect.objectContaining({
        workflow_id: 'wf-1',
        prompt: 'test',
        shot_count: 6,
        execution_mode: 'auto',
      }))
      expect(result.task_id).toBe('tvc_abc123')
    })
  })

  describe('getTaskStatus', () => {
    it('fetches task status', async () => {
      const mockState = { task_id: 'tvc_1', status: 'running', overall_progress: 50, nodes: [] }
      mockGet.mockResolvedValue(mockState)

      const result = await tvcApi.getTaskStatus('tvc_1')

      expect(mockGet).toHaveBeenCalledWith('/v2/tvc-tasks/tvc_1')
      expect(result.status).toBe('running')
    })
  })

  describe('cancelTask', () => {
    it('cancels task', async () => {
      mockPost.mockResolvedValue({ task_id: 'tvc_1', status: 'cancelled' })

      const result = await tvcApi.cancelTask('tvc_1')

      expect(mockPost).toHaveBeenCalledWith('/v2/tvc-tasks/tvc_1/cancel')
      expect(result.status).toBe('cancelled')
    })
  })
})
