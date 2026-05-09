/**
 * promptBuilder — 统一图片提示词构建工具
 * 所有图片节点共用，确保风格/画质/构图信息一致注入
 */

import { prefixResolution } from './StoryboardV2.shared'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

interface BuildImagePromptOptions {
  quality: string
  style: string
  aspectRatio?: AspectRatio | string
  mood?: string
  camera?: string
  negativePrompt?: string
}

const STYLE_KEYWORDS: Record<string, string> = {
  realistic: '写实风格，真实照片级，自然质感',
  anime: '日系动画风格，赛璐璐上色，鲜明色彩',
  comic: '美式漫画风格，粗犷线条，动态构图',
  watercolor: '水彩画风格，柔和晕染，轻盈通透',
  oil_painting: '油画风格，厚涂质感，丰富肌理',
  chinese: '中国水墨画风格，留白意境，淡雅笔触',
}

const ASPECT_HINTS: Record<string, string> = {
  '1:1': '方形构图',
  '16:9': '电影宽银幕横屏构图',
  '9:16': '竖屏构图',
  '4:3': '标准横屏构图',
  '3:4': '竖屏人像构图',
}

/**
 * 构建完整的图片生成提示词
 * @param raw GLM 返回的原始 visual_prompt
 * @param opts 风格/画质/比例/情绪/镜头等选项
 * @returns 增强后的完整提示词
 */
export function buildImagePrompt(raw: string, opts: BuildImagePromptOptions): string {
  if (!raw) return ''

  const parts: string[] = []

  // 1. 画质前缀（HD → 超高清，standard → 高清）
  const resPrefix = prefixResolution(opts.quality)
  if (resPrefix) parts.push(resPrefix)

  // 2. 风格关键词
  const styleKeyword = STYLE_KEYWORDS[opts.style]
  if (styleKeyword) parts.push(styleKeyword)

  // 3. 比例提示
  const aspectHint = ASPECT_HINTS[opts.aspectRatio || '']
  if (aspectHint) parts.push(aspectHint)

  // 4. 原始提示词（核心内容）
  parts.push(raw)

  // 5. 情绪/氛围增强
  if (opts.mood) parts.push(opts.mood)

  // 6. 镜头语言
  if (opts.camera) parts.push(opts.camera)

  return parts.filter(Boolean).join('，')
}

/**
 * 构建场景专用提示词（无人物）
 */
export function buildScenePrompt(raw: string, opts: BuildImagePromptOptions): string {
  const base = buildImagePrompt(raw, opts)
  return base ? `${base}，无人物，纯环境场景` : ''
}

/**
 * 构建角色提示词（动态结合角色描述）
 */
export function buildCharacterPrompt(
  charDescription: string,
  posePrompt: string,
  opts: BuildImagePromptOptions & { type: 'pose' | 'expression' | 'outfit' },
): string {
  const parts: string[] = []

  const resPrefix = prefixResolution(opts.quality)
  if (resPrefix) parts.push(resPrefix)

  const styleKeyword = STYLE_KEYWORDS[opts.style]
  if (styleKeyword) parts.push(styleKeyword)

  // 角色描述作为核心锚定
  if (charDescription) parts.push(charDescription)

  // 动作/表情/服饰提示词
  parts.push(posePrompt)

  // 类型特定后缀
  if (opts.type === 'pose') {
    parts.push('全身站立，清晰对焦')
  } else if (opts.type === 'expression') {
    parts.push('面部特写，细腻表情')
  } else if (opts.type === 'outfit') {
    parts.push('服装细节，配饰清晰')
  }

  parts.push('16:9')

  return parts.filter(Boolean).join('，')
}
