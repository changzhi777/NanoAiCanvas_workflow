/**
 * StoryboardShotA 共享常量
 * 节点组件和属性面板共用
 */

import { client } from '@/lib/api/client'

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
export type LayoutDirection = 'horizontal' | 'vertical'

export interface StoryboardShot {
  shot_number: number
  scene_description: string
  visual_prompt: string
  camera_angle: string
  mood: string
  imageUrl?: string
}

export interface StoryboardScript {
  title: string
  shots: StoryboardShot[]
}

export const SIZE_OPTIONS: Record<AspectRatio, { label: string; value: string; tier: '1K' | '2K' | '4K' }[]> = {
  '1:1': [
    { label: '512×512', value: '512x512', tier: '1K' },
    { label: '1024×1024', value: '1024x1024', tier: '1K' },
    { label: '1536×1536', value: '1536x1536', tier: '2K' },
    { label: '2048×2048', value: '2048x2048', tier: '4K' },
  ],
  '16:9': [
    { label: '912×512', value: '912x512', tier: '1K' },
    { label: '1024×576', value: '1024x576', tier: '1K' },
    { label: '1280×720', value: '1280x720', tier: '1K' },
    { label: '1536×864', value: '1536x864', tier: '2K' },
    { label: '1920×1080', value: '1920x1080', tier: '4K' },
  ],
  '9:16': [
    { label: '512×912', value: '512x912', tier: '1K' },
    { label: '576×1024', value: '576x1024', tier: '1K' },
    { label: '720×1280', value: '720x1280', tier: '1K' },
    { label: '864×1536', value: '864x1536', tier: '2K' },
    { label: '1080×1920', value: '1080x1920', tier: '4K' },
  ],
  '4:3': [
    { label: '680×512', value: '680x512', tier: '1K' },
    { label: '1024×768', value: '1024x768', tier: '1K' },
    { label: '1536×1152', value: '1536x1152', tier: '2K' },
    { label: '2048×1536', value: '2048x1536', tier: '4K' },
  ],
  '3:4': [
    { label: '512×680', value: '512x680', tier: '1K' },
    { label: '768×1024', value: '768x1024', tier: '1K' },
    { label: '1152×1536', value: '1152x1536', tier: '2K' },
    { label: '1536×2048', value: '1536x2048', tier: '4K' },
  ],
}

export function getDefaultSize(ratio: AspectRatio): string {
  return SIZE_OPTIONS[ratio][1].value
}

export function getSizeTier(size: string): '1K' | '2K' | '4K' {
  for (const options of Object.values(SIZE_OPTIONS)) {
    const found = options.find(o => o.value === size)
    if (found) return found.tier
  }
  return '1K'
}

// 节点画布显示尺寸（基于比例自动计算，不使用拖拽）
export const NODE_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 240, height: 240 },
  '16:9': { width: 320, height: 180 },
  '9:16': { width: 180, height: 320 },
  '4:3': { width: 280, height: 210 },
  '3:4': { width: 210, height: 280 },
}

export const DEFAULT_PARAMS = {
  inputText: '',
  size: '1024x1024',
  quality: 'standard',
  style: 'realistic',
  batchCount: 1,
  shotCount: 6,
  layoutDirection: 'horizontal' as LayoutDirection,
  temperature: 0.8,
  systemPromptTemplate: 'storyboard',
  model: 'glm-4.5-air',
  aspectRatio: '1:1' as AspectRatio,
}

export async function optimizePromptWithGLM(rawPrompt: string, opts: { temperature: number; systemPromptTemplate: string; model: string; style?: string; quality?: string }): Promise<string> {
  const data = await client.post<{ optimized_prompt: string }>('/glm/optimize', {
    prompt: rawPrompt,
    model: opts.model,
    temperature: opts.temperature,
    system_prompt_template: opts.systemPromptTemplate,
    style: opts.style || 'realistic',
    quality: opts.quality || 'standard',
  })
  return data.optimized_prompt
}

export async function generateStoryboardScript(prompt: string, opts: { shotCount: number; model: string; temperature: number; style?: string; quality?: string }): Promise<StoryboardScript> {
  const data = await client.post<{ script: StoryboardScript }>('/glm/storyboard-script', {
    prompt,
    shot_count: opts.shotCount,
    model: opts.model,
    temperature: opts.temperature,
    style: opts.style || 'realistic',
    quality: opts.quality || 'standard',
  })
  return data.script
}
