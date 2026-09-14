import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'

// ===== assets-api =====
import { getAssetsApi, getSharedAssetsApi, getAssetApi, createAssetApi, updateAssetApi, deleteAssetApi } from '@/lib/api/assets'

// ===== gpt-image-api =====
import { gptImageApi } from '@/lib/api/gpt-image-api'

// ===== nanobanana-pro =====
import { createNanoBananaAPI, createNanoBananaProAPI } from '@/lib/api/nanobanana-pro'

// ===== nanobanana2 =====
import { createNanoBanana2API } from '@/lib/api/nanobanana2'

describe('assets-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should GET assets', async () => {
    mockFetchResponse({ success: true, assets: [{ id: 'a1' }] })
    const result = await getAssetsApi()
    expect(result.success).toBe(true)
  })

  it('should GET shared assets with params', async () => {
    mockFetchResponse({ success: true, assets: [], total: 0 })
    const result = await getSharedAssetsApi({ limit: 10, offset: 0, style: 'comic' })
    expect(result.success).toBe(true)
  })

  it('should GET single asset', async () => {
    mockFetchResponse({ success: true, asset: { id: 'a1' } })
    const result = await getAssetApi('a1')
    expect(result.asset?.id).toBe('a1')
  })

  it('should POST to create asset', async () => {
    mockFetchResponse({ success: true, asset: { id: 'a2' } })
    const result = await createAssetApi({ title: 'Test' })
    expect(result.success).toBe(true)
  })

  it('should PUT to update asset', async () => {
    mockFetchResponse({ success: true, asset: { id: 'a1', title: 'Updated' } })
    const result = await updateAssetApi('a1', { title: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('should DELETE asset', async () => {
    mockFetchResponse({ success: true })
    const result = await deleteAssetApi('a1')
    expect(result.success).toBe(true)
  })
})

describe('gpt-image-api', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('generateImage', () => {
    it('should POST to generate and return task_id', async () => {
      mockFetchResponse({ task_id: 'img-task-1', status: 'pending' })

      const taskId = await gptImageApi.generateImage({
        prompt: 'A beautiful landscape',
        size: '1024x1024',
      })

      expect(taskId).toBe('img-task-1')
      expect(lastFetchUrl()).toContain('/v2/image/gpt2/generate')
    })
  })

  describe('getTaskStatus', () => {
    it('should GET task status', async () => {
      mockFetchResponse({
        task_id: 't1',
        status: 'processing',
        message: 'Generating...',
        mode: 'text-to-image',
        created_at: '',
      })

      const result = await gptImageApi.getTaskStatus('t1')
      expect(result.status).toBe('processing')
    })

    it('should return success with images', async () => {
      mockFetchResponse({
        task_id: 't1',
        status: 'success',
        message: 'Done',
        images: ['img1.png', 'img2.png'],
        mode: 'text-to-image',
        created_at: '',
      })

      const result = await gptImageApi.getTaskStatus('t1')
      expect(result.images).toHaveLength(2)
    })
  })

  describe('cancelTask', () => {
    it('should POST to cancel task', async () => {
      mockFetchResponse({})
      await gptImageApi.cancelTask('t1')
      expect(lastFetchUrl()).toContain('/cancel')
    })
  })
})

describe('nanobanana-pro & nanobanana2', () => {
  it('should create API instance', () => {
    const api = createNanoBananaAPI('test-key')
    expect(api).toHaveProperty('generateImageWithProgress')
    expect(api.generateImageWithProgress).toBeInstanceOf(Function)
  })

  it('should create NanoBanana Pro instance', () => {
    const api = createNanoBananaProAPI('test-key')
    expect(api).toHaveProperty('generateImageWithProgress')
  })

  it('should create NanoBanana2 instance', () => {
    const api = createNanoBanana2API('test-key')
    expect(api).toHaveProperty('generateImageWithProgress')
  })

  it('should support abort signal', async () => {
    const api = createNanoBananaAPI('test-key')
    const controller = new AbortController()
    controller.abort()

    await expect(
      api.generateImageWithProgress(
        { prompt: 'test', signal: controller.signal },
        vi.fn()
      )
    ).rejects.toThrow()
  })
})
