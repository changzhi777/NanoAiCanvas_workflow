/**
 * 即梦（字节AI）渠道商配置
 * API Key 从 .env 读取
 */

export const JIMENG_CONFIG = {
  API_KEY: import.meta.env.VITE_JIMENG_API_KEY || '',
  API_BASE_URL: 'https://api.jimeng.jike.com/v1',

  // 模型映射
  MODELS: {
    IMAGE: 'jimeng-image-01',
    VIDEO: 'jimeng-video-01',
  },
} as const;

export type JimengModelType = typeof JIMENG_CONFIG.MODELS;