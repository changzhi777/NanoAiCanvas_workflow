/**
 * StoryboardV2 共享常量与类型
 * 剧本生成 → 多节点并行执行架构
 */

import { client } from '@/lib/api/client'

// ==================== 类型定义 ====================

export interface CharacterDesign {
  name: string
  role: string
  description: string
  pose_prompts: string[]
  expression_prompts: string[]
  outfit_prompts: string[]
}

export interface SceneDesign {
  scene_number: number
  location: string
  time_of_day: string
  description: string
  visual_prompt: string
  mood: string
}

export interface ScreenplayShot {
  shot_number: number
  scene_number: number
  description: string
  visual_prompt: string
  camera_angle: string
  dialogue: Array<{ character: string; line: string }>
  mood: string
  duration: string
}

export interface ScriptTableEntry {
  shot_number: number
  scene_location: string
  description: string
  dialogue_summary: string
  camera: string
  mood: string
  duration: string
}

export interface ScreenplayData {
  title: string
  logline: string
  characters: CharacterDesign[]
  scenes: SceneDesign[]
  shots: ScreenplayShot[]
  script_table: ScriptTableEntry[]
}

// ==================== 默认参数 ====================

export const DEFAULT_V2_PARAMS = {
  inputText: '',
  shotCount: 6,
  style: 'realistic',
  quality: 'hd',
  temperature: 0.7,
  model: 'glm-4.5-air',
  aspectRatio: '16:9' as const,
}

// ==================== API 调用 ====================

export async function generateScreenplay(premise: string, opts: {
  shotCount?: number
  style?: string
  quality?: string
  model?: string
  temperature?: number
}): Promise<ScreenplayData> {
  const data = await client.post<{ screenplay: ScreenplayData }>('/glm/screenplay', {
    premise,
    shot_count: opts.shotCount || 6,
    style: opts.style || 'realistic',
    quality: opts.quality || 'hd',
    model: opts.model || 'glm-4.5-air',
    temperature: opts.temperature ?? 0.7,
  })
  return data.screenplay
}

// 生成图片的提示词前缀，注入分辨率
export function prefixResolution(quality: string): string {
  if (quality === 'hd') return '超高清画质，极致细节，4K分辨率，'
  if (quality === 'standard') return '高清画质，2K分辨率，'
  return ''
}
