import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock configs before imports
vi.mock('@/config/kimi', () => ({
  KIMI_CONFIG: {
    API_BASE_URL: 'http://localhost:8002/kimi',
    API_KEY: 'test-kimi-key',
    MODELS: { TEXT: 'moonshot-v1', LONGCONTEXT: 'moonshot-v1-128k' },
  },
}))

vi.mock('@/config/qwen', () => ({
  QWEN_CONFIG: {
    API_BASE_URL: 'http://localhost:8002/qwen',
    API_KEY: 'test-qwen-key',
    MODELS: { TEXT: 'qwen-turbo', CODING: 'qwen-coder' },
  },
}))

vi.mock('@/lib/api/model-routing', () => ({
  getModelCode: vi.fn((_cat: string, fallback: string) => fallback),
}))

import { kimiApi } from '@/lib/api/kimi-api'
import { qwenApi } from '@/lib/api/qwen-api'

describe('kimi-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should generate text via Kimi', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        msg: 'success',
        data: { choices: [{ message: { content: 'Generated text' } }] },
      }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    const result = await kimiApi.generateText({
      messages: [{ role: 'user', content: 'Hello' }],
    })

    expect(result).toBe('Generated text')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/text/chatcompletion'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should process long context via Kimi', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        msg: 'success',
        data: { choices: [{ message: { content: 'Summary of long doc' } }] },
      }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    const result = await kimiApi.processLongContext({
      document: 'Very long document text...',
      query: 'Summarize this',
    })

    expect(result).toBe('Summary of long doc')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/text/longcontext'),
      expect.anything()
    )
  })

  it('should throw on non-zero code', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ code: 500, msg: 'Rate limit', data: { choices: [] } }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    await expect(
      kimiApi.generateText({ messages: [{ role: 'user', content: 'Hi' }] })
    ).rejects.toThrow('Kimi文本生成失败')
  })

  it('should throw on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' } as any)

    await expect(
      kimiApi.generateText({ messages: [{ role: 'user', content: 'Hi' }] })
    ).rejects.toThrow('Kimi API请求失败')
  })
})

describe('qwen-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should generate text via Qwen', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        msg: 'success',
        data: { choices: [{ message: { content: 'Qwen response' } }] },
      }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    const result = await qwenApi.generateText({
      messages: [{ role: 'user', content: 'Hello' }],
    })

    expect(result).toBe('Qwen response')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/text/chatcompletion'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should generate code via Qwen', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        msg: 'success',
        data: { choices: [{ message: { content: 'function hello() {}' } }] },
      }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    const result = await qwenApi.generateCode({
      messages: [{ role: 'user', content: 'Write a hello function' }],
    })

    expect(result).toBe('function hello() {}')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/code/generation'),
      expect.anything()
    )
  })

  it('should throw on non-zero code', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ code: 400, msg: 'Bad request', data: { choices: [] } }),
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    await expect(
      qwenApi.generateText({ messages: [{ role: 'user', content: '' }] })
    ).rejects.toThrow('通义千问文本生成失败')
  })
})
