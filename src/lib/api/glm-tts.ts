/**
 * GLM-TTS 语音合成 API 封装
 * 文档：https://open.bigmodel.cn/dev/api#text-to-speech
 */

import type { TTSParams } from '@/types'

const GLM_TTS_API = 'https://open.bigmodel.cn/api/paas/v4/audio/speech'

export interface GLMTTSRequest {
  model: 'glm-tts'
  input: string
  voice: string
  speed?: number
  volume?: number
  response_format?: 'wav' | 'mp3' | 'pcm'
  encode_format?: 'base64'
  stream?: boolean
}

export interface GLMTTSStreamResponse {
  id: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role: string
      return_sample_rate: number
      content: string  // base64 encoded audio
    }
    finish_reason?: 'stop'
  }>
}

export interface GLMTTSError {
  error: {
    code: string
    message: string
  }
}

/**
 * 单条语音合成（非流式）
 * 返回音频 Blob
 */
export async function synthesizeSpeech(
  apiKey: string,
  text: string,
  params: TTSParams
): Promise<Blob> {
  const request: GLMTTSRequest = {
    model: 'glm-tts',
    input: text,
    voice: params.voice,
    speed: params.speed,
    volume: params.volume,
    response_format: params.responseFormat,
  }

  const response = await fetch(GLM_TTS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(errorData.error?.message || `TTS API 错误: ${response.status}`)
  }

  // 返回音频 Blob
  const contentType = params.responseFormat === 'mp3' ? 'audio/mpeg' :
                      params.responseFormat === 'wav' ? 'audio/wav' : 'audio/pcm'
  return response.blob().then(blob => {
    // 修正 MIME 类型
    return new Blob([blob], { type: contentType })
  })
}

/**
 * 流式语音合成
 * 返回 AsyncGenerator，每次 yield 一个音频 chunk
 */
export async function* synthesizeSpeechStream(
  apiKey: string,
  text: string,
  params: TTSParams,
  signal?: AbortSignal
): AsyncGenerator<{ audioChunk: Uint8Array; sampleRate: number }, void, unknown> {
  const request: GLMTTSRequest = {
    model: 'glm-tts',
    input: text,
    voice: params.voice,
    speed: params.speed,
    volume: params.volume,
    response_format: 'pcm',
    encode_format: 'base64',
    stream: true,
  }

  const response = await fetch(GLM_TTS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(errorData.error?.message || `TTS API 错误: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法获取响应流')

  const decoder = new TextDecoder()
  let sampleRate = 24000

  try {
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue

          try {
            const parsed: GLMTTSStreamResponse | GLMTTSError = JSON.parse(data)

            // 错误处理
            if ('error' in parsed) {
              throw new Error(parsed.error.message)
            }

            // 音频数据处理
            if ('choices' in parsed && parsed.choices.length > 0) {
              const choice = parsed.choices[0]
              if (choice.finish_reason === 'stop') continue

              if (choice.delta?.content) {
                sampleRate = choice.delta.return_sample_rate || sampleRate
                const audioData = Uint8Array.from(atob(choice.delta.content), c => c.charCodeAt(0))
                yield { audioChunk: audioData, sampleRate }
              }
            }
          } catch (parseError) {
            console.warn('[GLM-TTS] 解析响应失败:', parseError)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 批量语音合成
 * 支持进度回调
 */
export async function batchSynthesizeSpeech(
  apiKey: string,
  items: Array<{ id: string; text: string; characterName: string }>,
  params: TTSParams,
  onProgress?: (current: number, total: number, id: string) => void,
  signal?: AbortSignal
): Promise<Array<{ id: string; audioBlob: Blob }>> {
  const results: Array<{ id: string; audioBlob: Blob }> = []

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error('用户取消')
    }

    const item = items[i]
    try {
      const audioBlob = await synthesizeSpeech(apiKey, item.text, params)
      results.push({ id: item.id, audioBlob })
      onProgress?.(i + 1, items.length, item.id)
    } catch (error) {
      console.error(`[GLM-TTS] 合成失败 (${item.characterName}):`, error)
      throw error
    }
  }

  return results
}

/**
 * 将 Blob 转换为可播放的 URL
 */
export function blobToAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * 释放音频 URL
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url)
}
