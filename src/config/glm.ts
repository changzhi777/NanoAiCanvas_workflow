/**
 * 智谱 GLM 渠道商配置
 * API Key 从 .env 读取
 */

export const GLM_CONFIG = {
  API_KEY: import.meta.env.VITE_GLM_API_KEY || '',
  API_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',

  // 模型映射
  MODELS: {
    TEXT: 'glm-4',
    VIDEO: 'cogview-3',
    TTS: 'glm-tts',
    MULTIMODAL: 'glm-4v',
  },
} as const;

export type GlmModelType = typeof GLM_CONFIG.MODELS;