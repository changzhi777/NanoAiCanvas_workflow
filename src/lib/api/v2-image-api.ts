/**
 * NanoAI V2 图片生成 API
 * 使用 WebSocket 实现实时状态推送，替代轮询
 */

import { getApiKey } from './client';
import { subscribeTaskStatus, TaskStatusMessage } from './websocket-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 请求参数
export interface V2ImageGenerateParams {
  prompt: string;
  model_type?: 'nano-banana2' | 'gpt-image-2';
  size?: '1K' | '2K' | '4K';
  aspect_ratio?: 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  urls?: string[];
}

// 响应类型
export interface V2TaskSubmitResponse {
  task_id: string;
  status: string;
}

export interface V2TaskStatusResponse {
  task_id: string;
  status: string;
  images?: Array<{ url: string }>;
  error?: string;
}

// ==================== API 函数 ====================

/**
 * 提交 V2 图片生成任务
 */
export async function submitV2ImageTask(
  params: V2ImageGenerateParams
): Promise<V2TaskSubmitResponse> {
  const apiKey = getApiKey();
  const url = `${API_BASE_URL}/api/v2/image/nanobanana2/generate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify({
      model_type: params.model_type || 'nano-banana2',
      prompt: params.prompt,
      size: params.size || '1K',
      aspect_ratio: params.aspect_ratio || 'auto',
      urls: params.urls || [],
    }),
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 查询 V2 任务状态
 */
export async function getV2TaskStatus(
  taskId: string
): Promise<V2TaskStatusResponse> {
  const apiKey = getApiKey();
  const url = `${API_BASE_URL}/api/v2/image/nanobanana2/task/${taskId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * WebSocket 实时生成图片（无轮询）
 */
export async function generateV2ImageWithWebSocket(
  params: V2ImageGenerateParams,
  onProgress?: (status: string, progress: number) => void
): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    let unsubscribe: (() => void) | null = null;
    let pollingFallback: ReturnType<typeof setInterval> | null = null;
    let resolved = false;

    try {
      // 1. 提交任务
      onProgress?.('提交生成请求...', 10);
      const submitResult = await submitV2ImageTask(params);
      const taskId = submitResult.task_id;

      onProgress?.('已提交，等待生成...', 20);
      console.log(`[V2 Image] Task submitted: ${taskId}`);

      // 2. 设置 WebSocket 订阅
      const statusPromise = new Promise<string[]>((res, rej) => {
        let attemptCount = 0;
        const maxPollingAttempts = 180; // 3分钟 x 60秒 = 180次
        const pollingInterval = 1000; // 1秒

        // WebSocket 订阅状态
        unsubscribe = subscribeTaskStatus(taskId, async (message: TaskStatusMessage) => {
          console.log(`[V2 Image] Status update:`, message);

          if (message.type === 'status_update') {
            if (message.status === 'success' && message.images) {
              resolved = true;
              unsubscribe?.();
              if (pollingFallback) clearInterval(pollingFallback);
              onProgress?.('生成完成！', 100);
              res(message.images.map(img => img.url));
            } else if (message.status === 'failed') {
              resolved = true;
              unsubscribe?.();
              if (pollingFallback) clearInterval(pollingFallback);
              onProgress?.('生成失败', 0);
              rej(new Error(message.error || '图片生成失败'));
            } else if (message.status === 'processing') {
              onProgress?.('正在生成图片...', message.progress || 50);
            }
          }
        });

        // 备用：轮询（如果 WebSocket 连接失败）
        pollingFallback = setInterval(async () => {
          attemptCount++;
          if (resolved) {
            clearInterval(pollingFallback!);
            return;
          }

          // 20秒后开始轮询备用
          if (attemptCount > 20 && !resolved) {
            try {
              const status = await getV2TaskStatus(taskId);
              console.log(`[V2 Image] Polling status:`, status);

              if (status.status === 'success' && status.images) {
                resolved = true;
                unsubscribe?.();
                clearInterval(pollingFallback!);
                onProgress?.('生成完成！', 100);
                res(status.images.map(img => img.url));
              } else if (status.status === 'failed') {
                resolved = true;
                unsubscribe?.();
                clearInterval(pollingFallback!);
                onProgress?.('生成失败', 0);
                rej(new Error(status.error || '图片生成失败'));
              } else if (attemptCount > maxPollingAttempts) {
                resolved = true;
                unsubscribe?.();
                clearInterval(pollingFallback!);
                onProgress?.('生成超时', 0);
                rej(new Error('图片生成超时'));
              }
            } catch (e) {
              console.error(`[V2 Image] Polling error:`, e);
            }
          }
        }, pollingInterval);
      });

      // 等待结果
      const images = await statusPromise;
      resolve(images);
    } catch (error) {
      if (unsubscribe) unsubscribe();
      if (pollingFallback) clearInterval(pollingFallback);
      onProgress?.('生成失败', 0);
      reject(error);
    }
  });
}

/**
 * 一站式生成图片（自动轮询）
 * 这是原有的函数，保留用于兼容
 */
export async function generateV2ImageWithPolling(
  params: V2ImageGenerateParams,
  onProgress?: (status: string, progress: number) => void
): Promise<string[]> {
  try {
    onProgress?.('提交生成请求...', 10);
    const result = await submitV2ImageTask(params);

    onProgress?.('正在生成图片...', 30);

    // 轮询状态（最多5分钟）
    const images = await pollV2TaskResult(result.task_id, 150, 2000);

    onProgress?.('生成完成！', 100);
    return images;
  } catch (error) {
    onProgress?.('生成失败', 0);
    throw error;
  }
}

/**
 * 轮询获取 V2 任务结果
 */
export async function pollV2TaskResult(
  taskId: string,
  maxAttempts: number = 150,
  interval: number = 2000
): Promise<string[]> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await getV2TaskStatus(taskId);

      if (result.status === 'success' && result.images) {
        return result.images.map(img => img.url);
      }

      if (result.status === 'failed') {
        throw new Error(result.error || '图片生成失败');
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error('图片生成超时，请稍后重试');
}
