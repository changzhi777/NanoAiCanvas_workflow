/**
 * MiniMax API 服务
 * 提供文本生成、语音合成、视频生成、音乐生成、图片生成、编程搜索
 */

import { MINIMAX_CONFIG } from '@/config/minimax';
import { getModelCode } from './model-routing';

// ==================== 类型定义 ====================

export interface MiniMaxTextParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface MiniMaxSpeechParams {
  text: string;
  model?: string;
  voice?: string;
  speed?: number;
}

export interface MiniMaxVideoParams {
  prompt: string;
  model?: string;
  duration?: number;
}

export interface MiniMaxMusicParams {
  prompt: string;
  model?: string;
  lyrics?: boolean;
}

export interface MiniMaxImageParams {
  prompt: string;
  model?: string;
  size?: string;
  aspectRatio?: string;
}

export interface MiniMaxAsyncResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    order_no?: string;
  };
}

export interface MiniMaxResultResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
   video_url?: string;
    audio_url?: string;
    image_url?: string;
    file_url?: string;
    content?: string;
    error?: string;
  };
}

// ==================== 通用请求方法 ====================

async function minimaxRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { method?: string }
): Promise<T> {
  const { method = 'POST' } = options || {};

  const response = await fetch(`${MINIMAX_CONFIG.API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${MINIMAX_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`MiniMax API 请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== 文本生成 ====================

export async function generateText(
  params: MiniMaxTextParams
): Promise<string> {
  const response = await minimaxRequest<{
    code: number;
    msg: string;
    data: { choices: Array<{ message: { content: string } }> };
  }>('/text/chatcompletion_v2', {
    model: params.model || getModelCode('minimax_text', MINIMAX_CONFIG.MODELS.TEXT.m2_7),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1024,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`文本生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 语音合成 ====================

export async function generateSpeech(
  params: MiniMaxSpeechParams
): Promise<string> {
  const response = await minimaxRequest<{
    code: number;
    msg: string;
    data: { audio_url: string };
  }>('/speech/synthesis', {
    model: params.model || getModelCode('minimax_speech', MINIMAX_CONFIG.MODELS.SPEECH.hd),
    text: params.text,
    voice: params.voice || 'female_yunyang',
    speed: params.speed || 1.0,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`语音合成失败: ${response.msg}`);
  }

  return response.data.audio_url;
}

// ==================== 视频生成 ====================

export async function generateVideo(
  params: MiniMaxVideoParams
): Promise<string> {
  const model = params.model || getModelCode('minimax_video', MINIMAX_CONFIG.MODELS.VIDEO.hailuo_2_3_fast);

  const response = await minimaxRequest<MiniMaxAsyncResponse>('/video/generation', {
    model,
    prompt: params.prompt,
    duration: params.duration || 6,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`视频生成失败: ${response.msg}`);
  }

  return response.data.id;
}

export async function getVideoResult(
  requestId: string
): Promise<MiniMaxResultResponse['data']> {
  const response = await minimaxRequest<MiniMaxResultResponse>(
    `/video/generation_result?id=${requestId}`,
    {},
    { method: 'GET' }
  );

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`查询视频结果失败: ${response.msg}`);
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

// ==================== 音乐生成 ====================

export async function generateMusic(
  params: MiniMaxMusicParams
): Promise<string> {
  const response = await minimaxRequest<MiniMaxAsyncResponse>('/music/generate', {
    model: params.model || getModelCode('minimax_music', MINIMAX_CONFIG.MODELS.MUSIC.v2_6),
    prompt: params.prompt,
    lyrics: params.lyrics ?? true,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`音乐生成失败: ${response.msg}`);
  }

  return response.data.id;
}

export async function getMusicResult(
  requestId: string
): Promise<MiniMaxResultResponse['data']> {
  const response = await minimaxRequest<MiniMaxResultResponse>(
    `/music/generate_result?id=${requestId}`,
    {},
    { method: 'GET' }
  );

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`查询音乐结果失败: ${response.msg}`);
  }

  return response.data;
}

export async function pollMusicResult(
  requestId: string,
  maxAttempts: number = 30,
  interval: number = 3000
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await getMusicResult(requestId);

    if (result.status === 'succeeded' && result.audio_url) {
      return result.audio_url;
    }

    if (result.status === 'failed') {
      throw new Error(result.error || '音乐生成失败');
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('音乐生成超时，请稍后重试');
}

// ==================== 图片生成 ====================

export async function generateImage(
  params: MiniMaxImageParams
): Promise<string> {
  const response = await minimaxRequest<{
    code: number;
    msg: string;
    data: { image_url: string };
  }>('/image/generation', {
    model: params.model || getModelCode('minimax_image', MINIMAX_CONFIG.MODELS.IMAGE.image_01),
    prompt: params.prompt,
    size: params.size || '1K',
    aspect_ratio: params.aspectRatio || '16:9',
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`图片生成失败: ${response.msg}`);
  }

  return response.data.image_url;
}

// ==================== 编程搜索 ====================

export async function codingPlanSearch(
  query: string
): Promise<string> {
  const response = await minimaxRequest<{
    code: number;
    msg: string;
    data: { content: string };
  }>('/search/coding-plan', {
    query,
    model: getModelCode('minimax_coding', MINIMAX_CONFIG.MODELS.CODING.search),
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`编程搜索失败: ${response.msg}`);
  }

  return response.data.content;
}

// ==================== 导出 ====================

export const minimaxApi = {
  generateText,
  generateSpeech,
  generateVideo,
  getVideoResult,
  pollVideoResult,
  generateMusic,
  getMusicResult,
  pollMusicResult,
  generateImage,
  codingPlanSearch,
};

export default minimaxApi;
