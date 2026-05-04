/**
 * 通义千问（阿里）API 服务
 * 提供文本生成、代码生成能力
 */

import { QWEN_CONFIG } from '@/config/qwen';

// ==================== 类型定义 ====================

export interface QwenTextParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface QwenCodingParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface QwenResponse {
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

async function qwenRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${QWEN_CONFIG.API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_CONFIG.API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`通义千问API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== 文本生成 ====================

export async function generateText(
  params: QwenTextParams
): Promise<string> {
  const response = await qwenRequest<QwenResponse>('/text/chatcompletion', {
    model: params.model || QWEN_CONFIG.MODELS.TEXT,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1024,
    top_p: params.topP ?? 0.9,
    top_k: params.topK ?? 50,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`通义千问文本生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 代码生成 ====================

export async function generateCode(
  params: QwenCodingParams
): Promise<string> {
  const response = await qwenRequest<QwenResponse>('/code/generation', {
    model: params.model || QWEN_CONFIG.MODELS.CODING,
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 2048,
  });

  if (response.code !== 0 && response.code !== 200) {
    throw new Error(`通义千问代码生成失败: ${response.msg}`);
  }

  return response.data.choices[0]?.message?.content || '';
}

// ==================== 导出 ====================

export const qwenApi = {
  generateText,
  generateCode,
};

export default qwenApi;