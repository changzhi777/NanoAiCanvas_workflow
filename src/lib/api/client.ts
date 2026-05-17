const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface RequestOptions extends RequestInit {
  token?: string;
  apiKey?: string;  // API Key for image generation routes
}

// API Key storage for image generation
const API_KEY_STORAGE_KEY = 'nanoai_api_key'

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

export function removeApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

// Auth error types for better error messaging
export type AuthErrorType = 'invalid_credentials' | 'user_not_found' | 'account_disabled' | 'rate_limited' | 'network_error' | 'server_error'

function parseAuthError(status: number, detail: string): AuthErrorType {
  if (status === 429) return 'rate_limited'
  if (status === 401) {
    const lowerDetail = detail.toLowerCase()
    if (lowerDetail.includes('invalid') || lowerDetail.includes('wrong') || lowerDetail.includes('密码')) return 'invalid_credentials'
    if (lowerDetail.includes('not found') || lowerDetail.includes('不存在') || lowerDetail.includes('用户')) return 'user_not_found'
    if (lowerDetail.includes('disabled') || lowerDetail.includes('禁用') || lowerDetail.includes('冻结')) return 'account_disabled'
    return 'invalid_credentials'
  }
  if (status >= 500) return 'server_error'
  return 'network_error'
}

export type ErrorSeverity = 'network' | 'server' | 'client' | 'auth'

export interface ApiErrorDetail {
  status: number
  message: string
  severity: ErrorSeverity
  retryable: boolean
  errorType?: AuthErrorType
}

type GlobalErrorHandler = (error: ApiErrorDetail) => void
let globalErrorHandler: GlobalErrorHandler | null = null

export function setGlobalErrorHandler(handler: GlobalErrorHandler) {
  globalErrorHandler = handler
}

class ApiError extends Error {
  public readonly severity: ErrorSeverity
  public readonly retryable: boolean
  public readonly errorType?: AuthErrorType

  constructor(public status: number, message: string, errorType?: AuthErrorType) {
    super(message)
    this.name = 'ApiError'
    this.errorType = errorType
    this.severity = status === 0 ? 'network' : status === 401 || status === 403 ? 'auth' : status >= 500 ? 'server' : 'client'
    this.retryable = status === 0 || status >= 500
  }

  toDetail(): ApiErrorDetail {
    return { status: this.status, message: this.message, severity: this.severity, retryable: this.retryable, errorType: this.errorType }
  }
}

const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 500

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Token auto-refresh
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const storedRefreshToken = localStorage.getItem('nanoai_refresh_token')
    if (!storedRefreshToken) return false

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefreshToken }),
      })
      if (!res.ok) return false

      const data = await res.json()
      localStorage.setItem('nanoai_token', data.access_token)
      localStorage.setItem('nanoai_refresh_token', data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token: explicitToken, apiKey, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = explicitToken || (typeof window !== 'undefined' ? localStorage.getItem('nanoai_token') : null);
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const effectiveApiKey = apiKey || getApiKey()
  if (effectiveApiKey) {
    (headers as Record<string, string>)['X-API-Key'] = effectiveApiKey;
  }

  let lastError: ApiError | null = null
  const method = fetchOptions.method?.toUpperCase() ?? 'GET'
  const shouldRetry = method === 'GET' || method === 'HEAD'

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        const errorType = parseAuthError(response.status, error.detail || '');
        const apiError = new ApiError(response.status, error.detail || 'Request failed', errorType);

        // Auto-refresh on 401 for authenticated requests
        if (response.status === 401 && token && !endpoint.startsWith('/auth/')) {
          const refreshed = await tryRefreshToken()
          if (refreshed) {
            const newToken = localStorage.getItem('nanoai_token')
            if (newToken) {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
              continue
            }
          }
        }

        if (!apiError.retryable || !shouldRetry || attempt === MAX_RETRIES) {
          globalErrorHandler?.(apiError.toDetail())
          throw apiError
        }

        lastError = apiError
      } else {
        return response.json();
      }
    } catch (err) {
      if (err instanceof ApiError) throw err

      const apiError = new ApiError(0, (err as Error).message || 'Network error')
      if (attempt === MAX_RETRIES) {
        globalErrorHandler?.(apiError.toDetail())
        throw apiError
      }
      lastError = apiError
    }

    const delay = RETRY_BASE_DELAY * Math.pow(2, attempt)
    await sleep(delay)
  }

  throw lastError!
}

// Generic request methods for API calls
export const client = {
  async get<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, { token })
  },

  async post<T>(endpoint: string, data?: unknown, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      token,
    })
  },

  async put<T>(endpoint: string, data?: unknown, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      token,
    })
  },

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', token })
  },
}

// Auth API
export const auth = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ access_token: string; refresh_token: string; remember_me?: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string, remember_me: boolean = false) =>
    request<{
      access_token: string;
      refresh_token: string;
      remember_me?: boolean;
      user: {
        id: string;
        username: string;
        email: string;
        is_verified: boolean;
        created_at: string;
        status: string;
        role: string;
        api_key?: string;
        avatar_url?: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password, remember_me }),
    }),

  refresh: (refreshToken: string) =>
    request<{ access_token: string; refresh_token: string; remember_me?: boolean }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  me: (token: string) =>
    request<{
      id: string;
      username: string;
      email: string;
      is_verified: boolean;
      created_at: string;
      status: string;
      role: string;
      imageApiKey?: string;
      textApiKey?: string;
      api_key?: string;
    }>('/auth/me', { token }),

  updateMe: (token: string, data: { username?: string }) =>
    request<{
      id: string;
      username: string;
      email: string;
      is_verified: boolean;
      created_at: string;
    }>('/auth/me', { method: 'PUT', token, body: JSON.stringify(data) }),

  logout: (token: string) =>
    request<{ message: string }>('/auth/logout', { method: 'POST', token }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};

// Assets API
export interface Asset {
  id: string;
  type: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  metadata: Record<string, any>;
  category?: string;
  folder_id?: string;
  tags: string[];
  is_starred: boolean;
  workflow_snapshot?: any;
  version?: string;
  source_node_id?: string;
  workflow_id?: string;
  parent_asset_id?: string;
  created_at: string;
}

export interface AssetCreate {
  type: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
  category?: string;
  tags?: string[];
  workflow_snapshot?: any;
  version?: string;
  source_node_id?: string;
  workflow_id?: string;
}

export const assets = {
  create: (data: AssetCreate, token: string) =>
    request<Asset>('/assets', { method: 'POST', body: JSON.stringify(data), token }),

  list: (
    token: string,
    params?: {
      page?: number;
      page_size?: number;
      type_filter?: string;
      category?: string;
      starred?: boolean;
      search?: string;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.type_filter) searchParams.set('type_filter', params.type_filter);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.starred !== undefined) searchParams.set('starred', String(params.starred));
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return request<{ items: Asset[]; total: number; page: number; page_size: number }>(
      `/assets${query ? `?${query}` : ''}`,
      { token }
    );
  },

  get: (id: string, token: string) => request<Asset>(`/assets/${id}`, { token }),

  update: (id: string, data: Partial<AssetCreate>, token: string) =>
    request<Asset>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/assets/${id}`, { method: 'DELETE', token }),

  toggleStar: (id: string, token: string) =>
    request<{ is_starred: boolean }>(`/assets/${id}/star`, { method: 'POST', token }),

  batchDelete: (ids: string[], token: string) =>
    request<{ deleted_count: number }>('/assets/batch_delete', { method: 'POST', body: JSON.stringify({ ids }), token }),

  listTeamAssets: (teamId: string, token: string, params?: { page?: number; page_size?: number; type_filter?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.page_size) sp.set('page_size', String(params.page_size));
    if (params?.type_filter) sp.set('type_filter', params.type_filter);
    const q = sp.toString();
    return request<{ items: Asset[]; total: number; page: number; page_size: number }>(
      `/assets/team/${teamId}${q ? `?${q}` : ''}`,
      { token }
    );
  },

  shareToTeam: (assetId: string, teamId: string, token: string) =>
    request<{ success: boolean }>(`/assets/${assetId}/share`, { method: 'POST', body: JSON.stringify({ team_id: teamId }), token }),

  removeFromTeam: (assetId: string, teamId: string, token: string) =>
    request<{ success: boolean }>(`/assets/${assetId}/team/${teamId}`, { method: 'DELETE', token }),

  batchUpdate: (ids: string[], data: { category?: string; tags?: string[] }, token: string) =>
    request<{ updated_count: number }>('/assets/batch_update', { method: 'POST', body: JSON.stringify({ ids, ...data }), token }),

  export: (ids: string[], token: string) => {
    return fetch(`${API_BASE_URL}/assets/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    }).then(res => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    });
  },

  import: (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ success: boolean; imported: number; errors?: string[] }>('/assets/import', {
      method: 'POST',
      body: formData as unknown as string,
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },
};

// Categories API (自定义分类)
export interface Category {
  id: string;
  user_id: string;
  team_id?: string;
  name: string;
  icon?: string;
  color?: string;
  is_system: boolean;
  created_at: string;
}

export const categories = {
  list: (token: string, teamId?: string) =>
    request<Category[]>(`/categories${teamId ? `?team_id=${teamId}` : ''}`, { token }),

  create: (data: { name: string; icon?: string; color?: string; team_id?: string }, token: string) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: { name?: string; icon?: string; color?: string }, token: string) =>
    request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE', token }),

  checkName: (name: string, teamId?: string, token?: string) =>
    request<{ exists: boolean; name: string }>(`/categories/check/${name}?${teamId ? `team_id=${teamId}` : ''}`, { token }),
};

// Tags API
export const tags = {
  list: (token: string) =>
    request<string[]>('/tags', { token }),

  create: (name: string, token: string) =>
    request<{ name: string }>('/tags', { method: 'POST', body: JSON.stringify({ name }), token }),

  delete: (name: string, token: string) =>
    request<{ message: string }>('/tags', { method: 'DELETE', body: JSON.stringify({ name }), token }),
};

// Folders API (文件夹管理 - 使用 parent_id 实现层级)
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export const folders = {
  list: (token: string) =>
    request<Folder[]>('/folders', { token }),

  create: (name: string, parentId: string | null, token: string) =>
    request<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name, parent_id: parentId }), token }),

  update: (id: string, name: string, token: string) =>
    request<Folder>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }), token }),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/folders/${id}`, { method: 'DELETE', token }),
};

// Teams API
export interface Team {
  id: string;
  name: string;
  owner_id: string;
  admin_id?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  can_edit: boolean;
  joined_at: string;
}

export const teams = {
  list: (token: string) =>
    request<Team[]>('/teams', { token }),

  create: (data: { name: string }, token: string) =>
    request<Team>('/teams', { method: 'POST', body: JSON.stringify(data), token }),

  get: (id: string, token: string) =>
    request<Team>(`/teams/${id}`, { token }),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/teams/${id}`, { method: 'DELETE', token }),

  leave: (id: string, token: string) =>
    request<{ message: string; new_owner_id?: string; action?: string }>(`/teams/${id}/leave`, { method: 'DELETE', token }),

  listMembers: (id: string, token: string) =>
    request<TeamMember[]>(`/teams/${id}/members`, { token }),

  addMember: (id: string, data: { user_id: string; role?: string; can_edit?: boolean }, token: string) =>
    request<TeamMember>(`/teams/${id}/members`, { method: 'POST', body: JSON.stringify(data), token }),

  updateMember: (teamId: string, userId: string, data: { role?: string; can_edit?: boolean }, token: string) =>
    request<TeamMember>(`/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  removeMember: (teamId: string, userId: string, token: string) =>
    request<{ message: string }>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE', token }),
};

// Sync API
export interface Operation {
  id?: string;
  workflow_id: string;
  device_id: string;
  op_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  timestamp: string;
}

export const sync = {
  push: (
    operations: Operation[],
    deviceId: string,
    token: string
  ) =>
    request<{ synced_count: number; conflicts: any[] }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ operations, device_id: deviceId }),
      token,
    }),

  pull: (workflowId: string, deviceId: string, token: string, since?: string) =>
    request<{ operations: Operation[]; server_time: string }>('/sync/pull', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: workflowId, device_id: deviceId, since }),
      token,
    }),
};

// Workflows API
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  data: any;
  version: number;
  cover_asset_id?: string;
  created_at: string;
  updated_at: string;
}

export const workflows = {
  create: (data: { name: string; description?: string; data?: any }, token: string) =>
    request<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(data), token }),

  list: (token: string, params?: { page?: number; page_size?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    const query = searchParams.toString();
    return request<{ items: Workflow[]; total: number; page: number; page_size: number }>(
      `/workflows${query ? `?${query}` : ''}`,
      { token }
    );
  },

  get: (id: string, token: string) => request<Workflow>(`/workflows/${id}`, { token }),

  update: (id: string, data: Partial<Workflow>, token: string) =>
    request<Workflow>(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/workflows/${id}`, { method: 'DELETE', token }),
};

// Notifications API
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export const notifications = {
  list: (token: string, limit = 30) =>
    request<NotificationItem[]>(`/notifications?limit=${limit}`, { token }),

  unreadCount: (token: string) =>
    request<{ count: number }>('/notifications/unread-count', { token }),

  markRead: (id: string, token: string) =>
    request<{ success: boolean }>(`/notifications/read/${id}`, { method: 'POST', token }),

  markAllRead: (token: string) =>
    request<{ success: boolean }>('/notifications/read-all', { method: 'POST', token }),
};

export { ApiError };
export { API_BASE_URL };