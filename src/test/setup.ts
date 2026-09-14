import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock localStorage — functional implementation that actually stores values
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])),
  get length() { return Object.keys(localStorageStore).length },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
}
globalThis.localStorage = localStorageMock as any

// Mock fetch
globalThis.fetch = vi.fn()

// Mock Response
if (!globalThis.Response) {
  globalThis.Response = class Response {
    status: number
    ok: boolean
    private _body: string
    headers: Headers
    constructor(body: string, init?: ResponseInit) {
      this._body = body
      this.status = init?.status ?? 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Headers(init?.headers as Record<string, string>)
    }
    json() { return Promise.resolve(JSON.parse(this._body)) }
    text() { return Promise.resolve(this._body) }
  } as unknown as typeof Response
}

// Mock EventSource (used by SSE endpoints like TVC)
class MockEventSource {
  url: string
  readyState = 0
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  private _listeners: Map<string, EventListener[]> = new Map()

  static instances: MockEventSource[] = []
  static lastInstance: MockEventSource | null = null

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
    MockEventSource.lastInstance = this
  }
  addEventListener(type: string, listener: EventListener) {
    const list = this._listeners.get(type) ?? []
    list.push(listener)
    this._listeners.set(type, list)
  }
  removeEventListener(type: string, listener: EventListener) {
    const list = this._listeners.get(type) ?? []
    this._listeners.set(type, list.filter(l => l !== listener))
  }
  close() { this.readyState = 2 }

  // Test helpers
  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.onmessage?.(event)
    this._listeners.get(type)?.forEach(l => l(event as Event))
  }
  simulateOpen() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }
  simulateError() {
    this.onerror?.(new Event('error'))
  }

  static reset() {
    MockEventSource.instances = []
    MockEventSource.lastInstance = null
  }
}
globalThis.EventSource = MockEventSource as unknown as typeof EventSource

// Mock IntersectionObserver
globalThis.IntersectionObserver = class {
  root = null
  rootMargin = ''
  thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
} as unknown as typeof IntersectionObserver

// Mock ResizeObserver
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  MockEventSource.reset()
})
