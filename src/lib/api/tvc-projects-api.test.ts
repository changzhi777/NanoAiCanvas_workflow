import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import { tvcProjectsApi } from '@/lib/api/tvc-projects-api'

describe('tvc-projects-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should GET projects list with params', async () => {
      mockFetchResponse({
        total: 2,
        items: [
          { id: 'p1', name: 'Project A', status: 'draft', shot_count: 5, original_text: '', created_at: '', updated_at: '' },
          { id: 'p2', name: 'Project B', status: 'completed', shot_count: 8, original_text: '', created_at: '', updated_at: '' },
        ],
      })

      const result = await tvcProjectsApi.list({ status: 'draft', limit: 10 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(lastFetchUrl()).toContain('status=draft')
      expect(lastFetchUrl()).toContain('limit=10')
    })
  })

  describe('create', () => {
    it('should POST to create project', async () => {
      mockFetchResponse({ id: 'p1', status: 'draft' })

      const result = await tvcProjectsApi.create({
        name: 'Test Project',
        original_text: 'Test ad copy',
      })

      expect(result.id).toBe('p1')
      expect(lastFetchUrl()).toContain('/api/v2/tvc-projects')
    })
  })

  describe('get', () => {
    it('should GET project by id', async () => {
      mockFetchResponse({
        id: 'p1', name: 'Test', original_text: '', status: 'draft',
        shots: [], created_at: '', updated_at: '',
      })

      const result = await tvcProjectsApi.get('p1')

      expect(result.id).toBe('p1')
      expect(lastFetchUrl()).toContain('/api/v2/tvc-projects/p1')
    })
  })

  describe('update', () => {
    it('should PUT to update project', async () => {
      mockFetchResponse({ id: 'p1', status: 'processing' })

      const result = await tvcProjectsApi.update('p1', { status: 'processing' })

      expect(result.status).toBe('processing')
    })
  })

  describe('delete', () => {
    it('should DELETE project', async () => {
      mockFetchResponse({ status: 'deleted' })

      const result = await tvcProjectsApi.delete('p1')

      expect(result.status).toBe('deleted')
    })
  })

  describe('upsertShots', () => {
    it('should POST shots to project', async () => {
      mockFetchResponse({ created: 3, updated: 0 })

      const result = await tvcProjectsApi.upsertShots('p1', [
        { shot_index: 1, scene_number: 1, scene_description: 'Opening', status: 'pending' },
      ] as any)

      expect(result.created).toBe(3)
    })
  })

  describe('updateShot', () => {
    it('should PUT shot update', async () => {
      mockFetchResponse({ id: 's1', status: 'completed' })

      const result = await tvcProjectsApi.updateShot('p1', 's1', { status: 'completed' })

      expect(result.status).toBe('completed')
      expect(lastFetchUrl()).toContain('/shots/s1')
    })
  })

  describe('linkTaskResult', () => {
    it('should POST to link task result', async () => {
      mockFetchResponse({ status: 'completed', project_id: 'p1' })

      const result = await tvcProjectsApi.linkTaskResult('p1', {
        task_id: 'task-1',
        status: 'completed',
      })

      expect(result.project_id).toBe('p1')
      expect(lastFetchUrl()).toContain('/link-task')
    })
  })

  describe('importToTeam', () => {
    it('should POST to import assets to team', async () => {
      mockFetchResponse({ imported: 3, skipped: 1 })

      const result = await tvcProjectsApi.importToTeam(1, ['a1', 'a2', 'a3', 'a4'])

      expect(result.imported).toBe(3)
      expect(result.skipped).toBe(1)
    })
  })
})
