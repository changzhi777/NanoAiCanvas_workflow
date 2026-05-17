import type { Command } from 'commander'
import { ffmpegAmix } from '../../core/ffmpeg.js'
import { logInfo, logSuccess, logError, progressBar } from '../utils.js'

export function registerBgmCommand(program: Command): void {
  program
    .command('bgm')
    .description('BGM 音频混流')
    .requiredOption('-i, --input <path>', '输入视频路径')
    .requiredOption('-b, --bgm <path>', 'BGM 音频路径')
    .option('-o, --output <path>', '输出路径', 'output_with_bgm.mp4')
    .option('--volume <vol>', 'BGM 音量 (0-1)', '0.3')
    .action(async (opts) => {
      try {
        logInfo('混流 BGM...')
        await ffmpegAmix(opts.input, opts.bgm, opts.output, Number(opts.volume), (p) => progressBar('bgm', p))
        logSuccess(`混流完成: ${opts.output}`)
      } catch (err) {
        logError(`混流失败: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
