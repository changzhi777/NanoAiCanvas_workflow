import type { Command } from 'commander'
import { runPipeline } from '../../core/pipeline.js'
import type { VideoClip, Subtitle } from '../../types.js'
import { loadSettings } from '../../core/settings.js'
import { logInfo, logSuccess, logError, progressBar, fileTimestamp } from '../utils.js'
import fs from 'node:fs'
import path from 'node:path'

export function registerComposeCommand(program: Command): void {
  program
    .command('compose')
    .description('完整视频合成管线：拼接 → 对比 → 字幕 → BGM → 多规格输出')
    .requiredOption('-c, --clips <paths...>', '视频片段路径（空格分隔）')
    .option('--subtitles <file>', '字幕文件路径（JSON）')
    .option('--bgm <path>', 'BGM 音频路径')
    .option('--bgm-volume <volume>', 'BGM 音量 (0-1)', '0.3')
    .option('--compare-original <path>', '对比模式：原始视频路径')
    .option('--compare-layout <layout>', '对比布局 (side-by-side|top-bottom|pip)', 'side-by-side')
    .option('--preset <preset>', '输出预设 (720p|1080p|4k|WxH@fps)', '1080p')
    .option('--output <path>', '输出文件路径（不含扩展名）')
    .option('--formats <formats...>', '输出格式 (1080p 4k)', ['1080p'])
    .option('--save-asset', '保存输出到后端资产库目录')
    .action(async (opts) => {
      try {
        const cfg = loadSettings()
        const clips: VideoClip[] = opts.clips.map((p: string) => ({
          src: p,
          label: p.split('/').pop() || p,
        }))

        if (clips.length === 0) {
          logError('至少需要一个视频片段')
          process.exit(1)
        }

        logInfo(`开始合成 ${clips.length} 个片段...`)

        // 解析字幕文件
        let subtitles: Subtitle[] | undefined
        if (opts.subtitles) {
          const raw = fs.readFileSync(opts.subtitles, 'utf-8')
          const parsed: Subtitle[] = JSON.parse(raw)
          subtitles = parsed
          logInfo(`加载 ${subtitles.length} 条字幕`)
        }

        const result = await runPipeline(
          {
            clips,
            subtitles,
            bgmUrl: opts.bgm,
            bgmVolume: opts.bgmVolume != null ? Number(opts.bgmVolume) : cfg.bgm.defaultVolume,
            compare: opts.compareOriginal ? {
              original: opts.compareOriginal,
              result: clips[0].src,
              layout: opts.compareLayout as any,
            } : undefined,
            outputPreset: opts.preset || cfg.output.preset,
            outputFormats: opts.formats || cfg.output.formats,
            outputPath: opts.output,
          },
          (stage, pct) => progressBar(stage, pct),
        )

        logSuccess(`合成完成！`)
        console.log(`  1080p: ${result.output1080p}`)
        if (result.output4k) console.log(`  4K:    ${result.output4k}`)
        console.log(`  耗时:  ${Object.entries(result.stageDurations).map(([k, v]) => `${k}=${v}ms`).join(', ')}`)

        // Save to asset library if requested
        if (opts.saveAsset || cfg.asset.enabled) {
          // 查找项目根目录
          let projectRoot = process.cwd()
          for (let dir = process.cwd(); dir !== '/'; dir = path.dirname(dir)) {
            const hasPkg = fs.existsSync(path.join(dir, 'package.json'))
            const hasBackend = fs.existsSync(path.join(dir, 'backend', 'chat-uploads'))
            if (hasPkg && hasBackend) {
              projectRoot = dir
              break
            }
          }
          const assetDir = path.isAbsolute(cfg.asset.directory)
            ? cfg.asset.directory
            : path.join(projectRoot, 'backend', 'chat-uploads', 'assets')
          if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true })

          const ts = fileTimestamp()
          const outputs = [result.output1080p, result.output4k].filter(Boolean) as string[]
          for (const src of outputs) {
            const suffix = src.includes('4k') ? '4k' : '1080p'
            const dest = path.join(assetDir, `tvc_${ts}_${suffix}.mp4`)
            fs.copyFileSync(src, dest)
            logSuccess(`资产已保存: ${dest}`)
          }
        }
      } catch (err) {
        logError(`合成失败: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
