import { describe, it, expect, beforeEach } from 'vitest'
import {
  useAppsConfigStore,
  getAppConfig,
  getAppEnabledModels,
  APPS_LIST,
  type AppType,
} from '@/stores/appsConfigStore'

describe('AppsConfigStore', () => {
  beforeEach(() => {
    useAppsConfigStore.getState().resetToDefault()
  })

  it('should have correct initial apps count', () => {
    const { apps } = useAppsConfigStore.getState()
    expect(apps).toHaveLength(APPS_LIST.length)
    expect(APPS_LIST.length).toBeGreaterThanOrEqual(7)
  })

  it('should have all apps enabled by default', () => {
    const { apps } = useAppsConfigStore.getState()
    apps.forEach((app) => {
      expect(app.enabled).toBe(true)
    })
  })

  it('should have all apps with empty models by default', () => {
    const { apps } = useAppsConfigStore.getState()
    apps.forEach((app) => {
      expect(app.models).toEqual([])
    })
  })

  it('should set app models', () => {
    useAppsConfigStore.getState().setAppModels('image', ['model-a', 'model-b'])
    const app = getAppConfig('image')
    expect(app?.models).toEqual(['model-a', 'model-b'])
  })

  it('should toggle app enabled state', () => {
    const before = getAppConfig('storyboard')
    expect(before?.enabled).toBe(true)

    useAppsConfigStore.getState().toggleAppEnabled('storyboard')
    const after = getAppConfig('storyboard')
    expect(after?.enabled).toBe(false)
  })

  it('should toggle back to enabled', () => {
    useAppsConfigStore.getState().toggleAppEnabled('voice')
    useAppsConfigStore.getState().toggleAppEnabled('voice')
    expect(getAppConfig('voice')?.enabled).toBe(true)
  })

  it('should reset to default', () => {
    useAppsConfigStore.getState().toggleAppEnabled('text')
    useAppsConfigStore.getState().setAppModels('image', ['x'])

    useAppsConfigStore.getState().resetToDefault()

    const { apps } = useAppsConfigStore.getState()
    apps.forEach((app) => {
      expect(app.enabled).toBe(true)
      expect(app.models).toEqual([])
    })
    expect(useAppsConfigStore.getState().lastSynced).toBeNull()
  })

  it('should sync from server and set lastSynced', () => {
    const customApps = [
      { id: 'storyboard' as AppType, name: 'SB', description: '', icon: 'film', enabled: false, models: ['m1'] },
    ]
    useAppsConfigStore.getState().syncFromServer(customApps)

    const state = useAppsConfigStore.getState()
    expect(state.apps).toEqual(customApps)
    expect(state.lastSynced).not.toBeNull()
  })

  it('should return undefined for non-existent app config', () => {
    // @ts-expect-error testing invalid id
    expect(getAppConfig('nonexistent')).toBeUndefined()
  })

  it('getAppEnabledModels should return empty for disabled app', () => {
    useAppsConfigStore.getState().setAppModels('dialogue', ['model-x'])
    useAppsConfigStore.getState().toggleAppEnabled('dialogue')

    expect(getAppEnabledModels('dialogue')).toEqual([])
  })

  it('getAppEnabledModels should return models for enabled app', () => {
    useAppsConfigStore.getState().setAppModels('realtime', ['voice-a'])

    expect(getAppEnabledModels('realtime')).toEqual(['voice-a'])
  })
})
