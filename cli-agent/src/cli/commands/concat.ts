import type { Command } from 'commander'
import { ffmpegConcat } from '../../core/ffmpeg.js'
import { resolveOutputSpec } from '../../core/config.js'
import type { VideoClip } from '../../types.js'
import { logInfo, logSuccess, logError, progressBar } from '../utils.js'

export function registerConcatCommand(program: Command): void {
  program
    .command('concat')
    .description('FFmpeg 快速拼接视频片段')
    .requiredOption('-i, --inputs <paths...>', '视频片段路径')
    .option('-o, --output <path>', '输出路径', 'output_concat.mp4')
    .option('--preset <preset>', '输出预设', '1080p')
    .action(async (opts) => {
      try {
        const clips: VideoClip[] = opts.inputs.map((p: string) => ({ src: p }))
        const spec = resolveOutputSpec(opts.preset)

        logInfo(`拼接 ${clips.length} 个片段...`)
        await ffmpegConcat(clips, opts.output, spec, (p) => progressBar('concat', p))
        logSuccess(`拼接完成: ${opts.output}`)
      } catch (err) {
        logError(`拼接失败: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
