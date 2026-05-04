/**
 * 提示词限制词库 API
 */
import { client } from './client'

export interface PromptRestrictionCategory {
  id: number
  name: string
  description: string | null
  is_active: number
  word_count: number
}

export interface PromptRestrictionWord {
  id: number
  category_id: number
  word: string
  alternative: string | null
  severity: number
  is_active: number
}

export interface PromptCheckResult {
  is_safe: boolean
  violations: Array<{
    word: string
    alternative: string | null
    severity: number
    message: string
  }>
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

export const promptRestrictionsApi = {
  /**
   * 获取所有分类
   */
  async getCategories(): Promise<PromptRestrictionCategory[]> {
    return client.get<PromptRestrictionCategory[]>('/prompt-restrictions/categories', getToken() || undefined)
  },

  /**
   * 获取所有限制词
   */
  async getWords(categoryId?: number): Promise<PromptRestrictionWord[]> {
    const params = categoryId ? `?category_id=${categoryId}` : ''
    return client.get<PromptRestrictionWord[]>(`/prompt-restrictions/words${params}`, getToken() || undefined)
  },

  /**
   * 检查提示词是否包含限制词
   */
  async checkPrompt(prompt: string): Promise<PromptCheckResult> {
    return client.post<PromptCheckResult>('/prompt-restrictions/check', { prompt }, getToken() || undefined)
  },

  /**
   * 创建分类
   */
  async createCategory(data: { name: string; description?: string }): Promise<PromptRestrictionCategory> {
    return client.post<PromptRestrictionCategory>('/prompt-restrictions/categories', data, getToken() || undefined)
  },

  /**
   * 创建限制词
   */
  async createWord(data: { category_id: number; word: string; alternative?: string; severity?: number }): Promise<PromptRestrictionWord> {
    return client.post<PromptRestrictionWord>('/prompt-restrictions/words', data, getToken() || undefined)
  },

  /**
   * 删除限制词
   */
  async deleteWord(wordId: number): Promise<void> {
    return client.delete(`/prompt-restrictions/words/${wordId}`, getToken() || undefined)
  },

  /**
   * 删除分类
   */
  async deleteCategory(categoryId: number): Promise<void> {
    return client.delete(`/prompt-restrictions/categories/${categoryId}`, getToken() || undefined)
  },
}
