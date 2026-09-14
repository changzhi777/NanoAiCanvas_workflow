/**
 * TVC 项目管理 API
 *
 * 使用方法:
 *   import { tvcProjectsApi } from '@/lib/api/tvc-projects-api'
 *   const { items } = await tvcProjectsApi.list()
 *   const project = await tvcProjectsApi.get(projectId)
 */

import { client } from './client'

// ==================== 类型定义 ====================

export interface TvcProjectShot {
  id: string
  shot_index: number
  scene_number?: number
  scene_description?: string
  video_prompt?: string
  start_frame_prompt?: string
  end_frame_prompt?: string
  bgm_mood?: string
  image_url?: string
  video_url?: string
  duration?: number
  image_asset_id?: string
  video_asset_id?: string
  dialogue?: { character: string; line: string }[]
  status: 'pending' | 'generating' | 'completed' | 'failed'
}

export interface TvcProject {
  id: string
  name: string
  description?: string
  original_text: string
  script?: Record<string, any>
  composed_video_url?: string
  bgm_url?: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  task_id?: string
  team_id?: number
  shots: TvcProjectShot[]
  created_at: string
  updated_at: string
}

export interface TvcProjectListItem {
  id: string
  name: string
  description?: string
  original_text: string
  status: string
  shot_count: number
  task_id?: string
  created_at: string
  updated_at: string
}

// ==================== API ====================

export const tvcProjectsApi = {
  async list(params?: { status?: string; limit?: number; offset?: number }): Promise<{ total: number; items: TvcProjectListItem[] }> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return client.get(`/api/v2/tvc-projects?${query.toString()}`)
  },

  async create(data: { name: string; original_text: string; description?: string; team_id?: number }): Promise<{ id: string; status: string }> {
    return client.post('/api/v2/tvc-projects', data)
  },

  async get(projectId: string): Promise<TvcProject> {
    return client.get(`/api/v2/tvc-projects/${projectId}`)
  },

  async update(projectId: string, data: Partial<TvcProject>): Promise<{ id: string; status: string }> {
    return client.put(`/api/v2/tvc-projects/${projectId}`, data)
  },

  async delete(projectId: string): Promise<{ status: string }> {
    return client.delete(`/api/v2/tvc-projects/${projectId}`)
  },

  async upsertShots(projectId: string, shots: Omit<TvcProjectShot, 'id'>[]): Promise<{ created: number; updated: number }> {
    return client.post(`/api/v2/tvc-projects/${projectId}/shots`, { shots })
  },

  async updateShot(projectId: string, shotId: string, data: Partial<TvcProjectShot>): Promise<{ id: string; status: string }> {
    return client.put(`/api/v2/tvc-projects/${projectId}/shots/${shotId}`, data)
  },

  async linkTaskResult(
    projectId: string,
    data: {
      task_id?: string
      script?: Record<string, any>
      shots?: Omit<TvcProjectShot, 'id'>[]
      composed_video_url?: string
      bgm_url?: string
      status?: string
    },
  ): Promise<{ status: string; project_id: string }> {
    return client.post(`/api/v2/tvc-projects/${projectId}/link-task`, data)
  },

  // 团队资产导入
  async importToTeam(teamId: number, assetIds: string[]): Promise<{ imported: number; skipped: number }> {
    return client.post(`/api/teams/${teamId}/assets/import`, { asset_ids: assetIds })
  },
}

export default tvcProjectsApi
