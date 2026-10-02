/**
 * TVC 级联参数计算
 * TVC 总时长 × 单镜头最大时长 → 自动计算镜头数 → 驱动脚本结构
 *
 * 使用方法:
 *   import { calcTvcParams } from '@/lib/tvc-cascade'
 *   const { shotCount, shotDuration, imageCount, estimatedTime } = calcTvcParams(30)
 */

// 视频模型时长限制
export const MODEL_DURATION_LIMITS: Record<string, number[]> = {
  'minimax-official': [6, 10],                  // MiniMax 官方 Hailuo-02（套餐额度，>6s 自动取 10s）
  'MiniMax-H3': [5, 10, 15],                    // MiniMax H3（速创代理，4-15s 任意整数）
  'minimax-H3': [5, 10, 15],                    // MiniMax H3（速创别名）
  'jimeng-video-01': [4, 5, 8, 10, 15],         // Seedance 2.0（即梦）
}

// 短 ID → 标准 model ID 映射（属性面板用短 ID，API 用标准 ID）
const MODEL_ALIASES: Record<string, string> = {
  seedance: 'jimeng-video-01',
  minimax: 'MiniMax-H3',
  'minimax-h3': 'MiniMax-H3',
  'minimax-official': 'minimax-official',
  glm: 'minimax-official', // GLM CogVideoX-3 已废弃，GLM 视频需求走官方 MiniMax
}

export function resolveModelId(model: string): string {
  return MODEL_ALIASES[model] || model
}

// 根据模型单镜头最大时长，生成可用总时长选项
export function getModelDurationOptions(model: string = 'jimeng-video-01'): number[] {
  const resolved = resolveModelId(model)
  const durations = MODEL_DURATION_LIMITS[resolved] || [5]
  const maxShotDur = Math.max(...durations)
  const options: number[] = []
  for (let shots = 2; shots <= 12; shots++) {
    const total = shots * maxShotDur
    if (total > 120) break
    options.push(total)
  }
  // 去重 + 排序
  return [...new Set(options)].sort((a, b) => a - b)
}

export interface TvcCalcResult {
  totalDuration: number
  shotDuration: number
  shotCount: number
  imageCount: number        // shotCount × 2（起始帧+结束帧）
  videoCount: number        // shotCount
  estimatedTimeMin: number  // 预估最小耗时（秒）
  estimatedTimeMax: number  // 预估最大耗时（秒）
  estimatedCost: number     // 预估积分消耗
  costBreakdown: {
    text: number            // 文本生成（脚本×3）
    image: number           // 图片生成（2 张固定）
    video: number           // 视频生成
    bgm: number             // BGM（video 档）
    acceptance: number      // 验收双闸（关联模板时）
  }
}

// 与后端 BillingRule 种子价对齐（text 10 / image 5 / video 20 / bgm 20 / acceptance 5）
const UNIT_PRICES = { text: 10, image: 5, video: 20, bgm: 20, acceptance: 5 }

export interface TvcCalcOptions {
  model?: string
  oneShot?: boolean          // 一镜到底：单镜头
  includeAcceptance?: boolean // 关联验收模板
}

export function calcTvcParams(
  totalDuration: number,
  modelOrOpts: string | TvcCalcOptions = {},
): TvcCalcResult {
  const opts: TvcCalcOptions = typeof modelOrOpts === 'string' ? { model: modelOrOpts } : modelOrOpts
  const model = opts.model || 'jimeng-video-01'
  const durations = MODEL_DURATION_LIMITS[model] || [5]

  if (opts.oneShot) {
    // 一镜到底：单段长镜头（H3 4-15s），生图固定 2 张
    const shotDuration = Math.min(Math.max(totalDuration, 4), 15)
    const cost = {
      text: UNIT_PRICES.text * 3,
      image: UNIT_PRICES.image * 2,
      video: UNIT_PRICES.video,
      bgm: UNIT_PRICES.bgm,
      acceptance: opts.includeAcceptance ? UNIT_PRICES.acceptance : 0,
    }
    return {
      totalDuration, shotDuration, shotCount: 1, imageCount: 2, videoCount: 1,
      estimatedTimeMin: 620, estimatedTimeMax: 1260,
      estimatedCost: cost.text + cost.image + cost.video + cost.bgm + cost.acceptance,
      costBreakdown: cost,
    }
  }

  // 选择最接近且不超过总时长 1/2 的时长
  const maxShotDur = totalDuration / 2
  let shotDuration = durations.find(d => d <= maxShotDur) ?? durations[0]
  if (shotDuration < 4) shotDuration = durations[0]

  const shotCount = Math.ceil(totalDuration / shotDuration)
  const imageCount = shotCount * 2

  // 预估耗时
  const scriptTime = 15      // 脚本生成 10-20s
  const optimizeTime = 10    // 提示词优化 5-15s
  const breakdownTime = 5    // 分镜头拆分 3-8s
  const imageTimePer = 8     // 单张图 5-12s（可并行，按 2 一批）
  const videoTimePer = 50    // 单视频 30-90s（串行）
  const bgmTime = 5          // BGM 3-8s

  const imageBatches = Math.ceil(imageCount / 3) // 每批 3 张并行
  const imageTime = imageBatches * imageTimePer
  const videoTime = shotCount * videoTimePer

  const estimatedTimeMin = scriptTime + optimizeTime + breakdownTime + imageTime + videoTime + bgmTime
  const estimatedTimeMax = Math.round(estimatedTimeMin * 1.8)

  const cost = {
    text: UNIT_PRICES.text * 3,
    image: UNIT_PRICES.image * 2,
    video: UNIT_PRICES.video * shotCount,
    bgm: UNIT_PRICES.bgm,
    acceptance: opts.includeAcceptance ? UNIT_PRICES.acceptance : 0,
  }
  const estimatedCost = cost.text + cost.image + cost.video + cost.bgm + cost.acceptance

  return {
    totalDuration,
    shotDuration,
    shotCount,
    imageCount,
    videoCount: shotCount,
    estimatedTimeMin: Math.round(estimatedTimeMin),
    estimatedTimeMax,
    estimatedCost,
    costBreakdown: cost,
  }
}

// 格式化秒数为可读时间
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}
