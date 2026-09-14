/**
 * Unified fetch mock factory for tests.
 *
 * Usage:
 *   import { mockFetchResponse, mockFetchError, mockFetchSequence } from '@/test/mock-fetch'
 *
 *   mockFetchResponse({ data: [1, 2, 3] })           // 200 OK
 *   mockFetchResponse(null, { status: 201 })          // 201 Created
 *   mockFetchError(500, 'Server Error')               // 500
 *   mockFetchSequence([                               // Sequential responses
 *     { body: { token: 'abc' } },
 *     { body: { user: {} } },
 *   ])
 */
import { vi } from 'vitest'

type MockResponse = {
  body?: unknown
  status?: number
  headers?: Record<string, string>
  delay?: number
}

export function mockFetchResponse(body: unknown = null, opts: MockResponse = {}) {
  const { status = 200, headers = {}, delay = 0 } = opts
  const json = JSON.stringify(body)
  ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    if (delay) await new Promise(r => setTimeout(r, delay))
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: async () => JSON.parse(json),
      text: async () => json,
      blob: async () => new Blob([json]),
    } as Response
  })
}

export function mockFetchError(status: number, message: string) {
  ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status,
    headers: new Headers(),
    json: async () => ({ detail: message }),
    text: async () => message,
  } as Response)
}

export function mockFetchErrorReject(error: Error) {
  ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(error)
}

export function mockFetchSequence(responses: MockResponse[]) {
  const queue = [...responses]
  ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    const next = queue.shift()
    if (!next) throw new Error('No more mock responses in queue')
    const { body = null, status = 200, headers = {}, delay = 0 } = next
    if (delay) await new Promise(r => setTimeout(r, delay))
    const json = JSON.stringify(body)
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: async () => JSON.parse(json),
      text: async () => json,
    } as Response
  })
}

/** Get the last fetch call URL */
export function lastFetchUrl(): string {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string
}

/** Get all fetch call URLs */
export function fetchCallUrls(): string[] {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0] as string)
}
