/**
 * 即梦（字节 AI）渠道商配置
 * API Key 从 .env 读取
 *
 * 使用方法:
 *   import { JIMENG_CONFIG } from '@/config/jimeng'
 *   const defaults = JIMENG_CONFIG.VIDEO_DEFAULTS
 */

export const JIMENG_CONFIG = {
  API_KEY: import.meta.env.VITE_JIMENG_API_KEY || '',
  API_BASE_URL: 'https://api.jimeng.jike.com/v1',

  MODELS: {
    IMAGE: 'jimeng-image-01',
    VIDEO: 'jimeng-video-01',  // Seedance 2.0
  },

  // Seedance 2.0 视频参数
  VIDEO_OPTIONS: {
    duration: [4, 5, 8, 10, 15] as const,
    resolution: ['480p', '720p', '1080p', '2k'] as const,
    aspect_ratio: ['16:9', '9:16', '4:3', '3:4', '21:9', '1:1'] as const,
  },

  // 默认视频生成参数（TVC 推荐）
  VIDEO_DEFAULTS: {
    model: 'jimeng-video-01',
    duration: 5,
    resolution: '720p',
    aspect_ratio: '16:9',
  },

  // 轮询配置
  POLL: {
    maxAttempts: 120,
    interval: 3000,     // 3s
    timeout: 300000,    // 5min 单镜头超时
  },
} as const;

export type JimengModelType = typeof JIMENG_CONFIG.MODELS;
