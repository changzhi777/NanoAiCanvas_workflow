import ffmpeg from 'fluent-ffmpeg'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadSettings } from './settings.js'
import type { OutputSpec, Subtitle, CompareConfig, VideoClip } from '../types.js'

// ==================== 工具函数 ====================

function getFfmpeg(): ffmpeg.FfmpegCommand {
  const cfg = loadSettings()
  return ffmpeg().setFfmpegPath(cfg.ffmpeg.path).setFfprobePath(cfg.ffmpeg.ffprobePath)
}

/** 安全解析 r_frame_rate（格式 "30/1" 或 "24000/1001"） */
function parseFrameRate(rate: string): number {
  const parts = rate.split('/')
  if (parts.length === 2) {
    const num = Number(parts[0])
    const den = Number(parts[1])
    return den > 0 ? num / den : 30
  }
  return Number(rate) || 30
}

/** 获取视频元信息 */
export async function probeVideo(filePath: string): Promise<{
  duration: number
  width: number
  height: number
  fps: number
  hasAudio: boolean
}> {
  return new Promise((resolve, reject) => {
    getFfmpeg().input(filePath).ffprobe((err, data) => {
      if (err) return reject(err)

      const video = data.streams.find(s => s.codec_type === 'video')
      const audio = data.streams.find(s => s.codec_type === 'audio')

      resolve({
        duration: data.format.duration || 0,
        width: video?.width || 1920,
        height: video?.height || 1080,
        fps: video?.r_frame_rate ? parseFrameRate(video.r_frame_rate) : 30,
        hasAudio: !!audio,
      })
    })
  })
}

/** 运行 ffmpeg 命令并等待完成 */
function runCommand(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd.on('end', () => resolve())
       .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
       .run()
  })
}

/** Cached filter availability check */
const filterCache = new Map<string, boolean>()

/** 清除 filter 缓存（settings 变更时调用） */
export function clearFilterCache(): void {
  filterCache.clear()
}

async function checkFilterAvailable(filterName: string): Promise<boolean> {
  if (filterCache.has(filterName)) return filterCache.get(filterName)!
  return new Promise((resolve) => {
    const cfg = loadSettings()
    import('node:child_process').then(({ exec }) => {
      exec(`"${cfg.ffmpeg.path}" -filters 2>/dev/null | grep -w ${filterName}`, (err, stdout) => {
        const available = !err && stdout.includes(filterName)
        filterCache.set(filterName, available)
        resolve(available)
      })
    })
  })
}

/** 创建临时目录 */
export async function createTempDir(prefix = 'nanoai-video-'): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))
}

/** 确保目录存在 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ==================== 7 个核心操作 ====================

/**
 * 1. concat — 无损拼接视频片段
 * 输入: VideoClip[] → 输出: 单个拼接后的视频文件
 */
export async function ffmpegConcat(
  clips: VideoClip[],
  outputPath: string,
  spec: OutputSpec,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const tmpDir = await createTempDir('nanoai-concat-')

  // Step 1: 统一格式（保证拼接兼容）
  const normalized: string[] = []
  for (let i = 0; i < clips.length; i++) {
    const normPath = path.join(tmpDir, `norm_${i.toString().padStart(3, '0')}.mp4`)
    const cmd = getFfmpeg()
      .input(clips[i].src)
      .videoCodec(spec.codec)
      .size(`${spec.width}x${spec.height}`)
      .autopad()
      .fps(spec.fps)
      .audioCodec('aac')
      .outputOptions([`-pix_fmt`, spec.pixelFormat, '-preset', 'fast', '-crf', '23'])
      .output(normPath)

    await runCommand(cmd)
    normalized.push(normPath)
    onProgress?.(Math.round(((i + 1) / clips.length) * 50))
  }

  // Step 2: concat demuxer 拼接
  const concatListPath = path.join(tmpDir, 'concat.txt')
  const concatContent = normalized.map(f => `file '${f}'`).join('\n')
  fs.writeFileSync(concatListPath, concatContent)

  const cmd = getFfmpeg()
    .input(concatListPath)
    .inputOptions(['-f', 'concat', '-safe', '0'])
    .outputOptions(['-c', 'copy'])
    .output(outputPath)

  await runCommand(cmd)
  onProgress?.(100)

  // 清理
  fs.rmSync(tmpDir, { recursive: true, force: true })
  return outputPath
}

/**
 * 2. amix — 音频混流（BGM + 原音）
 */
export async function ffmpegAmix(
  videoPath: string,
  bgmPath: string,
  outputPath: string,
  bgmVolume = 0.3,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const info = await probeVideo(videoPath)

  const filters: string[] = []
  const maps: string[] = ['-map', '0:v']

  if (info.hasAudio) {
    filters.push(`[1:a]volume=${bgmVolume}[bgm]`)
    filters.push(`[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`)
    maps.push('-map', '[aout]')
  } else {
    // 无原音：直接用 BGM，无需 amix
    filters.push(`[1:a]volume=${bgmVolume}[aout]`)
    maps.push('-map', '[aout]')
  }

  const cmd = getFfmpeg()
    .input(videoPath)
    .input(bgmPath)
    .complexFilter(filters)
    .outputOptions([...maps, '-c:v', 'copy', '-c:a', 'aac', '-shortest'])
    .output(outputPath)

  if (onProgress) {
    cmd.on('progress', (prog) => onProgress(Math.round(prog.percent || 0)))
  }

  await runCommand(cmd)
  return outputPath
}

/**
 * 3. overlay — 视频叠加（用于对比分屏）
 */
export async function ffmpegOverlay(
  mainVideo: string,
  overlayVideo: string,
  outputPath: string,
  spec: OutputSpec,
  config: CompareConfig,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const halfW = Math.floor(spec.width / 2)
  const pipW = Math.floor(spec.width * (config.pipScale || 0.25))
  const pipH = Math.floor(spec.height * (config.pipScale || 0.25))

  let filter: string

  switch (config.layout) {
    case 'side-by-side':
      // 左右分屏：两个视频各占一半宽度
      filter = `
        [0:v]scale=${halfW}:${spec.height},pad=${halfW}:${spec.height}:0:0[left];
        [1:v]scale=${halfW}:${spec.height}[right];
        [left][right]hstack=inputs=2[vout]
      `
      break
    case 'top-bottom':
      // 上下分屏
      const halfH = Math.floor(spec.height / 2)
      filter = `
        [0:v]scale=${spec.width}:${halfH},pad=${spec.width}:${halfH}:0:0[top];
        [1:v]scale=${spec.width}:${halfH}[bottom];
        [top][bottom]vstack=inputs=2[vout]
      `
      break
    case 'picture-in-picture':
      // 画中画
      filter = `
        [1:v]scale=${pipW}:${pipH}[pip];
        [0:v][pip]overlay=W-w-20:H-h-20[vout]
      `
      break
    default:
      filter = `[0:v][1:v]hstack=inputs=2[vout]`
  }

  const cmd = getFfmpeg()
    .input(mainVideo)
    .input(overlayVideo)
    .complexFilter([filter])
    .outputOptions(['-map', '[vout]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23'])
    .noAudio()
    .output(outputPath)

  if (onProgress) {
    cmd.on('progress', (prog) => onProgress(Math.round(prog.percent || 0)))
  }

  await runCommand(cmd)
  return outputPath
}

/**
 * 4. subtitles — 烧录字幕（SRT/ASS 格式）
 */
export async function ffmpegSubtitles(
  videoPath: string,
  subs: Subtitle[],
  outputPath: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // 使用 /tmp 下不含特殊字符的路径，避免 FFmpeg subtitles filter 路径转义问题
  const subDir = '/tmp/nanoai-subs'
  ensureDir(subDir)
  const srtPath = path.join(subDir, `subs_${Date.now()}.srt`)

  // 生成 SRT 文件
  const srtContent = subs.map((sub, i) => {
    const fmt = (sec: number) => {
      const h = Math.floor(sec / 3600).toString().padStart(2, '0')
      const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0')
      const s = Math.floor(sec % 60).toString().padStart(2, '0')
      const ms = Math.round((sec % 1) * 1000).toString().padStart(3, '0')
      return `${h}:${m}:${s},${ms}`
    }
    return `${i + 1}\n${fmt(sub.start)} --> ${fmt(sub.end)}\n${sub.text}\n`
  }).join('\n')

  fs.writeFileSync(srtPath, srtContent)

  const position = subs[0]?.style?.position || 'bottom'
  const marginV = position === 'top' ? 'MarginV=30' : position === 'center' ? '' : 'MarginV=30'
  const alignment = position === 'top' ? 'Alignment=8' : position === 'center' ? 'Alignment=5' : 'Alignment=2'

  // Check if subtitles filter is available (requires libass)
  const subtitlesAvailable = await checkFilterAvailable('subtitles')

  if (subtitlesAvailable) {
    // Preferred: libass-based subtitles filter
    const escaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
    const cmd = getFfmpeg()
      .input(videoPath)
      .videoFilters(`subtitles='${escaped}':force_style='${alignment},${marginV},FontSize=16,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`)
      .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'copy'])
      .output(outputPath)

    if (onProgress) {
      cmd.on('progress', (prog) => onProgress(Math.round(prog.percent || 0)))
    }

    await runCommand(cmd)
    try { fs.unlinkSync(srtPath) } catch { /* ignore */ }
    return outputPath
  }

  // Fallback: use drawtext filter (requires libfreetype, no libass needed)
  const drawtextAvailable = await checkFilterAvailable('drawtext')
  if (drawtextAvailable) {
    // Build drawtext chain for each subtitle
    const yPosition = position === 'top' ? '(h*0.1)' : position === 'center' ? '(h*0.5-th)' : '(h*0.85)'
    const filters = subs.map((sub) => {
      const text = sub.text.replace(/'/g, "'\\''").replace(/:/g, '\\:')
      return `drawtext=text='${text}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${yPosition}:enable='between(t\\,${sub.start}\\,${sub.end})'`
    })

    const cmd = getFfmpeg()
      .input(videoPath)
      .videoFilters(filters)
      .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'copy'])
      .output(outputPath)

    if (onProgress) {
      cmd.on('progress', (prog) => onProgress(Math.round(prog.percent || 0)))
    }

    await runCommand(cmd)
    try { fs.unlinkSync(srtPath) } catch { /* ignore */ }
    return outputPath
  }

  // Last resort: no filter available, copy without subtitles
  console.warn('⚠ Neither subtitles nor drawtext filter available. Skipping subtitle burn-in.')
  const fallbackCmd = getFfmpeg()
    .input(videoPath)
    .outputOptions(['-c', 'copy'])
    .output(outputPath)
  await runCommand(fallbackCmd)
  try { fs.unlinkSync(srtPath) } catch { /* ignore */ }
  return outputPath
}

/**
 * 5. normalize — 统一视频格式（分辨率+编解码+帧率）
 */
export async function ffmpegNormalize(
  inputPath: string,
  outputPath: string,
  spec: OutputSpec,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const cmd = getFfmpeg()
    .input(inputPath)
    .size(`${spec.width}x${spec.height}`)
    .autopad()
    .fps(spec.fps)
    .videoCodec(spec.codec)
    .outputOptions([
      '-pix_fmt', spec.pixelFormat,
      '-preset', 'fast',
      '-crf', '23',
      ...(spec.bitrate ? ['-b:v', spec.bitrate] : []),
      ...(spec.audioBitrate ? ['-b:a', spec.audioBitrate] : []),
    ])
    .output(outputPath)

  if (onProgress) {
    cmd.on('progress', (prog) => onProgress(Math.round(prog.percent || 0)))
  }

  await runCommand(cmd)
  return outputPath
}

/**
 * 6. compare — 前后对比合成（原始 vs 成品，左右/上下/画中画）
 */
export async function ffmpegCompare(
  original: string,
  result: string,
  outputPath: string,
  spec: OutputSpec,
  layout: 'side-by-side' | 'top-bottom' | 'picture-in-picture' = 'side-by-side',
  onProgress?: (pct: number) => void,
): Promise<string> {
  return ffmpegOverlay(result, original, outputPath, spec, {
    original,
    result,
    layout,
    pipScale: 0.25,
  }, onProgress)
}

/**
 * 7. extractAudio — 提取音频轨
 */
export async function ffmpegExtractAudio(
  videoPath: string,
  outputPath: string,
): Promise<string> {
  const cmd = getFfmpeg()
    .input(videoPath)
    .noVideo()
    .audioCodec('aac')
    .output(outputPath)

  await runCommand(cmd)
  return outputPath
}
