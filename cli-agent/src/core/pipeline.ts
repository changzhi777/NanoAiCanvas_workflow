import path from 'node:path'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import type { VideoClip, Subtitle, CompareConfig } from '../types.js'
import { resolveOutputSpec } from './config.js'
import {
  ffmpegConcat, ffmpegAmix, ffmpegOverlay, ffmpegSubtitles,
  ffmpegNormalize, createTempDir,
} from './ffmpeg.js'

export type PipelineStage = 'concat' | 'compare' | 'subtitle' | 'bgm' | 'finalize'

export interface PipelineOptions {
  clips: VideoClip[]
  subtitles?: Subtitle[]
  bgmUrl?: string
  bgmVolume?: number
  compare?: CompareConfig
  outputPreset?: string
  outputFormats?: string[]
  outputPath?: string
}

export interface PipelineResult {
  /** 1080p 输出路径 */
  output1080p: string
  /** 4K 输出路径（可选） */
  output4k?: string
  /** 任务 ID */
  taskId: string
  /** 各阶段耗时 */
  stageDurations: Record<PipelineStage, number>
}

type ProgressCallback = (stage: PipelineStage, pct: number) => void

/**
 * 4 阶段视频合成管线
 *
 * Stage A: FFmpeg concat（拼接分镜）
 * Stage B: Remotion/FFmpeg overlay（对比分屏）
 * Stage C: FFmpeg subtitles（字幕烧录）
 * Stage D: FFmpeg amix + 多规格输出
 */
export async function runPipeline(
  opts: PipelineOptions,
  onProgress?: ProgressCallback,
): Promise<PipelineResult> {
  const taskId = randomUUID()
  const spec = resolveOutputSpec(opts.outputPreset)
  const tmpDir = await createTempDir(`nanoai-pipeline-${taskId}-`)
  const durations: Record<PipelineStage, number> = {
    concat: 0, compare: 0, subtitle: 0, bgm: 0, finalize: 0,
  }

  const time = <T>(stage: PipelineStage, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now()
    return fn().finally(() => { durations[stage] = Date.now() - start })
  }

  let currentVideo: string

  // ===== Stage A: 拼接 =====
  if (opts.clips.length === 1) {
    // 单片段直接 normalize
    const normPath = path.join(tmpDir, 'normalized.mp4')
    await time('concat', () =>
      ffmpegNormalize(opts.clips[0].src, normPath, spec, (p) => onProgress?.('concat', p))
    )
    currentVideo = normPath
  } else {
    const concatPath = path.join(tmpDir, 'concat.mp4')
    await time('concat', () =>
      ffmpegConcat(opts.clips, concatPath, spec, (p) => onProgress?.('concat', p))
    )
    currentVideo = concatPath
  }
  onProgress?.('concat', 100)

  // ===== Stage B: 对比分屏（可选） =====
  const compareCfg = opts.compare
  if (compareCfg) {
    const comparePath = path.join(tmpDir, 'compare.mp4')
    const compareWidth = compareCfg.layout === 'side-by-side' ? spec.width * 2 : spec.width
    const compareSpec = { ...spec, width: compareWidth }
    const resultSrc = typeof compareCfg.result === 'string' ? compareCfg.result : compareCfg.result.src
    const originalSrc = typeof compareCfg.original === 'string' ? compareCfg.original : compareCfg.original.src
    await time('compare', () =>
      ffmpegOverlay(resultSrc, originalSrc, comparePath, compareSpec, compareCfg, (p) => onProgress?.('compare', p))
    )
    currentVideo = comparePath
    onProgress?.('compare', 100)
  }

  // ===== Stage C: 字幕烧录（可选） =====
  if (opts.subtitles && opts.subtitles.length > 0) {
    const subsPath = path.join(tmpDir, 'subtitled.mp4')
    await time('subtitle', () =>
      ffmpegSubtitles(currentVideo, opts.subtitles!, subsPath, (p) => onProgress?.('subtitle', p))
    )
    currentVideo = subsPath
    onProgress?.('subtitle', 100)
  }

  // ===== Stage D: BGM 混流 + 多规格输出 =====
  const outputBase = opts.outputPath || path.join(process.cwd(), `nanoai_output_${taskId}`)

  // D-1: BGM 混流
  if (opts.bgmUrl) {
    const mixedPath = path.join(tmpDir, 'with_bgm.mp4')
    await time('bgm', () =>
      ffmpegAmix(currentVideo, opts.bgmUrl!, mixedPath, opts.bgmVolume ?? 0.3, (p) => onProgress?.('bgm', p))
    )
    currentVideo = mixedPath
    onProgress?.('bgm', 100)
  }

  // D-2: 1080p 输出
  const output1080p = `${outputBase}_1080p.mp4`
  await time('finalize', () =>
    ffmpegNormalize(currentVideo, output1080p, resolveOutputSpec('1080p'), (p) => onProgress?.('finalize', p))
  )

  // D-3: 4K 输出（可选）
  let output4k: string | undefined
  if (opts.outputFormats?.includes('4k')) {
    output4k = `${outputBase}_4k.mp4`
    await ffmpegNormalize(currentVideo, output4k, resolveOutputSpec('4k'))
  }

  onProgress?.('finalize', 100)

  // 清理临时目录
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }

  return { output1080p, output4k, taskId, stageDurations: durations }
}
