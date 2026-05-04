/**
 * 通义千问（阿里）渠道商配置
 * API Key 从 .env 读取
 */

export const QWEN_CONFIG = {
  API_KEY: import.meta.env.VITE_QWEN_API_KEY || '',
  API_BASE_URL: 'https://dashscope.aliyuncs.com/api/v1',

  // 模型映射
  MODELS: {
    TEXT: 'qwen-turbo',
    CODING: 'qwen-coder-plus',
  },
} as const;

export type QwenModelType = typeof QWEN_CONFIG.MODELS;