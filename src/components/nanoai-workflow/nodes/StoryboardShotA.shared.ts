/**
 * StoryboardShotA 共享常量
 * 节点组件和属性面板共用
 */

import { client } from '@/lib/api/client'

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export const DEFAULT_PARAMS = {
  inputText: '',
  size: '1024x1024',
  quality: 'standard',
  style: 'realistic',
  batchCount: 1,
  temperature: 0.8,
  systemPromptTemplate: 'storyboard',
  model: 'glm-4.5-air',
  aspectRatio: '1:1' as AspectRatio,
}

export async function optimizePromptWithGLM(rawPrompt: string, opts: { temperature: number; systemPromptTemplate: string; model: string }): Promise<string> {
  const data = await client.post<{ optimized_prompt: string }>('/glm/optimize', {
    prompt: rawPrompt,
    model: opts.model,
    temperature: opts.temperature,
    system_prompt_template: opts.systemPromptTemplate,
  })
  return data.optimized_prompt
}
