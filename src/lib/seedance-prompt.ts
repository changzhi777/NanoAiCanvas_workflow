/**
 * Seedance 2.0 提示词规范常量
 * 基于火山引擎官方提示词指南
 *
 * 6 步公式: 主体 → 动作 → 环境 → 镜头运动 → 风格 → 约束
 * 最佳长度: 60-100 词（英文）
 */

// ==================== 镜头运动（8 类） ====================

export const CAMERA_MOVEMENTS = [
  { value: 'push-in', label: '推镜头 (Push-in)', en: 'slow push-in' },
  { value: 'pull-out', label: '拉镜头 (Pull-out)', en: 'slow pull-out / dolly out' },
  { value: 'lateral', label: '横移 (Pan)', en: 'lateral motion / pan' },
  { value: 'tracking', label: '跟拍 (Tracking)', en: 'tracking shot / follow' },
  { value: 'orbit', label: '环绕 (Orbit)', en: 'orbit / arc shot' },
  { value: 'aerial', label: '航拍 (Aerial)', en: 'aerial / drone shot' },
  { value: 'handheld', label: '手持 (Handheld)', en: 'handheld camera' },
  { value: 'fixed', label: '固定 (Fixed)', en: 'fixed / locked-off camera' },
] as const

// ==================== 光线描述 ====================

export const LIGHT_DESCRIPTIONS = [
  { value: 'golden_hour', label: '黄金时刻', en: 'soft golden hour lighting' },
  { value: 'rim_light', label: '轮廓光', en: 'dramatic rim light against dark background' },
  { value: 'natural', label: '自然光', en: 'soft natural window light' },
  { value: 'neon', label: '霓虹灯', en: 'neon-lit, colorful reflections' },
  { value: 'backlit', label: '逆光', en: 'backlit silhouette, sun flare' },
  { value: 'overcast', label: '阴天柔光', en: 'even overcast diffused light' },
  { value: 'studio', label: '影棚光', en: 'professional studio lighting, softbox' },
  { value: 'dramatic', label: '戏剧光', en: 'dramatic chiaroscuro lighting' },
] as const

// ==================== 风格关键词 ====================

export const VIDEO_STYLES = [
  { value: 'cinematic', label: '电影感', en: 'cinematic film tone, 35mm' },
  { value: 'realistic', label: '写实', en: 'realistic, natural, documentary style' },
  { value: 'anime', label: '动画', en: 'Japanese anime style, cel-shaded' },
  { value: 'vintage', label: '复古胶片', en: 'film grain, analog vintage look' },
  { value: 'dreamy', label: '梦幻', en: 'dreamy, ethereal, soft focus' },
  { value: 'commercial', label: '商业广告', en: 'clean commercial look, product showcase' },
  { value: 'documentary', label: '纪录片', en: 'documentary, handheld, natural light' },
  { value: 'moody', label: '情绪暗调', en: 'moody, desaturated, low-key lighting' },
] as const

// ==================== 负面提示词 ====================

export const NEGATIVE_PROMPTS = [
  { value: 'avoid_jitter', label: '画面抖动', en: 'avoid jitter' },
  { value: 'avoid_bent_limbs', label: '肢体扭曲', en: 'avoid bent limbs' },
  { value: 'avoid_flicker', label: '时间闪烁', en: 'avoid temporal flicker' },
  { value: 'avoid_identity_drift', label: '特征漂移', en: 'avoid identity drift' },
  { value: 'avoid_chaos', label: '构图混乱', en: 'avoid chaotic composition' },
] as const

// ==================== 节奏速度词 ====================

export const PACING_KEYWORDS = [
  { value: 'imperceptible', label: '极慢（几乎静止）', en: 'imperceptible, barely noticeable' },
  { value: 'slow', label: '缓慢', en: 'slow, gentle, gradual' },
  { value: 'smooth', label: '平稳', en: 'smooth, controlled, steady' },
  { value: 'dynamic', label: '动感（慎用）', en: 'dynamic, swift' },
] as const

/**
 * 构建 Seedance 2.0 标准视频提示词
 * 公式: [主体动作] + [环境/光线] + [镜头运动] + [风格] + [约束]
 */
export function buildSeedanceVideoPrompt(opts: {
  subject?: string
  action?: string
  environment?: string
  camera?: string
  light?: string
  style?: string
  pacing?: string
  negativePrompts?: string[]
}): string {
  const parts: string[] = []

  if (opts.subject || opts.action) {
    const sub = [opts.subject, opts.action].filter(Boolean).join(', ')
    parts.push(sub)
  }

  if (opts.environment) parts.push(opts.environment)

  const lightAndStyle: string[] = []
  if (opts.light) lightAndStyle.push(opts.light)
  if (opts.style) lightAndStyle.push(opts.style)
  if (lightAndStyle.length) parts.push(lightAndStyle.join(', '))

  if (opts.camera) parts.push(`camera ${opts.camera}`)

  if (opts.pacing) parts.push(opts.pacing)

  if (opts.negativePrompts?.length) {
    parts.push(opts.negativePrompts.join(', '))
  }

  return parts.filter(Boolean).join('. ') + '.'
}
