/**
 * 即梦（字节AI）API 服务
 * 提供图片生成、视频生成能力
 */

import { JIMENG_CONFIG } from '@/config/jimeng';
import { getModelCode } from './model-routing';

// ==================== 类型定义 ====================

export interface JimengImageParams {
  prompt: string;
  model?: string;
  size?: string;
  aspectRatio?: string;
}

export interface JimengVideoParams {
  prompt: string;
  model?: string;
  duration?: number | string;
  resolution?: '720p' | '1080p';
}

export interface JimengAsyncResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    order_no?: string;
  };
}

export interface JimengResultResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    video_url?: string;
    image_url?: string;
    error?: string;
  };
}

// ==================== 通用请求方法 ====================

async function jimengRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { method?: string }
): Promise<T> {
  const { method = 'POST' } = options || {};

  const response = await fetch(`${JIMENG_CONFIG.API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${JIMENG_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`即梦API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== 图片生成 ====================

export async function generateImage(
  params: JimengImageParams
): Promise<string> {
  const response = await jimengRequest<{
    code: number;
    msg: string;
    data: { image_url: string };
  }>('/image/generation', {
    model: params.model || getModelCode('jimeng_image', JIMENG_CONFIG.MODELS.IMAGE),
    prompt: params.prompt,
    size: params.size || '1K',
    aspect_ratio: params.aspectRatio || '1:1',
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`即梦图片生成失败: ${response.msg}`);
  }

  return response.data.image_url;
}

// ==================== 视频生成 ====================

export async function generateVideo(
  params: JimengVideoParams
): Promise<string> {
  const durationNum = typeof params.duration === 'string' ? parseInt(params.duration, 10) : params.duration;
  const response = await jimengRequest<JimengAsyncResponse>('/video/generation', {
    model: params.model || getModelCode('jimeng_video', JIMENG_CONFIG.MODELS.VIDEO),
    prompt: params.prompt,
    duration: durationNum || 6,
    resolution: params.resolution || '1080p',
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`即梦视频生成失败: ${response.msg}`);
  }

  return response.data.id;
}

export async function getVideoResult(
  requestId: string
): Promise<JimengResultResponse['data']> {
  const response = await jimengRequest<JimengResultResponse>(
    `/video/generation_result?id=${requestId}`,
    {},
    { method: 'GET' }
  );

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`查询即梦视频结果失败: ${response.msg}`);
  }

  return response.data;
}

export async function pollVideoResult(
  requestId: string,
  maxAttempts: number = 30,
  interval: number = 3000
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await getVideoResult(requestId);

    if (result.status === 'succeeded' && result.video_url) {
      return result.video_url;
    }

    if (result.status === 'failed') {
      throw new Error(result.error || '视频生成失败');
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('视频生成超时，请稍后重试');
}

// ==================== 导出 ====================

export const jimengApi = {
  generateImage,
  generateVideo,
  getVideoResult,
  pollVideoResult,
};

export default jimengApi;