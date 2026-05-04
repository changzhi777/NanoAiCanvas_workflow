/**
 * 提示词增强服务
 * 基于 MiniMax Token Plan (M2.7) 提供多种增强模式
 * 使用 Anthropic API 兼容格式
 */

import type { EnhanceMode, EnhanceOptions } from '@/types/image'

// MiniMax Token Plan API (Anthropic 兼容格式)
const MINIMAX_API_URL = 'https://api.minimaxi.com/anthropic/v1/messages'
const MINIMAX_MODEL = 'MiniMax-M2.7'

// 生成随机参数
function getRandomParams() {
  const temperature = 0.7 + Math.random() * 0.25
  const top_p = 0.85 + Math.random() * 0.13
  return { temperature, top_p }
}

// 根据预设选项生成上下文描述
function buildOptionsContext(options?: EnhanceOptions): string {
  if (!options) return ''

  const contextParts: string[] = []

  if (options.styleLabel) {
    contextParts.push(`风格：${options.styleLabel}`)
  }
  if (options.shotTypeLabel && options.shotTypeLabel !== '不选择') {
    contextParts.push(`构图/景别：${options.shotTypeLabel}`)
  }
  if (options.cameraAngleLabel && options.cameraAngleLabel !== '不选择') {
    contextParts.push(`拍摄角度：${options.cameraAngleLabel}`)
  }
  if (options.lensTypeLabel && options.lensTypeLabel !== '不选择') {
    contextParts.push(`镜头类型：${options.lensTypeLabel}`)
  }
  if (options.focusLabel && options.focusLabel !== '不选择') {
    contextParts.push(`对焦/景深：${options.focusLabel}`)
  }
  if (options.lightingLabel && options.lightingLabel !== '不选择') {
    contextParts.push(`光影：${options.lightingLabel}`)
  }
  if (options.technicalLabel && options.technicalLabel !== '不选择') {
    contextParts.push(`特殊技术：${options.technicalLabel}`)
  }
  if (options.cameraModelLabel && options.cameraModelLabel !== '不选择') {
    contextParts.push(`相机/胶片：${options.cameraModelLabel}`)
  }
  if (options.atmosphereLabel && options.atmosphereLabel !== '不选择') {
    contextParts.push(`氛围/时间：${options.atmosphereLabel}`)
  }

  return contextParts.length > 0 ? `\n\n用户已选择的预设选项：\n${contextParts.join('\n')}` : ''
}

// 增强模式系统提示词
function buildModeSystemPrompt(mode: EnhanceMode, options?: EnhanceOptions): string {
  const optionsContext = buildOptionsContext(options)

  const modePrompts: Record<EnhanceMode, string> = {
    standard: `你是专业的AI图像提示词优化专家。
请根据用户输入的简单描述，生成高质量的图像生成提示词。

【重要格式规则 - 必须严格遵守】
1. 主体描述：必须使用中文，保持用户原始意图
2. 视觉细节：光影、构图、质感、色彩、氛围等描述用中文
3. 风格/质量词：必须使用英文，如 high quality, detailed, masterpiece, professional photography
4. 技术术语：相机参数、镜头类型等用英文，如 50mm lens, f/2.8 aperture, shallow depth of field

优化规则：
- 保持用户原始意图不变，这是最重要的原则
- 添加视觉细节（光影、构图、质感、色彩、氛围）
- 保持简洁，不超过100词
- 每次优化要有创意，使用不同的表达方式和词汇选择
- 如果用户提供了预设选项，要融入这些选项对应的专业术语${optionsContext}

输出格式示例：一匹白色骏马在金色夕阳下奔跑，逆光剪影效果，马鬃随风飞扬，golden hour lighting, dynamic composition, high quality, detailed, masterpiece

直接输出优化后的提示词，不要解释或添加任何其他内容。`,

    creative: `你是富有创意的AI图像提示词艺术家。
用户需要你发挥创意，将简单的描述转化为令人惊艳的视觉作品。

【重要格式规则 - 必须严格遵守】
1. 主体描述：必须使用中文，保持用户原始意图
2. 视觉效果：戏剧性光影、色彩、氛围等描述用中文
3. 艺术术语：风格/效果词用英文，如 cinematic, dramatic, ethereal, volumetric lighting
4. 技术参数：相机/镜头参数用英文

创意优化规则：
- 深度理解用户的核心诉求，发挥创意将其升华
- 添加戏剧性的视觉效果和艺术元素
- 可以适度添加与主题相关的联想元素
- 保持提示词的连贯性和可生成性
- 融入用户选择的预设选项${optionsContext}

输出格式示例：一匹白色骏马在金色夕阳下奔跑，逆光剪影，马鬃尾巴飞扬如火焰，cinematic lighting, dramatic backlight, volumetric fog, high quality, masterpiece

直接输出优化后的提示词，不要解释或添加任何其他内容。`,

    detailed: `你是追求极致细节的AI图像提示词工程师。
你的任务是将简单的描述分解并重建为具有专业深度的详细提示词。

【重要格式规则 - 必须严格遵守】
1. 主体描述：必须使用中文，保持用户原始意图
2. 详细描述：外观、材质、纹理、空间关系等用中文
3. 专业术语：摄影/艺术术语用英文，如 bokeh, rim light, Rembrandt lighting
4. 相机参数：镜头/光圈等用英文，如 85mm portrait lens, f/1.8, shallow depth of field

细节优化规则：
- 分解场景为多个视觉层次（主体、背景、前景、点缀）
- 精确描述每个元素的外观、材质、纹理
- 描述光线的方向、强度、色温、软硬
- 添加构图指导和空间关系描述
- 融入用户选择的预设选项${optionsContext}

输出格式示例：一匹白色骏马在金色夕阳下奔跑，鬃毛飘逸如丝，肌肉线条分明，golden hour sunlight, warm orange tones, long shadow, 85mm portrait lens, f/1.8 aperture, shallow depth of field, bokeh background, professional photography, high quality, detailed, masterpiece

直接输出优化后的提示词，不要解释或添加任何其他内容。`,

    cinematic: `你是电影级AI图像提示词导演。
用户需要你以导演的视角，将描述转化为具有电影质感的画面。

【重要格式规则 - 必须严格遵守】
1. 场景描述：必须使用中文，保持用户原始意图
2. 氛围描述：情绪张力、电影感等用中文
3. 电影术语：镜头语言、布光术语用英文，如 three-point lighting, rim light, Dutch angle
4. 技术参数：相机/镜头参数用英文

电影级优化规则：
- 营造电影般的氛围和情绪张力
- 添加电影镜头语言（景别、运动、角度）
- 描述电影级的布光（主光、辅助光、轮廓光、背景光）
- 添加景深和焦点控制的描述
- 考虑画面宽高比和构图比例
- 融入用户选择的预设选项${optionsContext}

输出格式示例：一匹白色骏马在金色夕阳下奔跑，剪影效果拉长身影，远处大草原延展至地平线，cinematic lighting, golden hour glow, rim light silhouette, wide angle lens, anamorphic bokeh, film grain, high quality, professional cinematography, masterpiece

直接输出优化后的提示词，不要解释或添加任何其他内容。`,
  }

  return modePrompts[mode] || modePrompts.standard
}

export interface EnhancePromptOptions {
  prompt: string
  apiKey: string
  options?: EnhanceOptions
  mode?: EnhanceMode
}

/**
 * 增强提示词（使用 MiniMax Token Plan M2.7，Anthropic 兼容格式）
 * @param options 增强选项
 * @returns 增强后的提示词
 */
export async function enhancePrompt(options: EnhancePromptOptions): Promise<string> {
  const { prompt, apiKey, options: presetOptions, mode = 'standard' } = options

  const { temperature, top_p } = getRandomParams()

  const systemPrompt = buildModeSystemPrompt(mode, presetOptions)

  console.log('[enhancePrompt] MiniMax M2.7 Mode:', mode, 'Random params:', { temperature: temperature.toFixed(2), top_p: top_p.toFixed(2) })

  const response = await fetch(MINIMAX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      max_tokens: 1024,
      temperature,
      top_p,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `用户输入：${prompt}` },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[enhancePrompt] MiniMax API Error:', response.status, errorText)
    throw new Error(`MiniMax API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Anthropic 格式: data.content 是一个数组，包含 text 类型的 block
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text')
  const enhancedContent = textBlock?.text || data.content?.[0]?.text || ''

  if (!enhancedContent) {
    console.warn('[enhancePrompt] No enhanced content found, using original prompt')
    return prompt
  }

  return enhancedContent.trim()
}

/**
 * 批量增强多个提示词
 * @param prompts 要增强的提示词数组
 * @param apiKey API Key
 * @param options 增强选项
 * @param onProgress 进度回调
 * @returns 增强后的提示词数组
 */
export async function enhancePromptsBatch(
  prompts: string[],
  apiKey: string,
  options?: EnhanceOptions,
  mode?: EnhanceMode,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = []

  for (let i = 0; i < prompts.length; i++) {
    const enhanced = await enhancePrompt({
      prompt: prompts[i],
      apiKey,
      options,
      mode,
    })
    results.push(enhanced)
    onProgress?.(i + 1, prompts.length)
  }

  return results
}
