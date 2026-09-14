/**
 * Kimi（Moonshot）API 服务
 * 提供文本生成、长文本处理能力
 */

import { KIMI_CONFIG } from '@/config/kimi';
import { getModelCode } from './model-routing';

// ==================== 类型定义 ====================

export interface KimiTextParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface KimiLongContextParams {
  model?: string;
  document: string;
  query: string;
  maxTokens?: number;
}

export interface KimiResponse {
  code: number;
  msg: string;
  data: {
    choices: Array<{ message: { content: string } }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}

// ==================== 通用请求方法 ====================

async function kimiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${KIMI_CONFIG.API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIMI_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Kimi API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== 文本生成 ====================

export async function generateText(
  params: KimiTextParams
): Promise<string> {
  const response = await kimiRequest<KimiResponse>('/text/chatcompletion', {
    model: params.model || getModelCode('kimi_text', KIMI_CONFIG.MODELS.TEXT),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1024,
    top_p: params.topP ?? 0.9,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`Kimi文本生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 长文本处理 ====================

export async function processLongContext(
  params: KimiLongContextParams
): Promise<string> {
  const response = await kimiRequest<KimiResponse>('/text/longcontext', {
    model: params.model || getModelCode('kimi_longcontext', KIMI_CONFIG.MODELS.LONGCONTEXT),
    document: params.document,
    query: params.query,
    max_tokens: params.maxTokens ?? 4096,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`Kimi长文本处理失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 导出 ====================

export const kimiApi = {
  generateText,
  processLongContext,
};

export default kimiApi;