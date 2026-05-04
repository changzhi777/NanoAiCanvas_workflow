import { create } from 'zustand';
import { syncEngine, type SyncStatus } from '../lib/sync/SyncEngine';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  isOnline: boolean;
  pendingOps: number;
  setStatus: (status: SyncStatus) => void;
  setLastSyncAt: (time: string) => void;
  setOnline: (online: boolean) => void;
  setPendingOps: (count: number) => void;
  init: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncAt: null,
  isOnline: navigator.onLine,
  pendingOps: 0,

  setStatus: (status) => set({ status }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setOnline: (isOnline) => set({ isOnline }),
  setPendingOps: (pendingOps) => set({ pendingOps }),

  init: () => {
    // Subscribe to sync engine status
    syncEngine.subscribe((status, message) => {
      set({ status });
      if (message) {
        console.log(`[Sync] ${status}: ${message}`);
      }
    });

    // Listen for online/offline
    window.addEventListener('online', () => set({ isOnline: true }));
    window.addEventListener('offline', () => set({ isOnline: false }));

    // Start auto sync if online
    if (navigator.onLine) {
      syncEngine.startAutoSync();
    }
  },
}));

interface UserSettings {
  defaultSize: '1K' | '2K' | '4K'
  defaultAspectRatio: string
  theme: 'light' | 'dark' | 'system'
  textModel?: string
  imageModel?: string
  imageProvider?: string
  customProviderUrl?: string
}

interface AuthUser {
  id: string
  username: string
  email: string
  displayName?: string
  role?: 'admin' | 'user'
  credits?: number
  groupId?: string
  groupName?: string
  imageApiKey?: string
  textApiKey?: string
  avatarUrl?: string
  createdAt?: string
  settings?: UserSettings
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setToken: (token: string | null, refreshToken?: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('nanoai_token'),
  refreshToken: localStorage.getItem('nanoai_refresh_token'),
  user: JSON.parse(localStorage.getItem('nanoai_user') || 'null'),
  isHydrated: true,

  setToken: (token, refreshToken) => {
    if (token) {
      localStorage.setItem('nanoai_token', token);
      syncEngine.setToken(token);
    } else {
      localStorage.removeItem('nanoai_token');
      localStorage.removeItem('nanoai_refresh_token');
    }
    if (refreshToken) {
      localStorage.setItem('nanoai_refresh_token', refreshToken);
    }
    set({ token, refreshToken: refreshToken || null });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('nanoai_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nanoai_user');
    }
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('nanoai_token');
    localStorage.removeItem('nanoai_refresh_token');
    localStorage.removeItem('nanoai_user');
    set({ token: null, refreshToken: null, user: null, isHydrated: false });
  },

  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
}));

// Asset Library State (folders, categories, tags)
interface AssetLibState {
  categories: { id: string; name: string; is_system: boolean }[];
  folders: { id: string; name: string; parent_id: string | null }[];
  tags: string[];
  setCategories: (categories: AssetLibState['categories']) => void;
  setFolders: (folders: AssetLibState['folders']) => void;
  setTags: (tags: string[]) => void;
}

export const useAssetLibStore = create<AssetLibState>((set) => ({
  categories: [],
  folders: [],
  tags: [],

  setCategories: (categories) => set({ categories }),
  setFolders: (folders) => set({ folders }),
  setTags: (tags) => set({ tags }),
}));