/**
 * GLM-TTS-Clone 音色克隆 API 封装
 * 文档：https://open.bigmodel.cn/dev/api#voice-clone
 */

const GLM_FILE_UPLOAD_API = 'https://open.bigmodel.cn/api/paas/v4/files'
const GLM_VOICE_CLONE_API = 'https://open.bigmodel.cn/api/paas/v4/voice/clone'

export interface VoiceCloneRequest {
  model: 'glm-tts-clone'
  voice_name: string
  text: string              // 音频对应的文本
  input: string             // 试听文本（可选）
  file_id: string           // 上传的文件ID
  request_id?: string       // 请求ID
}

export interface VoiceCloneResponse {
  voice_id: string          // 生成的音色ID
  voice_name: string
  audio_url?: string        // 试听音频URL（如果提供了input）
  created: number
}

export interface FileUploadResponse {
  id: string                // 文件ID
  purpose: string
  filename: string
  bytes: number
  created_at: number
}

export interface ClonedVoiceInfo {
  id: string
  name: string
  createdAt: string
}

/**
 * 上传音频文件到智谱
 */
export async function uploadAudioFile(
  apiKey: string,
  file: File | Blob,
  filename: string = 'voice_sample.wav'
): Promise<FileUploadResponse> {
  const formData = new FormData()
  formData.append('file', file, filename)
  formData.append('purpose', 'voice_clone')

  const response = await fetch(GLM_FILE_UPLOAD_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(errorData.error?.message || `文件上传失败: ${response.status}`)
  }

  return response.json()
}

/**
 * 克隆音色
 * @param apiKey 智谱API Key
 * @param voiceName 音色名称
 * @param sampleText 样本文本（与上传音频内容一致）
 * @param fileId 上传的文件ID
 * @param testText 试听文本（可选）
 */
export async function cloneVoice(
  apiKey: string,
  voiceName: string,
  sampleText: string,
  fileId: string,
  testText?: string
): Promise<VoiceCloneResponse> {
  const request: VoiceCloneRequest = {
    model: 'glm-tts-clone',
    voice_name: voiceName,
    text: sampleText,
    input: testText || sampleText,
    file_id: fileId,
  }

  const response = await fetch(GLM_VOICE_CLONE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(errorData.error?.message || `音色克隆失败: ${response.status}`)
  }

  return response.json()
}

/**
 * 完整的音色克隆流程
 * 1. 上传音频文件
 * 2. 调用克隆API
 */
export async function cloneVoiceFromAudio(
  apiKey: string,
  audioBlob: Blob,
  voiceName: string,
  sampleText: string,
  testText?: string,
  onProgress?: (step: 'uploading' | 'cloning', progress: number) => void
): Promise<{ voiceId: string; voiceName: string; testAudioUrl?: string }> {
  // Step 1: 上传音频
  onProgress?.('uploading', 0)
  const uploadResult = await uploadAudioFile(apiKey, audioBlob, `${voiceName}_sample.wav`)
  onProgress?.('uploading', 100)

  // Step 2: 克隆音色
  onProgress?.('cloning', 0)
  const cloneResult = await cloneVoice(apiKey, voiceName, sampleText, uploadResult.id, testText)
  onProgress?.('cloning', 100)

  return {
    voiceId: cloneResult.voice_id,
    voiceName: cloneResult.voice_name,
    testAudioUrl: cloneResult.audio_url,
  }
}

/**
 * 从录音设备获取音频 Blob
 */
export async function getAudioFromRecorder(
  mediaRecorder: MediaRecorder
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm'
      resolve(new Blob(chunks, { type: mimeType }))
    }

    mediaRecorder.onerror = (e) => {
      reject(new Error('录音失败'))
    }
  })
}

/**
 * 检查音频时长
 */
export function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.onloadedmetadata = () => {
      resolve(audio.duration)
    }
    audio.onerror = () => {
      reject(new Error('无法读取音频时长'))
    }
    audio.src = URL.createObjectURL(audioBlob)
  })
}

/**
 * 验证音频文件（3秒以上，10秒以内最佳）
 */
export async function validateAudioForClone(
  audioBlob: Blob,
  minDuration: number = 3,
  maxDuration: number = 30
): Promise<{ valid: boolean; duration: number; message: string }> {
  try {
    const duration = await getAudioDuration(audioBlob)

    if (duration < minDuration) {
      return {
        valid: false,
        duration,
        message: `音频时长不足，需要至少 ${minDuration} 秒，当前 ${duration.toFixed(1)} 秒`,
      }
    }

    if (duration > maxDuration) {
      return {
        valid: false,
        duration,
        message: `音频时长过长，建议不超过 ${maxDuration} 秒，当前 ${duration.toFixed(1)} 秒`,
      }
    }

    return {
      valid: true,
      duration,
      message: `音频时长: ${duration.toFixed(1)} 秒`,
    }
  } catch (error) {
    return {
      valid: false,
      duration: 0,
      message: '无法验证音频文件',
    }
  }
}
