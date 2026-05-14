/**
 * TVC 视频 V1 前端 API 封装
 *
 * 使用方法:
 *   import { tvcApi } from '@/lib/api/tvc-api'
 *   const { script } = await tvcApi.generateScript({ prompt: '...', shotCount: 6 })
 *   const { analysis } = await tvcApi.analyzeProductReference({ imageUrl: '...' })
 *   const { task_id } = await tvcApi.submitTask({ prompt: '...', shotCount: 6 })
 */

import { client } from './client';

// ==================== 类型定义 ====================

export interface TvcTimeline {
  start: string;
  end: string;
  duration: number;
  transition: string;
}

export interface TvcDialogue {
  character: string;
  line: string;
}

export interface TvcCharacter {
  name: string;
  role: string;
  description: string;
  traits: string[];
}

export interface TvcScene {
  scene_number: number;
  location: string;
  time_of_day: string;
  description: string;
}

export interface TvcShot {
  shot_id: number;
  timeline: TvcTimeline;
  scene_number?: number;
  scene_description: string;
  dialogue?: TvcDialogue[];
  video_prompt: string;
  start_frame_prompt: string;
  end_frame_prompt: string;
  bgm_mood: string;
}

export interface TvcScript {
  tvc_title: string;
  logline?: string;
  total_duration: number;
  shot_duration: number;
  shot_count: number;
  characters?: TvcCharacter[];
  scenes?: TvcScene[];
  shots: TvcShot[];
  narration?: string;
  timeline_summary: {
    total_duration: number;
    shot_count: number;
    shot_duration: number;
    transitions: string[];
  };
}

export interface ProductAnalysis {
  product_name: string;
  visual_style: string;
  color_palette: string[];
  mood: string;
  lighting_style: string;
  composition: string;
  key_elements: string[];
  tvc_style_reference: string;
}

export interface TvcTaskProgress {
  task_id: string;
  status: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled';
  overall_progress: number;
  nodes: {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'success' | 'error';
    progress: number;
    subtasks?: {
      id: string;
      label: string;
      status: 'pending' | 'running' | 'success' | 'error';
      progress: number;
      result?: any;
      error?: string;
    }[];
  }[];
}

// ==================== 请求参数 ====================

export interface GenerateScriptParams {
  prompt: string;
  shotCount?: number;
  style?: string;
  modelProvider?: 'glm' | 'minimax';
  model?: string;
}

export interface AnalyzeProductParams {
  imageUrl: string;
  intent?: string;
  model?: string;
}

export interface SubmitTaskParams {
  workflowId: string;
  prompt: string;
  shotCount?: number;
  shotDuration?: number;
  totalDuration?: number;
  mode?: string;
  style?: string;
  optimizeMode?: string;
  imageModel?: string;
  videoModel?: string;
  styleReference?: string;
  referenceImage?: string;
}

export interface EstimatePointsParams {
  shotCount: number;
  includeBgm?: boolean;
}

// ==================== API 方法 ====================

export const tvcApi = {
  /**
   * 生成 TVC 结构化脚本
   */
  async generateScript(params: GenerateScriptParams): Promise<{ script: TvcScript }> {
    const endpoint = params.modelProvider === 'minimax'
      ? '/api/minimax/screenplay'
      : '/api/glm/screenplay';

    const body = params.modelProvider === 'minimax'
      ? {
          premise: params.prompt,
          shot_count: params.shotCount ?? 6,
          style: params.style ?? 'realistic',
          model: params.model || 'MiniMax-M2.7',
        }
      : {
          premise: params.prompt,
          shot_count: params.shotCount ?? 6,
          style: params.style ?? 'realistic',
        };

    const data = await client.post<{ screenplay: TvcScript }>(endpoint, body);
    return { script: data.screenplay };
  },

  /**
   * 分析产品参考图（GLM-5V-Turbo）
   */
  async analyzeProductReference(params: AnalyzeProductParams): Promise<{ analysis: ProductAnalysis }> {
    return client.post('/api/glm/product-reference', {
      image_url: params.imageUrl,
      intent: params.intent ?? 'tvc',
      model: params.model ?? 'glm-5v-turbo',
    });
  },

  /**
   * 积分预检 — 检查余额是否足够
   */
  async estimatePoints(params: EstimatePointsParams): Promise<{ total: number; balance: number; sufficient: boolean }> {
    return client.post('/points/tvc-estimate', {
      shot_count: params.shotCount,
      include_bgm: params.includeBgm ?? true,
    });
  },

  /**
   * 提交一键生成任务
   */
  async submitTask(params: SubmitTaskParams): Promise<{ task_id: string; status: string }> {
    return client.post('/v2/tvc-tasks/submit', {
      workflow_id: params.workflowId,
      prompt: params.prompt,
      shot_count: params.shotCount ?? 6,
      shot_duration: params.shotDuration ?? 5,
      total_duration: params.totalDuration ?? 30,
      mode: params.mode ?? 'cinematic',
      style: params.style ?? 'realistic',
      optimize_mode: params.optimizeMode ?? 'tvc_deep',
      execution_mode: 'auto',
      image_model: params.imageModel ?? 'jimeng',
      video_model: params.videoModel ?? 'jimeng',
      style_reference: params.styleReference,
      reference_image: params.referenceImage,
    });
  },

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<TvcTaskProgress> {
    return client.get(`/v2/tvc-tasks/${taskId}`);
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<{ task_id: string; status: string }> {
    return client.post(`/v2/tvc-tasks/${taskId}/cancel`);
  },

  /**
   * SSE 实时进度流
   */
  streamProgress(taskId: string, onProgress: (state: TvcTaskProgress) => void, onError?: (err: Error) => void): EventSource {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('nanoai_token') : '';
    const url = `${baseUrl}/v2/tvc-tasks/${taskId}/progress${token ? `?token=${token}` : ''}`;

    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data) as TvcTaskProgress;
        onProgress(state);
        if (['completed', 'failed', 'cancelled'].includes(state.status)) {
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      onError?.(new Error('SSE connection closed'));
    };

    return es;
  },
};

export default tvcApi;
