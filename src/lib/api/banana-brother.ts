/**
 * 香蕉哥哥 AI 助手 API 封装
 * - 语音对话：复用 RealtimeVoiceClient
 * - 提示词总结：GLM-4V-Flash 多模态模型
 */

import { BANANA_BROTHER_INSTRUCTIONS } from '@/stores/nanoImageBananaBrotherStore'
import { DEFAULT_SESSION_CONFIG, type SessionConfig } from './realtime-voice'

// 固定配置
export const BANANA_BROTHER_CONFIG = {
  voice: 'male-qn-jingying',  // 精英青年音色
  model: 'glm-realtime-flash' as const,
  temperature: 0.7,
}

// GLM-4V-Flash API 配置
const GLM_4V_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

/**
 * 提示词总结请求参数
 */
export interface SummarizePromptParams {
  apiKey: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  referenceImageUrl?: string | null
}

/**
 * 提示词总结响应
 */
export interface SummarizePromptResult {
  prompt: string
  success: boolean
  error?: string
}

/**
 * 使用 GLM-4V-Flash 总结生图提示词
 */
export async function summarizePromptWithVision(
  params: SummarizePromptParams
): Promise<SummarizePromptResult> {
  const { apiKey, conversationHistory, referenceImageUrl } = params

  try {
    // 构建消息
    const messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = [
      {
        role: 'system',
        content: `你是一个专业的AI绘图提示词总结助手。根据对话内容，总结生成英文AI绘图提示词。

提示词结构：
1. 主体描述（Subject）
2. 风格（Style）
3. 构图（Composition）
4. 光影（Lighting）
5. 技术参数（quality words）

直接输出英文提示词，无前缀或解释。`,
      },
    ]

    // 添加对话历史（仅保留最近 10 条，避免 token 过多）
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // 如果有参考图，构建多模态消息
    if (referenceImageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: '参考这张图片，结合之前的对话，总结生成英文绘图提示词。' },
          { type: 'image_url', image_url: { url: referenceImageUrl } },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: '请根据对话内容，总结生成英文绘图提示词。',
      })
    }

    const response = await fetch(GLM_4V_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4v-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const prompt = data.choices?.[0]?.message?.content || ''

    return {
      prompt: prompt.trim(),
      success: true,
    }
  } catch (error) {
    console.error('[BananaBrother] Summarize error:', error)
    return {
      prompt: '',
      success: false,
      error: error instanceof Error ? error.message : '总结失败',
    }
  }
}

/**
 * 获取香蕉哥哥会话配置
 */
export function getBananaBrotherSessionConfig(): SessionConfig {
  return {
    ...DEFAULT_SESSION_CONFIG,
    model: BANANA_BROTHER_CONFIG.model,
    voice: BANANA_BROTHER_CONFIG.voice,
    instructions: BANANA_BROTHER_INSTRUCTIONS,
    temperature: BANANA_BROTHER_CONFIG.temperature,
    greetingConfig: {
      enable: true,
      content: '你好呀！我是香蕉哥哥，有什么想画的吗？跟我说说看~',
    },
  }
}
