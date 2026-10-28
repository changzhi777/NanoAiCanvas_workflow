/**
 * 配音大师 API 客户端 —— MiniMax 音色设计 + 文字转语音
 * 后端代理：/api/v2/dubbing/*（key 安全存后端）
 */
import { client } from './client'
import { getFullPath } from '@/lib/basePath'

/** 后端返回的资源路径（/asset-uploads/...）补 /nanoai 前缀（子路径部署同源） */
function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return getFullPath(path)
}

// ==================== 类型 ====================

export interface DesignedVoice {
  voice_id: string
  description: string[]
  created_time: string
}

export interface SystemVoice {
  voice_id: string
  voice_name: string
  description: string[]
}

export interface VoicesResponse {
  system: SystemVoice[]
  designed: DesignedVoice[]
}

export interface VoiceDesignResult {
  voice_id: string
  trial_audio_url: string | null
}

export interface TtsResult {
  audio_url: string
  subtitle_url: string | null
  audio_length_ms: number | null
  usage_characters: number | null
}

export interface TtsParams {
  text: string
  voice_id: string
  model?: string
  emotion?: string | null
  speed?: number
  vol?: number
  pitch?: number
  language_boost?: string | null
  subtitle?: boolean
}

export interface TtsAsyncCreateResult {
  task_id: string
  file_id: number | null
}

export interface TtsAsyncQueryResult {
  task_id: string
  status: 'processing' | 'success' | 'failed' | 'expired'
  file_id: number | null
  audio_url?: string
  detail?: string
}

export const TTS_MODELS = [
  { value: 'speech-2.8-hd', label: '2.8 HD · 高音质' },
  { value: 'speech-2.8-turbo', label: '2.8 Turbo · 快速省钱' },
  { value: 'speech-2.6-hd', label: '2.6 HD' },
  { value: 'speech-2.6-turbo', label: '2.6 Turbo' },
] as const

export const EMOTIONS = [
  { value: 'none', label: '默认' },
  { value: 'happy', label: '开心' },
  { value: 'sad', label: '悲伤' },
  { value: 'angry', label: '愤怒' },
  { value: 'fearful', label: '恐惧' },
  { value: 'disgusted', label: '厌恶' },
  { value: 'surprised', label: '惊讶' },
  { value: 'calm', label: '平静' },
  { value: 'fluent', label: '流利' },
  { value: 'whisper', label: '耳语' },
] as const

/** 语气词标签（仅 speech-2.8 系列生效，C 端同款） */
export const INTERJECTIONS = [
  '(laughs)', '(sighs)', '(breath)', '(emm)', '(coughs)', '(clear-throat)',
  '(gasps)', '(humming)', '(chuckle)', '(pant)', '(whistles)', '(crying)',
] as const

/** 音色设计预设提示词（对齐 MiniMax C 端） */
export const VOICE_PROMPT_PRESETS = [
  '年迈智者：苍老沙哑的男声，语速缓慢，字字千钧，充满人生阅历与洞悉世事的沉稳',
  '激情解说：高亢激昂的男声，语速快而有爆发力，适合体育赛事与游戏高光时刻解说',
  '悬疑故事家：低沉神秘的男声，气声明显，节奏张弛有度，营造身临其境的悬疑氛围',
  '摇篮曲女声：轻柔温暖的年轻女声，语速极缓，气息绵长，如母亲哄睡般安宁',
  '严厉女教师：清晰凌厉的女声，音调偏高，吐字铿锵，带着不容置疑的威严感',
] as const

/** 本地句库——试听文本「自动生成」用，不依赖 LLM */
const SAMPLE_SENTENCES = [
  '山不让尘，川不辞盈，时间自会给出答案。',
  '在那片被月光浸透的森林深处，藏着一个无人知晓的秘密。',
  '每一次日出，都是世界重新开始的方式。',
  '风起于青萍之末，浪成于微澜之间。',
  '最好的故事，往往始于一句不经意的话。',
  '遥远的星光穿越亿万年，只为落进你此刻的眼睛。',
]

export function randomSampleText(): string {
  return SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)]
}

// ==================== 接口封装 ====================

export async function voiceDesign(
  prompt: string, previewText: string, token?: string,
): Promise<VoiceDesignResult> {
  const r = await client.post<VoiceDesignResult>('/v2/dubbing/voice-design',
    { prompt, preview_text: previewText }, token)
  return { ...r, trial_audio_url: assetUrl(r.trial_audio_url) }
}

export async function textToSpeech(params: TtsParams, token?: string): Promise<TtsResult> {
  const r = await client.post<TtsResult>('/v2/dubbing/tts', params, token)
  return { ...r, audio_url: assetUrl(r.audio_url) || '', subtitle_url: assetUrl(r.subtitle_url) }
}

export async function ttsAsyncCreate(params: TtsParams, token?: string): Promise<TtsAsyncCreateResult> {
  return client.post<TtsAsyncCreateResult>('/v2/dubbing/tts-async', params, token)
}

export async function ttsAsyncQuery(taskId: string, download = true, token?: string): Promise<TtsAsyncQueryResult> {
  const r = await client.get<TtsAsyncQueryResult>(
    `/api/v2/dubbing/tts-async/${encodeURIComponent(taskId)}?download=${download}`, token)
  return { ...r, audio_url: assetUrl(r.audio_url) ?? undefined }
}

export async function listVoices(token?: string): Promise<VoicesResponse> {
  return client.get<VoicesResponse>('/v2/dubbing/voices', token)
}

export async function deleteVoice(voiceId: string, token?: string): Promise<{ deleted: boolean }> {
  return client.delete<{ deleted: boolean }>(
    `/api/v2/dubbing/voices/${encodeURIComponent(voiceId)}`, token)
}

/** 长文本轮询：3s 间隔直到 success/failed 或超时 */
export async function pollTtsAsync(
  taskId: string, token?: string, maxAttempts = 100, intervalMs = 3000,
): Promise<TtsAsyncQueryResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const r = await ttsAsyncQuery(taskId, i === maxAttempts - 1, token)
    if (r.status === 'success' || r.status === 'failed' || r.status === 'expired') return r
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error('长文本合成超时')
}
