import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, mockFetchError, mockFetchErrorReject, lastFetchUrl, fetchCallUrls } from '@/test/mock-fetch'

// Mock import.meta.env
vi.mock('import.meta', () => ({ env: { VITE_API_BASE_URL: '' } }))

// client.ts uses localStorage — already mocked in setup.ts
// client.ts uses fetch — already mocked in setup.ts

// Re-import after mocks are set up
const { ApiError, setApiKey, getApiKey, removeApiKey, setGlobalErrorHandler, parseAuthError } = await import('@/lib/api/client')

// Need to access parseAuthError — it's not exported, test via ApiError behavior
// Re-import client module
const clientModule = await import('@/lib/api/client')
const { client } = clientModule

describe('client.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ==================== API Key Management ====================

  describe('API Key management', () => {
    it('setApiKey should store key in localStorage', () => {
      setApiKey('test-key-123')
      expect(getApiKey()).toBe('test-key-123')
    })

    it('removeApiKey should clear key', () => {
      setApiKey('test-key')
      removeApiKey()
      expect(getApiKey()).toBeNull()
    })

    it('getApiKey returns null when not set', () => {
      expect(getApiKey()).toBeNull()
    })
  })

  // ==================== GET Requests ====================

  describe('client.get', () => {
    it('should make GET request and return JSON', async () => {
      mockFetchResponse({ items: [1, 2, 3] })
      const result = await client.get('/test')
      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('should include base URL prefix', async () => {
      mockFetchResponse({})
      await client.get('/api/test')
      const url = lastFetchUrl()
      expect(url).toContain('/api/test')
    })

    it('should include Authorization header when token provided', async () => {
      mockFetchResponse({})
      await client.get('/test', 'my-token')
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const opts = fetchCall[1]
      expect(opts.headers).toHaveProperty('Authorization', 'Bearer my-token')
    })
  })

  // ==================== POST Requests ====================

  describe('client.post', () => {
    it('should make POST request with JSON body', async () => {
      mockFetchResponse({ id: '123' })
      const result = await client.post('/test', { name: 'hello' })
      expect(result).toEqual({ id: '123' })

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const opts = fetchCall[1]
      expect(opts.method).toBe('POST')
      expect(opts.body).toBe(JSON.stringify({ name: 'hello' }))
    })
  })

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should throw ApiError on 4xx', async () => {
      mockFetchError(400, 'Bad Request')
      await expect(client.get('/test')).rejects.toThrow()
    })

    it('should throw ApiError on 401', async () => {
      mockFetchError(401, 'Unauthorized')
      await expect(client.get('/test')).rejects.toThrow()
    })

    it('should throw ApiError on 500', async () => {
      mockFetchError(500, 'Server Error')
      await expect(client.get('/test')).rejects.toThrow()
    })

    it('should throw on network error', async () => {
      mockFetchErrorReject(new Error('Network error'))
      await expect(client.get('/test')).rejects.toThrow('Network error')
    })
  })

  // ==================== Global Error Handler ====================

  describe('global error handler', () => {
    it('should call handler on error', async () => {
      const handler = vi.fn()
      setGlobalErrorHandler(handler)
      mockFetchError(500, 'Server Error')
      try { await client.get('/test') } catch {}
      expect(handler).toHaveBeenCalled()
      const errorDetail = handler.mock.calls[0][0]
      expect(errorDetail.status).toBe(500)
      expect(errorDetail.severity).toBe('server')
      expect(errorDetail.retryable).toBe(true)
    })

    it('should not call handler on success', async () => {
      const handler = vi.fn()
      setGlobalErrorHandler(handler)
      mockFetchResponse({ ok: true })
      await client.get('/test')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ==================== DELETE Requests ====================

  describe('client.delete', () => {
    it('should make DELETE request', async () => {
      mockFetchResponse({ message: 'deleted' })
      const result = await client.delete('/test/123')
      expect(result).toEqual({ message: 'deleted' })
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
    })
  })
})
