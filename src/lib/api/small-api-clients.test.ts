import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'

// ===== users-api =====
import { getUsers, getUser, updateUser, disableUser, enableUser, deleteUser } from '@/lib/api/users-api'

// ===== prompt-restrictions =====
import { promptRestrictionsApi } from '@/lib/api/prompt-restrictions'

// ===== app-visibility-api =====
import { getAppsConfig, saveAppsConfig } from '@/lib/api/apps-api'

// ===== tasks =====
import { getTasksApi, getTaskApi, createTaskApi, updateTaskApi, deleteTaskApi } from '@/lib/api/tasks'

// ===== model-routing =====
import { loadRoutes, getRoute, getModelCode, getProviderForCategory, invalidateRoutes, getAllRoutes } from '@/lib/api/model-routing'

describe('users-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should GET users with pagination', async () => {
    mockFetchResponse({ users: [{ user_id: 'u1', username: 'test' }], total: 1 })
    const result = await getUsers(1, 20, 'test')
    expect(result.users).toHaveLength(1)
    expect(lastFetchUrl()).toContain('search=test')
  })

  it('should GET user detail', async () => {
    mockFetchResponse({ user_id: 'u1', username: 'test', email: 'a@b.com', is_active: true, is_verified: true, created_at: '', balance: 100, total_granted: 200, total_used: 100 })
    const result = await getUser('u1')
    expect(result.user_id).toBe('u1')
  })

  it('should PUT to update user', async () => {
    mockFetchResponse({ success: true, message: 'Updated' })
    const result = await updateUser('u1', { username: 'new' })
    expect(result.success).toBe(true)
  })

  it('should POST to disable user', async () => {
    mockFetchResponse({ success: true, message: 'Disabled' })
    const result = await disableUser('u1')
    expect(result.success).toBe(true)
  })

  it('should POST to enable user', async () => {
    mockFetchResponse({ success: true, message: 'Enabled' })
    const result = await enableUser('u1')
    expect(result.success).toBe(true)
  })

  it('should DELETE user', async () => {
    mockFetchResponse({ success: true, message: 'Deleted' })
    const result = await deleteUser('u1')
    expect(result.success).toBe(true)
  })
})

describe('prompt-restrictions-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should GET categories', async () => {
    mockFetchResponse([{ id: 1, name: '暴力', description: null, is_active: 1, word_count: 5 }])
    const result = await promptRestrictionsApi.getCategories()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('暴力')
  })

  it('should GET words with optional category filter', async () => {
    mockFetchResponse([{ id: 1, category_id: 1, word: 'bad', alternative: 'good', severity: 1, is_active: 1 }])
    const result = await promptRestrictionsApi.getWords(1)
    expect(lastFetchUrl()).toContain('category_id=1')
    expect(result[0].word).toBe('bad')
  })

  it('should POST to check prompt', async () => {
    mockFetchResponse({ is_safe: false, violations: [{ word: 'bad', alternative: 'good', severity: 1, message: 'Mild' }] })
    const result = await promptRestrictionsApi.checkPrompt('some bad text')
    expect(result.is_safe).toBe(false)
    expect(result.violations).toHaveLength(1)
  })

  it('should POST to create category', async () => {
    mockFetchResponse({ id: 2, name: 'New Cat', description: '', is_active: 1, word_count: 0 })
    const result = await promptRestrictionsApi.createCategory({ name: 'New Cat' })
    expect(result.name).toBe('New Cat')
  })

  it('should POST to create word', async () => {
    mockFetchResponse({ id: 10, category_id: 1, word: 'test', alternative: null, severity: 1, is_active: 1 })
    const result = await promptRestrictionsApi.createWord({ category_id: 1, word: 'test' })
    expect(result.word).toBe('test')
  })

  it('should DELETE word', async () => {
    mockFetchResponse(null)
    await expect(promptRestrictionsApi.deleteWord(1)).resolves.toBeNull()
  })

  it('should DELETE category', async () => {
    mockFetchResponse(null)
    await expect(promptRestrictionsApi.deleteCategory(1)).resolves.toBeNull()
  })
})

describe('tasks-api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should GET tasks', async () => {
    mockFetchResponse({ success: true, tasks: [{ id: 't1' }], total: 1 })
    const result = await getTasksApi()
    expect(result.success).toBe(true)
  })

  it('should GET single task', async () => {
    mockFetchResponse({ success: true, task: { id: 't1' } })
    const result = await getTaskApi('t1')
    expect(result.task?.id).toBe('t1')
  })

  it('should POST to create task', async () => {
    mockFetchResponse({ success: true, task: { id: 't1' } })
    const result = await createTaskApi({ inputText: 'test' })
    expect(result.success).toBe(true)
  })

  it('should PUT to update task', async () => {
    mockFetchResponse({ success: true, task: { id: 't1', status: 'running' } })
    const result = await updateTaskApi('t1', { status: 'running' })
    expect(result.success).toBe(true)
  })

  it('should DELETE task', async () => {
    mockFetchResponse({ success: true })
    const result = await deleteTaskApi('t1')
    expect(result.success).toBe(true)
  })
})

describe('model-routing', () => {
  beforeEach(() => {
    invalidateRoutes()
    vi.clearAllMocks()
  })

  it('should load and cache routes', async () => {
    mockFetchResponse({
      text_gen: { model_code: 'glm-4', model_type: 'text', provider_code: 'zhipu', api_base_url: null },
    })

    const routes = await loadRoutes()
    expect(routes.text_gen.model_code).toBe('glm-4')
  })

  it('should get route by category', async () => {
    mockFetchResponse({
      image_gen: { model_code: 'nano-banana-2', model_type: 'image', provider_code: 'wuyinkeji', api_base_url: null },
    })

    await loadRoutes()
    const route = getRoute('image_gen')
    expect(route?.model_code).toBe('nano-banana-2')
  })

  it('should return null for unknown category', () => {
    expect(getRoute('nonexistent')).toBeNull()
  })

  it('should get model code with fallback', async () => {
    mockFetchResponse({})
    await loadRoutes()

    expect(getModelCode('unknown', 'fallback-model')).toBe('fallback-model')
  })

  it('should get provider for category', async () => {
    mockFetchResponse({
      tts: { model_code: 'glm-tts', model_type: 'audio', provider_code: 'zhipu', api_base_url: null },
    })

    await loadRoutes()
    expect(getProviderForCategory('tts')).toBe('zhipu')
  })

  it('should invalidate routes cache', async () => {
    mockFetchResponse({ cat1: { model_code: 'm1', model_type: 'text', provider_code: 'p1', api_base_url: null } })
    await loadRoutes()
    expect(getAllRoutes()).toHaveProperty('cat1')

    invalidateRoutes()
    expect(Object.keys(getAllRoutes())).toHaveLength(0)
  })
})
