/**
 * 智谱 GLM API 服务
 * 提供文本生成、视频生成、TTS语音合成、多模态能力
 */

import { GLM_CONFIG } from '@/config/glm';
import { getModelCode } from './model-routing';

// ==================== 类型定义 ====================

export interface GlmTextParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface GlmVideoParams {
  prompt: string;
  model?: string;
  imageUrl?: string | [string, string];
  quality?: 'quality' | 'speed';
  size?: string;
  fps?: 30 | 60;
}

export interface GlmTtsParams {
  text: string;
  voice?: string;
  speed?: number;
  responseFormat?: 'mp3' | 'wav' | 'pcm';
}

export interface GlmMultimodalParams {
  model?: string;
  messages: Array<{ role: string; content: string | { type: string; image?: string; text?: string } }>;
  temperature?: number;
  maxTokens?: number;
}

export interface GlmAsyncResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    task_id?: string;
  };
}

export interface GlmResultResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    video_url?: string;
    audio_url?: string;
    image_url?: string;
    content?: string;
    error?: string;
  };
}

// ==================== 通用请求方法 ====================

async function glmRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { method?: string }
): Promise<T> {
  const { method = 'POST' } = options || {};

  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${GLM_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`智谱GLM API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== 文本生成 ====================

export async function generateText(
  params: GlmTextParams
): Promise<string> {
  const response = await glmRequest<{
    code: number;
    msg: string;
    data: { choices: Array<{ message: { content: string } }> };
  }>('/text/chatcompletion', {
    model: params.model || getModelCode('glm_text', GLM_CONFIG.MODELS.TEXT),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1024,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`智谱文本生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 视频生成 ====================

export async function generateVideo(
  params: GlmVideoParams
): Promise<string> {
  const body: Record<string, unknown> = {
    model: params.model || getModelCode('glm_video', GLM_CONFIG.MODELS.VIDEO),
    prompt: params.prompt,
    quality: params.quality || 'quality',
    size: params.size || '1920x1080',
    fps: params.fps || 30,
  };
  if (params.imageUrl) {
    body.image_url = params.imageUrl;
  }

  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}/videos/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GLM_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`CogVideoX-3 提交失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.id || '';
}

export async function getVideoResult(
  requestId: string
): Promise<GlmResultResponse['data']> {
  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}/async-result/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GLM_CONFIG.API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`查询 CogVideoX-3 结果失败: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id || requestId,
    status: data.task_status === 'SUCCESS' ? 'succeeded'
      : data.task_status === 'FAIL' || data.task_status === 'FAILED' ? 'failed'
      : 'processing',
    video_url: data.video_result?.[0]?.url
      || data.results?.[0]?.url
      || data.data?.url
      || '',
    error: data.error?.message || data.message,
  };
}

export async function pollVideoResult(
  requestId: string,
  maxAttempts: number = 120,
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

// ==================== TTS 语音合成 ====================

export async function synthesizeSpeech(
  params: GlmTtsParams
): Promise<string> {
  const response = await glmRequest<{
    code: number;
    msg: string;
    data: { audio_url: string };
  }>('/audio/synthesis', {
    model: 'glm-tts',
    text: params.text,
    voice: params.voice || 'female_yunyang',
    speed: params.speed || 1.0,
    response_format: params.responseFormat || 'mp3',
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`智谱TTS合成失败: ${response.msg}`);
  }

  return response.data.audio_url;
}

// ==================== 多模态 ====================

export async function generateMultimodal(
  params: GlmMultimodalParams
): Promise<string> {
  const response = await glmRequest<{
    code: number;
    msg: string;
    data: { choices: Array<{ message: { content: string } }> };
  }>('/multimodal/chatcompletion', {
    model: params.model || getModelCode('glm_multimodal', GLM_CONFIG.MODELS.MULTIMODAL),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1024,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`智谱多模态生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 导出 ====================

export const glmApi = {
  generateText,
  generateVideo,
  getVideoResult,
  pollVideoResult,
  synthesizeSpeech,
  generateMultimodal,
};

export default glmApi;