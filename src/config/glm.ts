/**
 * 智谱 GLM 渠道商配置
 * API Key 从 .env 读取
 *
 * 使用方法:
 *   import { GLM_CONFIG } from '@/config/glm'
 *   const model = GLM_CONFIG.MODELS.TVC_DEEP  // 'glm-5.1'
 */

export const GLM_CONFIG = {
  API_KEY: import.meta.env.VITE_GLM_API_KEY || '',
  API_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',

  MODELS: {
    // TVC 专用 — 功能化映射（不对外暴露模型名）
    TVC_DEEP: 'glm-5.1',          // 深度分析优化
    TVC_FAST: 'glm-4.5-air',      // 快速优化
    TVC_VISION: 'glm-5v-turbo',   // 参考图优化

    // 通用（保持兼容）
    TEXT: 'glm-4',
    VIDEO: 'cogvideox-3',
    TTS: 'glm-tts',
    MULTIMODAL: 'glm-4v',
  },

  // TVC 功能名 → 模型映射
  TVC_MODEL_LABELS: {
    tvc_minimax: { label: 'MiniMax 2.7（推荐）', model: 'MiniMax-M2.7', provider: 'minimax' },
    tvc_deep: { label: '深度分析优化', model: 'glm-5.1', thinking: true },
    tvc_fast: { label: '快速优化', model: 'glm-4.5-air', thinking: false },
    tvc_vision: { label: '参考图优化', model: 'glm-5v-turbo', thinking: true },
  } as const,
} as const;

export type GlmModelType = typeof GLM_CONFIG.MODELS;
export type TvcModelKey = keyof typeof GLM_CONFIG.TVC_MODEL_LABELS;
