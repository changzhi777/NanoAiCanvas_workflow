import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import {
  chatWithVideoAgent,
  submitComposeTask,
  getTaskStatus,
} from '@/lib/api/video-editor-api'

describe('video-editor-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chatWithVideoAgent', () => {
    it('should POST to video agent', async () => {
      mockFetchResponse({
        message: 'I will concat these videos',
        command: {
          action: 'concat',
          params: { videos: ['v1.mp4', 'v2.mp4'] },
          description: 'Concatenate 2 clips',
        },
      })

      const result = await chatWithVideoAgent({
        messages: [{ role: 'user', content: 'Merge these videos' }],
        context: { clips: ['v1.mp4', 'v2.mp4'] },
      })

      expect(result.message).toContain('concat')
      expect(result.command?.action).toBe('concat')
      expect(lastFetchUrl()).toContain('/v2/tvc-video-agent')
    })

    it('should handle response without command', async () => {
      mockFetchResponse({ message: 'Please select some clips first' })

      const result = await chatWithVideoAgent({
        messages: [{ role: 'user', content: 'Help' }],
        context: { clips: [] },
      })

      expect(result.command).toBeUndefined()
    })
  })

  describe('submitComposeTask', () => {
    it('should POST compose task', async () => {
      mockFetchResponse({ url: 'https://cdn.example.com/output.mp4', duration: 30 })

      const result = await submitComposeTask({
        video_urls: ['v1.mp4', 'v2.mp4'],
        bgm_url: 'bgm.mp3',
        bgm_volume: 0.5,
        resolution: '1080p',
      })

      expect(result.url).toContain('output.mp4')
      expect(result.duration).toBe(30)
      expect(lastFetchUrl()).toContain('/v2/tvc-tasks/compose')
    })
  })

  describe('getTaskStatus', () => {
    it('should GET task status', async () => {
      mockFetchResponse({ status: 'running', result: { progress: 50 } })

      const result = await getTaskStatus('task-1')

      expect(result.status).toBe('running')
      expect(lastFetchUrl()).toContain('/v2/tvc-tasks/task-1')
    })

    it('should handle completed status', async () => {
      mockFetchResponse({ status: 'completed', result: { url: 'done.mp4' } })

      const result = await getTaskStatus('task-2')

      expect(result.status).toBe('completed')
    })

    it('should handle failed status', async () => {
      mockFetchResponse({ status: 'failed', error: 'Timeout' })

      const result = await getTaskStatus('task-3')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Timeout')
    })
  })
})
