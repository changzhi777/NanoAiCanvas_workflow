/**
 * MiniMax 渠道商配置
 * API Key 从 .env 读取
 */

export const MINIMAX_CONFIG = {
  API_KEY: import.meta.env.VITE_MINIMAX_API_KEY || '',
  API_BASE_URL: 'https://api.minimaxi.com/v1',

  // 模型映射
  MODELS: {
    // 文本生成 - 默认使用 m2.7
    TEXT: {
      default: 'MiniMax-Text-01',
      m2: 'abab6.5s-chat',
      m2_7: 'abab6.5s-chat',
    },
    // 语音合成
    SPEECH: {
      hd: 'speech-02-hd',
      standard: 'speech-02',
    },
    // 视频生成
    VIDEO: {
      hailuo_2_3_fast: 'hailuo-2.3-fast-768P',
      hailuo_2_3: 'hailuo-2.3-768P',
    },
    // 音乐生成
    MUSIC: {
      v2_6: 'music-2.6',
      cover: 'music-cover',
    },
    // 图片生成
    IMAGE: {
      image_01: 'image-01',
    },
    // 编程搜索
    CODING: {
      search: 'coding-plan-search',
    },
  },
} as const;

export type MiniMaxModelType = typeof MINIMAX_CONFIG.MODELS;
