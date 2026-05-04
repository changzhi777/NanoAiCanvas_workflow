/**
 * Kimi（Moonshot）渠道商配置
 * API Key 从 .env 读取
 */

export const KIMI_CONFIG = {
  API_KEY: import.meta.env.VITE_KIMI_API_KEY || '',
  API_BASE_URL: 'https://api.moonshot.cn/v1',

  // 模型映射
  MODELS: {
    TEXT: 'moonshot-v1-8k',
    LONGCONTEXT: 'moonshot-v1-128k',
  },
} as const;

export type KimiModelType = typeof KIMI_CONFIG.MODELS;