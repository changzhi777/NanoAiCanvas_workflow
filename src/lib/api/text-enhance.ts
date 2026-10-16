/**
 * 提示词增强 — 走后端 glm_proxy /v2/glm/optimize（DeepSeek 直连）
 * model=deepseek-flash：后端 _glm_chat 对 deepseek* 走 Anthropic 兼容端点直连，
 * API Key 全程留在服务端（旧版前端直连 MiniMax 会把 key 打进 bundle，已弃）
 */

import { client } from './client'
import type { EnhanceOptions } from '@/types/image'

export type EnhanceMode = 'standard' | 'creative' | 'detailed' | 'cinematic'

export interface EnhancePromptOptions {
  prompt: string
  /** 已废弃：key 由后端持有，保留参数位以兼容旧调用 */
  apiKey?: string
  options?: EnhanceOptions
  /** 风格 code（如 realistic/anime），后端 STYLE_MAP 按此注入画面要求 */
  styleCode?: string
  mode?: EnhanceMode
}

export interface OptimizeResponse {
  optimized_prompt: string
}

/**
 * 增强提示词（deepseek-flash，后端代理）
 * @param options 增强选项
 * @returns 增强后的提示词
 */
export async function enhancePrompt(options: EnhancePromptOptions): Promise<string> {
  const { prompt, options: presetOptions, styleCode } = options

  // client 的 API_BASE_URL（/nanoai/api）自带 /api 段，endpoint 从业务路径起写
  const response = await client.post<OptimizeResponse>('/glm/optimize', {
    prompt,
    model: 'deepseek-flash',
    system_prompt_template: 'custom',
    style: styleCode ?? 'realistic',
    quality: 'standard',
  })

  return response.optimized_prompt
}
