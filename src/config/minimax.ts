/**
 * MiniMax 渠道商配置
 * API Key 从 .env 读取
 *
 * 使用方法:
 *   import { MINIMAX_CONFIG } from '@/config/minimax'
 *   const bgmModel = MINIMAX_CONFIG.MODELS.MUSIC.v2_6
 */

export const MINIMAX_CONFIG = {
  API_KEY: import.meta.env.VITE_MINIMAX_API_KEY || '',
  API_BASE_URL: 'https://api.minimaxi.com/v1',

  MODELS: {
    TEXT: {
      default: 'MiniMax-Text-01',
      m2: 'abab6.5s-chat',
      m2_7: 'abab6.5s-chat',
    },
    SPEECH: {
      hd: 'speech-02-hd',
      standard: 'speech-02',
    },
    VIDEO: {
      hailuo_2_3_fast: 'hailuo-2.3-fast-768P',
      hailuo_2_3: 'hailuo-2.3-768P',
    },
    MUSIC: {
      v2_6: 'music-2.6',
      cover: 'music-cover',
    },
    IMAGE: {
      image_01: 'image-01',
    },
    CODING: {
      search: 'coding-plan-search',
    },
  },

  // TVC BGM 默认参数
  MUSIC_DEFAULTS: {
    model: 'music-2.6',
    is_instrumental: true,
    lyrics_optimizer: true,
    audio_setting: {
      sample_rate: 44100,
      bit_depth: 16,
      format: 'mp3',
      channel: 'mono',
    },
  },

  // 视频镜头指令（15 种）
  CAMERA_DIRECTIVES: [
    '[左移]', '[右移]', '[上移]', '[下移]',
    '[左转]', '[右转]',
    '[推进]', '[拉远]',
    '[上升]', '[下降]',
    '[逆时针旋转]', '[顺时针旋转]',
    '[快速拉近]', '[快速拉远]', '[固定]',
  ] as const,
} as const;

export type MiniMaxModelType = typeof MINIMAX_CONFIG.MODELS;
