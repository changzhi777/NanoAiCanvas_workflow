// Image model options
export const IMAGE_MODEL_OPTIONS = [
  { value: 'nano-banana2', label: 'Nano Banana2', description: '多图融合' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', description: '专业版' },
  { value: 'gpt-image-2', label: 'GPT Image 2', description: 'OpenAI图像模型' },
] as const

export type ImageModelType = (typeof IMAGE_MODEL_OPTIONS)[number]['value']

// Size options
export const SIZE_OPTIONS = [
  { value: '1K', label: '1K (1024px)' },
  { value: '2K', label: '2K (2048px)' },
  { value: '4K', label: '4K (4096px)' },
] as const

// Aspect ratio options
export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '正方形 1:1' },
  { value: '16:9', label: '横版 16:9' },
  { value: '9:16', label: '竖版 9:16' },
  { value: '4:3', label: '横版 4:3' },
  { value: '3:4', label: '竖版 3:4' },
  { value: '3:2', label: '横版 3:2' },
  { value: '2:3', label: '竖版 2:3' },
] as const

// Style presets - 扩展版本（步骤2.1-A：新增6种风格）
export const STYLE_PRESETS = [
  { value: 'none', label: '不选择' },
  { value: 'realistic', label: '写实风格' },
  { value: 'anime', label: '动漫风格' },
  { value: 'oil-painting', label: '油画风格' },
  { value: 'watercolor', label: '水彩风格' },
  { value: 'sketch', label: '素描风格' },
  { value: '3d', label: '3D渲染' },
  { value: 'cyberpunk', label: '赛博朋克' },
  { value: 'steampunk', label: '蒸汽朋克' },
  { value: 'fantasy', label: '奇幻风格' },
  { value: 'ghibli', label: '吉卜力风' },
  { value: 'pop-art', label: '波普艺术' },
  { value: 'minimalist', label: '极简风格' },
  { value: 'pixel', label: '像素风格' },
  { value: 'concept-art', label: '概念艺术' },
  // 扩展风格
  { value: 'impressionist', label: '印象派' },
  { value: 'ukiyo-e', label: '浮世绘' },
  { value: 'art-nouveau', label: '新艺术风格' },
  { value: 'brutalist', label: '粗野主义' },
  { value: 'synthwave', label: '合成器浪潮' },
  { value: 'noir', label: '黑色电影风格' },
] as const

// 一、构图与景别 (Shot Types) - 原"风格"改为"构图/角度"
export const SHOT_TYPE_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'extreme-close-up', label: '极端特写' },
  { value: 'close-up', label: '特写' },
  { value: 'medium-shot', label: '中景' },
  { value: 'full-shot', label: '全景' },
  { value: 'long-shot', label: '远景' },
  { value: 'extreme-long-shot', label: '大远景' },
  { value: 'cowboy-shot', label: '牛仔景' },
  { value: 'over-the-shoulder', label: '过肩镜头' },
  { value: 'pov', label: '第一人称视角' },
  { value: 'selfie-shot', label: '自拍视角' },
  { value: 'two-shot', label: '双人镜头' },
  { value: 'group-shot', label: '群像镜头' },
  { value: 'symmetrical', label: '对称构图' },
  { value: 'rule-of-thirds', label: '三分法构图' },
  { value: 'frame-within-frame', label: '框架构图' },
] as const

// 二、拍摄角度 (Camera Angles) - 合并到构图/角度中
export const CAMERA_ANGLE_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'eye-level', label: '平视角度' },
  { value: 'low-angle', label: '低角度/仰拍' },
  { value: 'high-angle', label: '高角度/俯拍' },
  { value: 'birds-eye', label: '鸟瞰图' },
  { value: 'worms-eye', label: '虫视/地面视角' },
  { value: 'drone-view', label: '无人机/航拍' },
  { value: 'dutch-angle', label: '荷兰角/倾斜构图' },
  { value: 'side-profile', label: '侧面视角' },
  { value: 'wide-angle', label: '广角' },
  { value: 'back-view', label: '背影/背视' },
  { value: 'overhead', label: '俯视' },
  { value: 'ultra-wide', label: '超广角' },
  { value: 'isometric', label: '等轴视图' },
  { value: 'fisheye', label: '鱼眼镜头' },
] as const

// 三、镜头类型 (Lens & Focal Length) - 原"质量"改为"镜头类型"
export const LENS_TYPE_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'macro-lens', label: '微距镜头' },
  { value: 'telephoto-lens', label: '长焦镜头' },
  { value: 'tilt-shift', label: '移轴镜头' },
  { value: 'anamorphic', label: '变形宽银幕镜头' },
  { value: '16mm-wide', label: '16mm 广角' },
  { value: '24mm-wide', label: '24mm 广角' },
  { value: '35mm-humanist', label: '35mm 人文' },
  { value: '50mm-standard', label: '50mm 标准' },
  { value: '85mm-portrait', label: '85mm 人像' },
  { value: '100mm-macro-portrait', label: '100mm 微距人像' },
  { value: '200mm-telephoto', label: '200mm 长焦' },
  { value: 'wide-aperture', label: '大光圈' },
  { value: 'narrow-aperture', label: '小光圈' },
  { value: 'f1.2', label: 'f/1.2 大光圈' },
  { value: 'f1.8', label: 'f/1.8 大光圈' },
  { value: 'f2.8', label: 'f/2.8 大光圈' },
  { value: 'f8', label: 'f/8 小光圈' },
  { value: 'f16', label: 'f/16 小光圈' },
  { value: 'f22', label: 'f/22 小光圈' },
] as const

// 四、对焦与景深 (Focus & Depth of Field)
export const FOCUS_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'depth-of-field', label: '景深' },
  { value: 'shallow-dof', label: '浅景深' },
  { value: 'deep-focus', label: '深景深' },
  { value: 'bokeh', label: '散景/光斑' },
  { value: 'motion-blur', label: '运动模糊' },
  { value: 'rack-focus', label: '变焦/焦点转移' },
  { value: 'soft-focus', label: '柔焦' },
  { value: 'sharp-focus', label: '锐利对焦' },
  { value: 'hyper-realistic', label: '超写实' },
] as const

// 五、光影与氛围 (Lighting & Atmosphere) - 原"光影"
// 步骤2.1-A：新增6种光影选项
export const LIGHTING_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'cinematic-lighting', label: '电影级布光' },
  { value: 'natural-light', label: '自然光' },
  { value: 'golden-hour', label: '黄金时刻' },
  { value: 'blue-hour', label: '蓝调时刻' },
  { value: 'volumetric', label: '体积光/丁达尔光' },
  { value: 'rembrandt', label: '伦勃朗布光' },
  { value: 'chiaroscuro', label: '明暗对照法' },
  { value: 'rim-light', label: '轮廓光/边缘光' },
  { value: 'backlight', label: '逆光' },
  { value: 'softbox', label: '柔光箱光效' },
  { value: 'hard-light', label: '硬光' },
  { value: 'neon-light', label: '霓虹光' },
  { value: 'bioluminescence', label: '生物荧光' },
  { value: 'moody-lighting', label: '情绪化布光' },
  { value: 'studio-lighting', label: '影棚布光' },
  { value: 'lens-flare', label: '镜头光晕' },
  { value: 'global-illumination', label: '全局光照' },
  { value: 'ray-tracing', label: '光线追踪' },
  // 扩展光影
  { value: 'submarine', label: '水下光' },
  { value: 'candlelight', label: '烛光' },
  { value: 'firelight', label: '火光' },
  { value: 'moonlight', label: '月光' },
  { value: 'aurora', label: '极光' },
  { value: 'bioluminescent', label: '生物发光' },
] as const

// 六、特殊摄影技术 (Technical & Styling)
export const TECHNICAL_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'long-exposure', label: '长曝光' },
  { value: 'double-exposure', label: '双重曝光' },
  { value: 'light-painting', label: '光绘' },
  { value: 'stop-motion', label: '定格动画风格' },
  { value: 'time-lapse', label: '延时摄影' },
  { value: 'chromatic-aberration', label: '色差/色散' },
  { value: 'vignetting', label: '暗角' },
  { value: 'film-grain', label: '胶片颗粒' },
  { value: 'hdr', label: '高动态范围' },
] as const

// 七、相机型号与胶片质感 (Camera & Film Stock) - 原"镜头"改为"相机参数"
export const CAMERA_MODEL_OPTIONS = [
  { value: 'none', label: '不选择' },
  { value: 'gopro', label: '运动相机风格' },
  { value: 'cctv', label: '监控录像' },
  { value: 'dashcam', label: '行车记录仪' },
  { value: 'polaroid', label: '宝丽来/拍立得' },
  { value: 'kodak-portra-400', label: '柯达Portra 400' },
  { value: 'fuji-velvia', label: '富士Velvia' },
  { value: 'ilford-hp5', label: '依尔福HP5' },
  { value: 'kodachrome', label: '柯达克罗姆' },
  { value: 'vhs', label: '录像带质感' },
  { value: '8mm-film', label: '8毫米胶片' },
  { value: '35mm-film', label: '35毫米胶片' },
  { value: 'imax', label: 'IMAX画质' },
] as const

// Atmosphere presets (保留原字段名以兼容)
export const ATMOSPHERE_PRESETS = [
  { value: 'none', label: '不选择' },
  { value: 'day', label: '白天' },
  { value: 'night', label: '夜晚' },
  { value: 'sunset', label: '黄昏' },
  { value: 'foggy', label: '雾气' },
  { value: 'rainy', label: '雨天' },
  { value: 'snowy', label: '雪天' },
] as const

// ============ 步骤2.2-B: 新增参数维度 ============

// 画质参数
export const QUALITY_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'standard', label: '标准' },
  { value: 'premium', label: '高级' },
  { value: 'ultra', label: '极致' },
] as const

// 饱和度
export const SATURATION_OPTIONS = [
  { value: 'none', label: '不调整' },
  { value: 'desaturated', label: '低饱和' },
  { value: 'natural', label: '自然' },
  { value: 'vibrant', label: '鲜艳' },
  { value: 'hyper-saturated', label: '高饱和' },
] as const

// 对比度
export const CONTRAST_OPTIONS = [
  { value: 'none', label: '不调整' },
  { value: 'low', label: '低对比' },
  { value: 'natural', label: '自然' },
  { value: 'high', label: '高对比' },
  { value: 'dramatic', label: '戏剧性' },
] as const

// 噪点/颗粒
export const NOISE_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'fine', label: '细腻颗粒' },
  { value: 'medium', label: '中等颗粒' },
  { value: 'heavy', label: '粗颗粒' },
  { value: 'film-grain', label: '胶片颗粒' },
] as const

// ============ 以下是 Prompt 映射 ============

// Style prompt mapping
const STYLE_PROMPTS: Record<string, string> = {
  'none': '',
  'realistic': 'photorealistic, ultra realistic, high detail, photograph',
  'anime': 'anime style, manga, vibrant colors, Japanese animation',
  'oil-painting': 'oil painting, artistic, textured brushstrokes, classical art',
  'watercolor': 'watercolor painting, soft colors, flowing, delicate',
  'sketch': 'pencil sketch, detailed linework, black and white drawing',
  '3d': '3D render, octane render, volumetric lighting, unreal engine',
  'cyberpunk': 'cyberpunk style, neon lights, futuristic, sci-fi, high tech',
  'steampunk': 'steampunk style, victorian, mechanical gears, brass and copper',
  'fantasy': 'fantasy art, magical, ethereal, mystical, enchanted',
  'ghibli': 'studio ghibli style, miyazaki, anime, whimsical, nature',
  'pop-art': 'pop art style, bold colors, comic style, vibrant, mass culture',
  'minimalist': 'minimalist, clean lines, simple, modern, sleek',
  'pixel': 'pixel art style, 8-bit, retro gaming, low resolution aesthetic',
  'concept-art': 'concept art, digital painting, artstation, game design, detailed',
  // 扩展风格 mapping
  'impressionist': 'impressionist style, monet, renoir, soft brushstrokes, light and color',
  'ukiyo-e': 'ukiyo-e style, japanese woodblock print, flat colors, traditional japanese art',
  'art-nouveau': 'art nouveau style, decorative, elegant curves, nature inspired, alphonse mucha',
  'brutalist': 'brutalist architecture, raw concrete, bold geometric forms, minimalist',
  'synthwave': 'synthwave style, retrowave, neon colors, 80s aesthetic, chrome, grid',
  'noir': 'film noir style, black and white, high contrast, moody shadows, vintage hollywood',
}

// Shot Types prompt mapping
const SHOT_TYPE_PROMPTS: Record<string, string> = {
  'none': '',
  'extreme-close-up': 'extreme close-up shot, macro shot, extreme detail',
  'close-up': 'close-up shot, head shot, face detail',
  'medium-shot': 'medium shot, waist up, half body',
  'full-shot': 'full shot, full body, wide shot',
  'long-shot': 'long shot, distant view, environmental',
  'extreme-long-shot': 'extreme long shot, vast landscape, epic scale',
  'cowboy-shot': 'cowboy shot, american shot, thighs up',
  'over-the-shoulder': 'over-the-shoulder shot, OTS, behind subject',
  'pov': 'point of view shot, POV, first person perspective',
  'selfie-shot': 'selfie shot, arm extended, front facing',
  'two-shot': 'two shot, two subjects, dual composition',
  'group-shot': 'group shot, multiple subjects, ensemble',
  'symmetrical': 'symmetrical composition, centered, balanced frame',
  'rule-of-thirds': 'rule of thirds composition, off-center, dynamic balance',
  'frame-within-frame': 'frame within a frame, natural framing, portal composition',
}

// Camera Angles prompt mapping
const CAMERA_ANGLE_PROMPTS: Record<string, string> = {
  'none': '',
  'eye-level': 'eye level shot, straight on, neutral angle',
  'low-angle': 'low angle shot, looking up, heroic perspective',
  'high-angle': 'high angle shot, looking down, superior view',
  'birds-eye': 'bird\'s eye view, overhead, aerial perspective',
  'worms-eye': 'worm\'s eye view, ground level, looking straight up',
  'drone-view': 'drone view, aerial shot, UAV perspective',
  'dutch-angle': 'dutch angle, tilted frame, canted angle, diagonal composition',
  'side-profile': 'side profile, lateral view, silhouette',
  'wide-angle': 'wide angle view, expansive, broad perspective',
  'back-view': 'back view, from behind, rear angle',
  'overhead': 'overhead shot, top-down, flat lay',
  'ultra-wide': 'ultra wide angle, panoramic, immersive',
  'isometric': 'isometric view, axonometric, technical drawing style',
  'fisheye': 'fisheye lens, distorted, curved, 180 degree view',
}

// Lens Types prompt mapping
const LENS_TYPE_PROMPTS: Record<string, string> = {
  'none': '',
  'macro-lens': 'macro lens, extreme close-up, 1:1 magnification, detailed texture',
  'telephoto-lens': 'telephoto lens, compressed perspective, distant subject',
  'tilt-shift': 'tilt-shift lens, miniature effect, selective focus',
  'anamorphic': 'anamorphic lens, cinematic, wide aspect ratio, oval bokeh',
  '16mm-wide': '16mm wide angle lens, ultra wide, distorted edges',
  '24mm-wide': '24mm wide angle lens, environmental portrait, broad view',
  '35mm-humanist': '35mm lens, humanist photography, street photography',
  '50mm-standard': '50mm standard lens, natural perspective, normal view',
  '85mm-portrait': '85mm portrait lens, flattering compression, shallow depth',
  '100mm-macro-portrait': '100mm lens, macro portrait, telephoto compression',
  '200mm-telephoto': '200mm telephoto lens, extreme compression, sports photography',
  'wide-aperture': 'wide aperture, shallow depth of field, blurry background',
  'narrow-aperture': 'narrow aperture, deep depth of field, sharp throughout',
  'f1.2': 'f/1.2 aperture, extremely shallow depth of field, buttery bokeh',
  'f1.8': 'f/1.8 aperture, shallow depth of field, creamy bokeh',
  'f2.8': 'f/2.8 aperture, shallow depth of field, professional look',
  'f8': 'f/8 aperture, medium depth of field, sharp details',
  'f16': 'f/16 aperture, deep depth of field, landscape sharpness',
  'f22': 'f/22 aperture, maximum depth of field, everything in focus',
}

// Focus & Depth of Field prompt mapping
const FOCUS_PROMPTS: Record<string, string> = {
  'none': '',
  'depth-of-field': 'depth of field, selective focus, layered composition',
  'shallow-dof': 'shallow depth of field, bokeh, blurred background, subject isolation',
  'deep-focus': 'deep focus, sharp foreground and background, everything in focus',
  'bokeh': 'bokeh, circular highlights, creamy background blur',
  'motion-blur': 'motion blur, movement effect, dynamic, panning',
  'rack-focus': 'rack focus, focus pull, shifting attention',
  'soft-focus': 'soft focus, dreamy, ethereal, romantic glow',
  'sharp-focus': 'sharp focus, crisp details, razor sharp, high resolution',
  'hyper-realistic': 'hyper-realistic, ultra detailed, beyond photography',
}

// Lighting prompt mapping
const LIGHTING_PROMPTS: Record<string, string> = {
  'none': '',
  'cinematic-lighting': 'cinematic lighting, film look, dramatic illumination',
  'natural-light': 'natural lighting, daylight, ambient light, soft shadows',
  'golden-hour': 'golden hour, warm sunlight, magic hour, sunset glow',
  'blue-hour': 'blue hour, twilight, cool ambient, atmospheric',
  'volumetric': 'volumetric lighting, god rays, light beams, atmospheric fog',
  'rembrandt': 'rembrandt lighting, triangle light, dramatic portrait lighting',
  'chiaroscuro': 'chiaroscuro, strong contrast, light and shadow interplay',
  'rim-light': 'rim light, edge lighting, halo effect, silhouette outline',
  'backlight': 'backlight, silhouetted, contre-jour, lens flare',
  'softbox': 'softbox lighting, diffused, even illumination, portrait lighting',
  'hard-light': 'hard light, harsh shadows, directional, high contrast',
  'neon-light': 'neon lighting, colorful glow, cyberpunk lights, vibrant',
  'bioluminescence': 'bioluminescence, glowing organisms, natural light emission',
  'moody-lighting': 'moody lighting, atmospheric, emotional, dark ambient',
  'studio-lighting': 'studio lighting, professional, three-point lighting, controlled',
  'lens-flare': 'lens flare, light leak, anamorphic flare, natural artifact',
  'global-illumination': 'global illumination, indirect lighting, realistic light bounce',
  'ray-tracing': 'ray tracing, realistic reflections, accurate light simulation',
  // 扩展光影 mapping
  'submarine': 'submarine lighting, deep underwater, blue green tones, caustics, diving light',
  'candlelight': 'candlelight, warm flickering light, intimate, cozy, golden glow',
  'firelight': 'firelight, warm orange glow, campfire, fireplace, dancing flames',
  'moonlight': 'moonlight, silver blue tones, night illumination, serene, peaceful',
  'aurora': 'aurora borealis, northern lights, colorful light rays, magical, ethereal',
  'bioluminescent': 'bioluminescent glow, glowing particles, magical atmosphere, mystical',
}

// Technical & Styling prompt mapping
const TECHNICAL_PROMPTS: Record<string, string> = {
  'none': '',
  'long-exposure': 'long exposure, light trails, smooth water, motion blur',
  'double-exposure': 'double exposure, layered image, surreal composite',
  'light-painting': 'light painting, light trails, long exposure art',
  'stop-motion': 'stop motion style, jerky movement, puppet animation look',
  'time-lapse': 'time-lapse, compressed time, motion blur streaks',
  'chromatic-aberration': 'chromatic aberration, color fringing, lens artifact',
  'vignetting': 'vignetting, dark corners, focused attention',
  'film-grain': 'film grain, analog texture, vintage look',
  'hdr': 'HDR, high dynamic range, detailed shadows and highlights',
}

// Camera & Film Stock prompt mapping
const CAMERA_MODEL_PROMPTS: Record<string, string> = {
  'none': '',
  'gopro': 'GoPro style, wide angle, action camera, fisheye distortion',
  'cctv': 'CCTV footage, security camera, low resolution, surveillance',
  'dashcam': 'dashcam footage, driving perspective, wide angle, timestamp',
  'polaroid': 'Polaroid, instant film, vintage colors, white border',
  'kodak-portra-400': 'Kodak Portra 400, warm skin tones, fine grain, portrait film',
  'fuji-velvia': 'Fujifilm Velvia, saturated colors, vivid, slide film',
  'ilford-hp5': 'Ilford HP5, black and white, grainy, classic documentary',
  'kodachrome': 'Kodachrome, rich colors, archival quality, vintage film',
  'vhs': 'VHS tape quality, analog distortion, tracking lines, retro',
  '8mm-film': '8mm film, home movie, vintage, grainy, nostalgic',
  '35mm-film': '35mm film, analog photography, film grain, classic look',
  'imax': 'IMAX quality, ultra high resolution, massive scale, immersive',
}

// Atmosphere prompt mapping
const ATMOSPHERE_PROMPTS: Record<string, string> = {
  'none': '',
  'day': 'daytime, bright, sunny day, clear sky',
  'night': 'nighttime, dark, stars, moonlight',
  'sunset': 'sunset, orange sky, warm colors, dusk',
  'foggy': 'foggy, misty atmosphere, mysterious, low visibility',
  'rainy': 'rainy, wet surfaces, reflections, stormy',
  'snowy': 'snowy, winter scene, cold, white, frozen',
}

// ============ 步骤2.2-B: 新增参数维度的 prompt mapping ============

// Quality prompt mapping
const QUALITY_PROMPTS: Record<string, string> = {
  'auto': '',
  'standard': 'standard quality',
  'premium': 'premium quality, highly detailed',
  'ultra': 'ultra quality, highest detail, best quality, masterpiece',
}

// Saturation prompt mapping
const SATURATION_PROMPTS: Record<string, string> = {
  'none': '',
  'desaturated': 'desaturated colors, muted tones, faded',
  'natural': 'natural saturation, realistic colors',
  'vibrant': 'vibrant colors, saturated, vivid, bold colors',
  'hyper-saturated': 'hyper saturated, extremely vivid, pop art colors',
}

// Contrast prompt mapping
const CONTRAST_PROMPTS: Record<string, string> = {
  'none': '',
  'low': 'low contrast, soft, muted shadows',
  'natural': 'natural contrast, balanced dynamic range',
  'high': 'high contrast, bold shadows, punchy',
  'dramatic': 'dramatic contrast, extreme shadows, cinematic',
}

// Noise prompt mapping
const NOISE_PROMPTS: Record<string, string> = {
  'none': '',
  'fine': 'fine grain, subtle texture',
  'medium': 'medium grain, noticeable texture',
  'heavy': 'heavy grain, coarse texture, vintage film look',
  'film-grain': 'film grain, analog photography, nostalgic texture',
}

// Build final prompt from presets - 扩展版本（支持新增参数）
export function buildPrompt(
  basePrompt: string,
  options: {
    style?: string
    shotType?: string
    cameraAngle?: string
    lensType?: string
    focus?: string
    lighting?: string
    technical?: string
    cameraModel?: string
    atmosphere?: string
    quality?: string
    saturation?: string
    contrast?: string
    noise?: string
  }
): string {
  const parts = [basePrompt]

  // 风格
  if (options.style && STYLE_PROMPTS[options.style]) {
    parts.push(STYLE_PROMPTS[options.style])
  }

  // 构图与景别
  if (options.shotType && SHOT_TYPE_PROMPTS[options.shotType]) {
    parts.push(SHOT_TYPE_PROMPTS[options.shotType])
  }

  // 拍摄角度
  if (options.cameraAngle && CAMERA_ANGLE_PROMPTS[options.cameraAngle]) {
    parts.push(CAMERA_ANGLE_PROMPTS[options.cameraAngle])
  }

  // 镜头类型
  if (options.lensType && LENS_TYPE_PROMPTS[options.lensType]) {
    parts.push(LENS_TYPE_PROMPTS[options.lensType])
  }

  // 对焦与景深
  if (options.focus && FOCUS_PROMPTS[options.focus]) {
    parts.push(FOCUS_PROMPTS[options.focus])
  }

  // 光影
  if (options.lighting && LIGHTING_PROMPTS[options.lighting]) {
    parts.push(LIGHTING_PROMPTS[options.lighting])
  }

  // 特殊摄影技术
  if (options.technical && TECHNICAL_PROMPTS[options.technical]) {
    parts.push(TECHNICAL_PROMPTS[options.technical])
  }

  // 相机型号与胶片质感
  if (options.cameraModel && CAMERA_MODEL_PROMPTS[options.cameraModel]) {
    parts.push(CAMERA_MODEL_PROMPTS[options.cameraModel])
  }

  // 氛围
  if (options.atmosphere && ATMOSPHERE_PROMPTS[options.atmosphere]) {
    parts.push(ATMOSPHERE_PROMPTS[options.atmosphere])
  }

  // 画质
  if (options.quality && QUALITY_PROMPTS[options.quality]) {
    parts.push(QUALITY_PROMPTS[options.quality])
  }

  // 饱和度
  if (options.saturation && SATURATION_PROMPTS[options.saturation]) {
    parts.push(SATURATION_PROMPTS[options.saturation])
  }

  // 对比度
  if (options.contrast && CONTRAST_PROMPTS[options.contrast]) {
    parts.push(CONTRAST_PROMPTS[options.contrast])
  }

  // 噪点
  if (options.noise && NOISE_PROMPTS[options.noise]) {
    parts.push(NOISE_PROMPTS[options.noise])
  }

  return parts.filter(Boolean).join(', ')
}
