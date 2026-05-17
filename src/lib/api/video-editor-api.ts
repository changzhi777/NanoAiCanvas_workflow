/**
 * 视频编辑 API — 对接后端 glm_proxy agent + cli-agent HTTP API
 *
 * Agent 对话走后端 GLM Proxy (glm-4.5-air)
 * 视频合成走 cli-agent HTTP API 或现有 /v2/tvc-tasks/compose
 */

import { client } from './client'

// ==================== 类型 ====================

export interface VideoAgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  command?: VideoAgentCommand
}

export interface VideoAgentCommand {
  action: 'concat' | 'compare' | 'subtitle' | 'bgm' | 'compose' | 'preview'
  params: Record<string, unknown>
  description: string
}

export interface VideoAgentChatRequest {
  messages: VideoAgentMessage[]
  /** 当前可用的视频片段 */
  context: {
    clips: string[]
    bgmUrl?: string
    composedUrl?: string
  }
}

export interface VideoAgentChatResponse {
  message: string
  command?: VideoAgentCommand
}

// ==================== Agent 对话 ====================

/**
 * AI 视频编辑 Agent 对话
 * 走后端 GLM Proxy — POST /api/v2/tvc-video-agent
 */
export async function chatWithVideoAgent(
  request: VideoAgentChatRequest,
): Promise<VideoAgentChatResponse> {
  const response = await client.post<VideoAgentChatResponse>(
    '/v2/tvc-video-agent',
    request,
  )
  return response
}

/**
 * SSE 流式 Agent 对话
 * 返回 EventSource 用于实时接收消息
 */
export function streamVideoAgentChat(
  request: VideoAgentChatRequest,
  onMessage: (msg: VideoAgentChatResponse) => void,
  onError?: (err: Error) => void,
): AbortController {
  const controller = new AbortController()

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  fetch('/api/v2/tvc-video-agent/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (response) => {
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            try {
              onMessage(JSON.parse(data))
            } catch { /* skip invalid JSON */ }
          }
        }
      }
    })
    .catch((err) => {
      if (!controller.signal.aborted) onError?.(err)
    })

  return controller
}

// ==================== 视频合成操作 ====================

/** 提交合成任务（对接现有 /v2/tvc-tasks/compose 或 cli-agent） */
export async function submitComposeTask(params: {
  video_urls: string[]
  bgm_url?: string
  bgm_volume?: number
  transition?: string
  resolution?: string
  output_format?: string
}): Promise<{ url: string; duration: number }> {
  return client.post('/v2/tvc-tasks/compose', params)
}

/** 查询任务状态 */
export async function getTaskStatus(taskId: string): Promise<{
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: Record<string, unknown>
  error?: string
}> {
  return client.get(`/v2/tvc-tasks/${taskId}`)
}
