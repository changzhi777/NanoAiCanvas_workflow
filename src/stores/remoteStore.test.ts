import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSyncStore, useAuthStore, useAssetLibStore } from '@/stores/remoteStore'

// Mock syncEngine before import
vi.mock('@/lib/sync/SyncEngine', () => ({
  syncEngine: {
    subscribe: vi.fn(),
    setToken: vi.fn(),
    startAutoSync: vi.fn(),
  },
}))

import { syncEngine } from '@/lib/sync/SyncEngine'

describe('remoteStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ===== SyncStore =====
  describe('useSyncStore', () => {
    beforeEach(() => {
      useSyncStore.setState({
        status: 'idle',
        lastSyncAt: null,
        isOnline: true,
        pendingOps: 0,
      })
    })

    it('should have correct initial state', () => {
      const state = useSyncStore.getState()
      expect(state.status).toBe('idle')
      expect(state.lastSyncAt).toBeNull()
      expect(state.pendingOps).toBe(0)
    })

    it('should set sync status', () => {
      useSyncStore.getState().setStatus('syncing')
      expect(useSyncStore.getState().status).toBe('syncing')
    })

    it('should set lastSyncAt', () => {
      useSyncStore.getState().setLastSyncAt('2026-06-08T00:00:00Z')
      expect(useSyncStore.getState().lastSyncAt).toBe('2026-06-08T00:00:00Z')
    })

    it('should set online status', () => {
      useSyncStore.getState().setOnline(false)
      expect(useSyncStore.getState().isOnline).toBe(false)
    })

    it('should set pending operations count', () => {
      useSyncStore.getState().setPendingOps(5)
      expect(useSyncStore.getState().pendingOps).toBe(5)
    })

    it('should call syncEngine.subscribe on init', () => {
      useSyncStore.getState().init()
      expect(syncEngine.subscribe).toHaveBeenCalled()
    })
  })

  // ===== AuthStore =====
  describe('useAuthStore', () => {
    beforeEach(() => {
      useAuthStore.setState({
        token: null,
        refreshToken: null,
        user: null,
        isHydrated: true,
      })
    })

    it('should set and persist token', () => {
      useAuthStore.getState().setToken('jwt-token-123', 'refresh-456')

      const state = useAuthStore.getState()
      expect(state.token).toBe('jwt-token-123')
      expect(state.refreshToken).toBe('refresh-456')
      expect(localStorage.getItem('nanoai_token')).toBe('jwt-token-123')
      expect(localStorage.getItem('nanoai_refresh_token')).toBe('refresh-456')
    })

    it('should clear tokens when set to null', () => {
      useAuthStore.getState().setToken('jwt-token-123')
      useAuthStore.getState().setToken(null)

      expect(useAuthStore.getState().token).toBeNull()
      expect(localStorage.getItem('nanoai_token')).toBeNull()
    })

    it('should set and persist user', () => {
      const mockUser = { id: '1', username: 'test', email: 'test@example.com' }
      useAuthStore.getState().setUser(mockUser)

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(localStorage.getItem('nanoai_user')).toBeTruthy()
    })

    it('should clear user when set to null', () => {
      useAuthStore.getState().setUser({ id: '1', username: 'test', email: 'test@example.com' })
      useAuthStore.getState().setUser(null)

      expect(useAuthStore.getState().user).toBeNull()
      expect(localStorage.getItem('nanoai_user')).toBeNull()
    })

    it('should logout and clear all auth state', async () => {
      localStorage.setItem('nanoai_token', 'jwt-token')
      localStorage.setItem('nanoai_refresh_token', 'refresh')
      localStorage.setItem('nanoai_user', JSON.stringify({ id: '1', username: 'test', email: 'a@b.com' }))
      useAuthStore.setState({
        token: 'jwt-token',
        refreshToken: 'refresh',
        user: { id: '1', username: 'test', email: 'a@b.com' },
      })

      // The logout uses dynamic import of client.ts, which will fail in test.
      // The catch block handles this gracefully.
      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isHydrated).toBe(false)
    })

    it('should set hydrated state', () => {
      useAuthStore.getState().setHydrated(false)
      expect(useAuthStore.getState().isHydrated).toBe(false)
    })
  })

  // ===== AssetLibStore =====
  describe('useAssetLibStore', () => {
    it('should have empty initial state', () => {
      const state = useAssetLibStore.getState()
      expect(state.categories).toEqual([])
      expect(state.folders).toEqual([])
      expect(state.tags).toEqual([])
    })

    it('should set categories', () => {
      const cats = [{ id: '1', name: '角色', is_system: true }]
      useAssetLibStore.getState().setCategories(cats)
      expect(useAssetLibStore.getState().categories).toEqual(cats)
    })

    it('should set folders', () => {
      const folders = [{ id: 'f1', name: '项目A', parent_id: null }]
      useAssetLibStore.getState().setFolders(folders)
      expect(useAssetLibStore.getState().folders).toEqual(folders)
    })

    it('should set tags', () => {
      useAssetLibStore.getState().setTags(['角色', '场景'])
      expect(useAssetLibStore.getState().tags).toEqual(['角色', '场景'])
    })
  })
})
