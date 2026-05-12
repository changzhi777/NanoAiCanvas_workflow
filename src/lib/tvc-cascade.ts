/**
 * TVC 级联参数计算
 * TVC 总时长 × 单镜头最大时长 → 自动计算镜头数 → 驱动脚本结构
 *
 * 使用方法:
 *   import { calcTvcParams } from '@/lib/tvc-cascade'
 *   const { shotCount, shotDuration, imageCount, estimatedTime } = calcTvcParams(30)
 */

// 视频模型时长限制
const MODEL_DURATION_LIMITS: Record<string, number[]> = {
  'jimeng-video-01': [4, 5, 8, 10, 15],       // Seedance 2.0
  'hailuo-2.3-fast-768P': [6],                  // MiniMax fast
  'hailuo-2.3-768P': [6, 10],                   // MiniMax
  'cogvideox-3': [5, 10],                       // CogVideoX-3
}

export interface TvcCalcResult {
  totalDuration: number
  shotDuration: number
  shotCount: number
  imageCount: number        // shotCount × 2（起始帧+结束帧）
  videoCount: number        // shotCount
  estimatedTimeMin: number  // 预估最小耗时（秒）
  estimatedTimeMax: number  // 预估最大耗时（秒）
  estimatedCost: number     // 预估积分消耗（粗略）
}

export function calcTvcParams(
  totalDuration: number,
  model: string = 'jimeng-video-01',
): TvcCalcResult {
  const durations = MODEL_DURATION_LIMITS[model] || [5]

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

  // 预估积分（文本 2 + 图片 5×imageCount + 视频 15×shotCount + BGM 3）
  const estimatedCost = 2 + 5 * imageCount + 15 * shotCount + 3

  return {
    totalDuration,
    shotDuration,
    shotCount,
    imageCount,
    videoCount: shotCount,
    estimatedTimeMin: Math.round(estimatedTimeMin),
    estimatedTimeMax,
    estimatedCost,
  }
}

// 格式化秒数为可读时间
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}
