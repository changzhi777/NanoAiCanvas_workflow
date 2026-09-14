import type { Command } from 'commander'
import { ffmpegSubtitles } from '../../core/ffmpeg.js'
import type { Subtitle } from '../../types.js'
import { logInfo, logSuccess, logError, progressBar } from '../utils.js'
import fs from 'node:fs'

export function registerSubtitleCommand(program: Command): void {
  program
    .command('subtitle')
    .description('字幕烧录')
    .requiredOption('-i, --input <path>', '输入视频路径')
    .requiredOption('-s, --subs <file>', '字幕文件路径（JSON）')
    .option('-o, --output <path>', '输出路径', 'output_subtitled.mp4')
    .action(async (opts) => {
      try {
        const raw = fs.readFileSync(opts.subs, 'utf-8')
        const subtitles: Subtitle[] = JSON.parse(raw)

        logInfo(`烧录 ${subtitles.length} 条字幕...`)
        await ffmpegSubtitles(opts.input, subtitles, opts.output, (p) => progressBar('subtitle', p))
        logSuccess(`字幕完成: ${opts.output}`)
      } catch (err) {
        logError(`字幕失败: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
