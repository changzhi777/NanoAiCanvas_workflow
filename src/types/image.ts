/**
 * 图片生成统一类型定义
 * 为 nano2 页面文生图功能提供统一的类型系统
 */

// ==================== 图片模型 ====================

/** 图片模型 ID */
export type ImageModelId = 'nano-banana2' | 'nano-banana-pro' | 'gpt-image-2'

/** 图片模型选项 */
export interface ImageModelOption {
  value: ImageModelId
  label: string
  description: string
}

// ==================== 生成参数 ====================

/** 基础生成参数 */
export interface ImageGenerationParams {
  /** 提示词 */
  prompt: string
  /** 模型 ID (可选，适配器使用自己的模型) */
  model?: ImageModelId
  /** 尺寸 */
  size: '1K' | '2K' | '4K'
  /** 宽高比 */
  aspectRatio: string
  /** 参考图 URL 数组（用于融图） */
  urls?: string[]
  /** AbortSignal */
  signal?: AbortSignal
}

// ==================== 高级参数 ====================

/** 风格选项 */
export type StylePreset =
  | 'realistic' | 'anime' | 'oil-painting' | 'watercolor' | 'sketch' | '3d'
  | 'cyberpunk' | 'steampunk' | 'fantasy' | 'ghibli' | 'pop-art' | 'minimalist'
  | 'pixel' | 'concept-art'
  // 扩展风格
  | 'impressionist' | 'ukiyo-e' | 'art-nouveau' | 'brutalist' | 'synthwave' | 'noir'

/** 构图/景别 */
export type ShotType =
  | 'none' | 'extreme-close-up' | 'close-up' | 'medium-shot' | 'full-shot'
  | 'long-shot' | 'extreme-long-shot' | 'cowboy-shot' | 'over-the-shoulder'
  | 'pov' | 'selfie-shot' | 'two-shot' | 'group-shot' | 'symmetrical'
  | 'rule-of-thirds' | 'frame-within-frame'

/** 拍摄角度 */
export type CameraAngle =
  | 'none' | 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye' | 'worms-eye'
  | 'drone-view' | 'dutch-angle' | 'side-profile' | 'wide-angle' | 'back-view'
  | 'overhead' | 'ultra-wide' | 'isometric' | 'fisheye'

/** 镜头类型 */
export type LensType =
  | 'none' | 'macro-lens' | 'telephoto-lens' | 'tilt-shift' | 'anamorphic'
  | '16mm-wide' | '24mm-wide' | '35mm-humanist' | '50mm-standard' | '85mm-portrait'
  | '100mm-macro-portrait' | '200mm-telephoto' | 'wide-aperture' | 'narrow-aperture'
  | 'f1.2' | 'f1.8' | 'f2.8' | 'f8' | 'f16' | 'f22'

/** 对焦/景深 */
export type FocusMode =
  | 'none' | 'depth-of-field' | 'shallow-dof' | 'deep-focus' | 'bokeh'
  | 'motion-blur' | 'rack-focus' | 'soft-focus' | 'sharp-focus' | 'hyper-realistic'

/** 光影 */
export type LightingMode =
  | 'none' | 'cinematic-lighting' | 'natural-light' | 'golden-hour' | 'blue-hour'
  | 'volumetric' | 'rembrandt' | 'chiaroscuro' | 'rim-light' | 'backlight'
  | 'softbox' | 'hard-light' | 'neon-light' | 'bioluminescence' | 'moody-lighting'
  | 'studio-lighting' | 'lens-flare' | 'global-illumination' | 'ray-tracing'
  // 扩展光影
  | 'submarine' | 'candlelight' | 'firelight' | 'moonlight' | 'aurora' | 'bioluminescent'

/** 特殊技术 */
export type TechnicalMode =
  | 'none' | 'long-exposure' | 'double-exposure' | 'light-painting' | 'stop-motion'
  | 'time-lapse' | 'chromatic-aberration' | 'vignetting' | 'film-grain' | 'hdr'

/** 相机/胶片 */
export type CameraModel =
  | 'none' | 'gopro' | 'cctv' | 'dashcam' | 'polaroid'
  | 'kodak-portra-400' | 'fuji-velvia' | 'ilford-hp5' | 'kodachrome'
  | 'vhs' | '8mm-film' | '35mm-film' | 'imax'

/** 氛围 */
export type AtmosphereMode =
  | 'none' | 'day' | 'night' | 'sunset' | 'foggy' | 'rainy' | 'snowy'

// ==================== 扩展参数维度 ====================

/** 画质 */
export type QualityLevel = 'auto' | 'standard' | 'premium' | 'ultra'

/** 饱和度 */
export type SaturationLevel = 'none' | 'desaturated' | 'natural' | 'vibrant' | 'hyper-saturated'

/** 对比度 */
export type ContrastLevel = 'none' | 'low' | 'natural' | 'high' | 'dramatic'

/** 噪点/颗粒 */
export type NoiseLevel = 'none' | 'fine' | 'medium' | 'heavy' | 'film-grain'

// ==================== 完整参数 ====================

/** 完整生成参数（包含所有高级参数） */
export interface FullGenerationParams extends ImageGenerationParams {
  /** 风格 */
  style?: StylePreset
  /** 构图 */
  shotType?: ShotType
  /** 角度 */
  cameraAngle?: CameraAngle
  /** 镜头 */
  lensType?: LensType
  /** 对焦 */
  focus?: FocusMode
  /** 光影 */
  lighting?: LightingMode
  /** 技术 */
  technical?: TechnicalMode
  /** 相机 */
  cameraModel?: CameraModel
  /** 氛围 */
  atmosphere?: AtmosphereMode
  /** 画质 */
  quality?: QualityLevel
  /** 饱和度 */
  saturation?: SaturationLevel
  /** 对比度 */
  contrast?: ContrastLevel
  /** 噪点 */
  noise?: NoiseLevel
}

// ==================== 生成结果 ====================

/** 生成结果 */
export interface ImageGenerationResult {
  /** 生成的图片 URL 数组 */
  images: string[]
  /** 任务 ID */
  taskId: string
  /** 状态 */
  status: 'success' | 'failed'
  /** 错误信息 */
  error?: string
}

// ==================== 批量任务 ====================

/** 单个批量任务项 */
export interface BatchTaskItem {
  id: string
  prompt: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string[]
  error?: string
}

/** 批量任务 */
export interface BatchTask {
  id: string
  items: BatchTaskItem[]
  model: ImageModelId
  params: Omit<FullGenerationParams, 'prompt' | 'model'>
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  progress: number
  createdAt: string
}

// ==================== 提示词模板 ====================

/** 提示词模板 */
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  template: string
  params: Partial<Omit<FullGenerationParams, 'prompt' | 'model'>>
  createdAt: string
}

// ==================== 提示词增强 ====================

/** 增强模式 */
export type EnhanceMode = 'standard' | 'creative' | 'detailed' | 'cinematic'

/** 增强选项 */
export interface EnhanceOptions {
  mode?: EnhanceMode
  styleLabel?: string
  shotTypeLabel?: string
  cameraAngleLabel?: string
  lensTypeLabel?: string
  focusLabel?: string
  lightingLabel?: string
  technicalLabel?: string
  cameraModelLabel?: string
  atmosphereLabel?: string
}
