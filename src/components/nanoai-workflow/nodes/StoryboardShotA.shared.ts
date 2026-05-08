/**
 * StoryboardShotA 共享常量
 * 节点组件和属性面板共用
 */

import { GLM_CONFIG } from '@/config/glm'

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

export const SYSTEM_PROMPT_TEMPLATES: Record<string, string> = {
  storyboard: `你是一个专业的故事板分镜提示词优化专家。根据用户提供的故事描述、场景设定等信息，生成高质量的分镜图片提示词。
优化规则：
1. 保留用户原始意图和核心故事内容
2. 添加详细画面描述（角色动作、表情、构图）
3. 指定光影效果和氛围（光线方向、色温、情绪基调）
4. 描述镜头语言（景别、视角、运动方向）
5. 明确画面风格（写实/动画/漫画等）和色调
6. 使用中文输出
7. 只输出优化后的提示词，不要添加解释或前缀`,
  character: `你是一个专业的角色设计提示词优化专家。根据用户的角色描述，生成高质量的AI图片生成提示词。
优化规则：
1. 详细描述角色的外貌、服装、表情和姿态
2. 指定光影效果（轮廓光、环境光、色温）
3. 明确画面构图（特写、半身、全身）和视角
4. 指定画风（写实/二次元/概念艺术）
5. 使用中文输出
6. 只输出优化后的提示词，不要添加解释或前缀`,
  scene: `你是一个专业的场景设计提示词优化专家。根据用户的场景描述，生成高质量的AI图片生成提示词。
优化规则：
1. 详细描述场景的空间布局、建筑、自然环境
2. 指定光影和氛围（时间、天气、情绪基调）
3. 明确镜头语言（广角/鸟瞰/低角度）和透视
4. 指定画风和色调
5. 使用中文输出
6. 只输出优化后的提示词，不要添加解释或前缀`,
  custom: `你是一个专业的AI图片提示词优化专家。根据用户的描述，生成高质量的图片生成提示词。
规则：
1. 保留用户原始意图
2. 添加画面细节描述（构图、光影、风格）
3. 使用中文输出
4. 只输出优化后的提示词`,
}

export async function optimizePromptWithGLM(rawPrompt: string, opts: { temperature: number; systemPromptTemplate: string; model: string }): Promise<string> {
  const apiKey = GLM_CONFIG.API_KEY
  if (!apiKey) throw new Error('GLM API Key 未配置（VITE_GLM_API_KEY）')

  const systemPrompt = SYSTEM_PROMPT_TEMPLATES[opts.systemPromptTemplate] || SYSTEM_PROMPT_TEMPLATES.storyboard

  const response = await fetch(`${GLM_CONFIG.API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请优化以下描述，生成图片提示词：\n${rawPrompt}` },
      ],
      temperature: opts.temperature,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`GLM API 错误 ${response.status}: ${err}`)
  }
  const data = await response.json()
  const optimized = data.choices?.[0]?.message?.content?.trim()
  if (!optimized) throw new Error('GLM 返回为空')
  return optimized
}
