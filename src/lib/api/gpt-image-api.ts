/**
 * GPT-Image-2 API 服务
 *
 * 前端通过 NanoAPI 后端调用 GPT-Image-2 服务
 * 架构: Frontend → NanoAPI Backend → wuyinkeji.com API
 */

import { client } from './client'

const API_BASE = '/v2/image/gpt2'

// ==================== 类型定义 ====================

export interface GPTImageParams {
  prompt: string
  size?: string
  aspect_ratio?: string  // wuyinkeji API 参数
  urls?: string[]  // 参考图URL数组，用于溶图
  quality?: 'standard' | 'hd'
  style?: string
}

export interface GPTImageTaskResponse {
  task_id: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  message: string
  images?: string[]
  mode: string
  error?: string
  created_at: string
  completed_at?: string
}

// ==================== API 调用 ====================

/**
 * 提交 GPT-Image-2 图片生成任务
 * @param params 生成参数
 * @returns 任务ID
 */
export async function generateGPTImage(params: GPTImageParams): Promise<string> {
  // wuyinkeji API 只支持 prompt 和 size，其他参数暂不支持
  const requestBody = {
    prompt: params.prompt,
    size: params.size || 'auto',
  }

  const response = await client.post<{ task_id: string; status: string }>(
    `${API_BASE}/generate`,
    requestBody
  )

  return response.task_id
}

/**
 * 查询 GPT-Image-2 任务状态
 * @param taskId 任务ID
 */
export async function getGPTImageTaskStatus(taskId: string): Promise<GPTImageTaskResponse> {
  const response = await client.get<GPTImageTaskResponse>(`${API_BASE}/task/${taskId}`)
  return response
}

/**
 * 轮询获取 GPT-Image-2 图片生成结果
 * @param taskId 任务ID
 * @param maxAttempts 最大轮询次数
 * @param interval 轮询间隔（毫秒）
 */
export async function pollGPTImageResult(
  taskId: string,
  maxAttempts: number = 30,
  interval: number = 3000
): Promise<string[]> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const result = await getGPTImageTaskStatus(taskId)

    if (result.status === 'success' && result.images && result.images.length > 0) {
      return result.images
    }

    if (result.status === 'failed') {
      throw new Error(result.error || '图片生成失败')
    }

    // pending 和 processing 状态继续轮询
    if (result.status === 'pending' || result.status === 'processing') {
      attempts++
      await new Promise(resolve => setTimeout(resolve, interval))
      continue
    }

    attempts++
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('图片生成超时，请稍后重试')
}

/**
 * 生成图片（文生图或溶图）- 一次性调用，自动轮询
 * @param params 生成参数
 * @returns 图片URL数组
 */
export async function generateGPTImageWithPolling(params: GPTImageParams): Promise<string[]> {
  const taskId = await generateGPTImage(params)
  return pollGPTImageResult(taskId)
}

/**
 * 取消 GPT-Image-2 任务
 * @param taskId 任务ID
 */
export async function cancelGPTImageTask(taskId: string): Promise<void> {
  await client.post(`${API_BASE}/task/${taskId}/cancel`, {})
}

// ==================== 导出 ====================

export const gptImageApi = {
  generateImage: generateGPTImage,
  getTaskStatus: getGPTImageTaskStatus,
  pollResult: pollGPTImageResult,
  generateWithPolling: generateGPTImageWithPolling,
  cancelTask: cancelGPTImageTask,
}

export default gptImageApi