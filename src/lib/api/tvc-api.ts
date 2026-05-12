/**
 * TVC 视频 V1 前端 API 封装
 *
 * 使用方法:
 *   import { tvcApi } from '@/lib/api/tvc-api'
 *   const { script } = await tvcApi.generateScript({ prompt: '...', shotCount: 6 })
 *   const { analysis } = await tvcApi.analyzeProductReference({ imageUrl: '...' })
 */

import { client } from './client';

// ==================== 类型定义 ====================

export interface TvcTimeline {
  start: string;
  end: string;
  duration: number;
  transition: string;
}

export interface TvcShot {
  shot_id: number;
  timeline: TvcTimeline;
  scene_description: string;
  video_prompt: string;
  start_frame_prompt: string;
  end_frame_prompt: string;
  bgm_mood: string;
}

export interface TvcScript {
  tvc_title: string;
  total_duration: number;
  shot_duration: number;
  shot_count: number;
  shots: TvcShot[];
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

// ==================== 请求参数 ====================

export interface GenerateScriptParams {
  prompt: string;
  shotCount?: number;
  shotDuration?: number;
  totalDuration?: number;
  mode?: 'creative' | 'precise' | 'cinematic' | 'commercial';
  styleReference?: string;
  style?: string;
  model?: string;
}

export interface AnalyzeProductParams {
  imageUrl: string;
  intent?: string;
  model?: string;
}

// ==================== API 方法 ====================

export const tvcApi = {
  /**
   * 生成 TVC 结构化脚本
   */
  async generateScript(params: GenerateScriptParams): Promise<{ script: TvcScript }> {
    return client.post('/api/glm/tvc-script', {
      prompt: params.prompt,
      shot_count: params.shotCount ?? 6,
      shot_duration: params.shotDuration ?? 5,
      total_duration: params.totalDuration ?? 30,
      mode: params.mode ?? 'cinematic',
      style_reference: params.styleReference ?? null,
      style: params.style ?? 'realistic',
      model: params.model ?? 'glm-5.1',
    });
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
};

export default tvcApi;
