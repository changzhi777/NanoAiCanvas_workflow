import type { Page, Route } from '@playwright/test'

// API Mock 类型定义
export interface MockResponse<T = unknown> {
  status?: number
  body?: T
  delay?: number
}

export interface MockConfig {
  baseURL?: string
}

const DEFAULT_BASE = '/api'

// 常用 Mock 数据预设
export const mockPresets = {
  auth: {
    me: {
      id: 'mock-user-001',
      username: 'test_user',
      email: 'test@example.com',
      is_verified: true,
      created_at: '2026-01-01T00:00:00Z',
      imageApiKey: 'mock-image-key',
      textApiKey: 'mock-text-key',
    },
    login: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      remember_me: false,
    },
  },
  points: {
    balance: 1000,
    total_earned: 5000,
    total_spent: 4000,
  },
  workflows: {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  },
  assets: {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  },
  categories: [] as unknown[],
  teams: [] as unknown[],
}

type EndpointMatcher = string | RegExp

interface MockEntry {
  matcher: EndpointMatcher
  response: MockResponse
}

// Mock 管理器
export class ApiMock {
  private mocks: MockEntry[] = []
  private base: string

  constructor(config?: MockConfig) {
    this.base = config?.baseURL ?? DEFAULT_BASE
  }

  // 注册 API Mock
  on<T>(endpoint: string | RegExp, response: MockResponse<T> = {}): this {
    const matcher = typeof endpoint === 'string' ? `${this.base}${endpoint}` : endpoint
    this.mocks.push({ matcher, response })
    return this
  }

  // 批量注册常用 API
  setupDefaults(): this {
    return this
      .on('/auth/me', { body: mockPresets.auth.me })
      .on('/points/balance', { body: mockPresets.points })
      .on(/\/workflows(\?.*)?$/, { body: mockPresets.workflows })
      .on(/\/assets(\?.*)?$/, { body: mockPresets.assets })
      .on('/categories', { body: mockPresets.categories })
      .on('/teams', { body: mockPresets.teams })
  }

  // 在 Page 上激活所有 Mock
  async activate(page: Page): Promise<void> {
    for (const { matcher, response } of this.mocks) {
      await page.route(matcher, async (route: Route) => {
        if (response.delay) {
          await new Promise(r => setTimeout(r, response.delay))
        }
        await route.fulfill({
          status: response.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(response.body ?? {}),
        })
      })
    }
  }

  // 清除所有 Mock
  reset(): this {
    this.mocks = []
    return this
  }
}

// 快捷工厂函数
export function createApiMock(config?: MockConfig): ApiMock {
  return new ApiMock(config)
}
