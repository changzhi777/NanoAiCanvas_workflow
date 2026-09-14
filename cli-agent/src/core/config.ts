import type { OutputSpec } from '../types.js'

/** 输出规格预设 */
export const OUTPUT_PRESETS: Record<string, OutputSpec> = {
  '1080p': {
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'libx264',
    pixelFormat: 'yuv420p',
    bitrate: '8M',
    audioBitrate: '192k',
  },
  '4k': {
    width: 3840,
    height: 2160,
    fps: 30,
    codec: 'libx264',
    pixelFormat: 'yuv420p',
    bitrate: '20M',
    audioBitrate: '256k',
  },
  '720p': {
    width: 1280,
    height: 720,
    fps: 30,
    codec: 'libx264',
    pixelFormat: 'yuv420p',
    bitrate: '4M',
    audioBitrate: '128k',
  },
}

export const DEFAULT_PRESET = '1080p'

/** 解析输出规格字符串 */
export function resolveOutputSpec(spec?: string): OutputSpec {
  if (!spec) return OUTPUT_PRESETS[DEFAULT_PRESET]
  if (OUTPUT_PRESETS[spec]) return { ...OUTPUT_PRESETS[spec] }

  // 支持 WxH@fps 格式：1920x1080@30
  const match = spec.match(/^(\d+)x(\d+)(?:@(\d+))?$/)
  if (match) {
    return {
      width: Number(match[1]),
      height: Number(match[2]),
      fps: Number(match[3]) || 30,
      codec: 'libx264',
      pixelFormat: 'yuv420p',
    }
  }

  return { ...OUTPUT_PRESETS[DEFAULT_PRESET] }
}

/** 支持的视频格式 */
export const SUPPORTED_FORMATS = ['mp4', 'webm', 'mov'] as const
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]

/** 验证格式 */
export function isValidFormat(fmt: string): fmt is SupportedFormat {
  return SUPPORTED_FORMATS.includes(fmt as SupportedFormat)
}
