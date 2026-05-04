const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }

  return response.json();
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
    request<{ access_token: string; refresh_token: string; remember_me?: boolean }>('/auth/login', {
      method: 'POST',
      body: new URLSearchParams({
        username: email,
        password,
        remember_me: String(remember_me),
      }).toString().replace(/\+/g, '%2B'),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      imageApiKey?: string;
      textApiKey?: string;
    }>('/auth/me', { token }),

  updateMe: (token: string, data: { username?: string }) =>
    request<{
      id: string;
      username: string;
      email: string;
      is_verified: boolean;
      created_at: string;
    }>('/auth/me', { method: 'PUT', token, body: JSON.stringify(data) }),
};

// Assets API
export interface Asset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT';
  name: string;
  url: string;
  thumbnail_url?: string;
  meta: Record<string, any>;
  category?: string;
  folder_id?: string;
  tags: string[];
  is_starred: boolean;
  workflow_snapshot?: any;
  created_at: string;
}

export interface AssetCreate {
  type: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  meta?: Record<string, any>;
  category?: string;
  tags?: string[];
  workflow_snapshot?: any;
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

export { ApiError };
export { API_BASE_URL };