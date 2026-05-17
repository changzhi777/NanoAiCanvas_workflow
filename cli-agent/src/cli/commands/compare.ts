import type { Command } from 'commander'
import { ffmpegCompare } from '../../core/ffmpeg.js'
import { resolveOutputSpec } from '../../core/config.js'
import { logInfo, logSuccess, logError, progressBar } from '../utils.js'

export function registerCompareCommand(program: Command): void {
  program
    .command('compare')
    .description('前后对比分屏合成')
    .requiredOption('--original <path>', '原始视频路径')
    .requiredOption('--result <path>', '成品视频路径')
    .option('-o, --output <path>', '输出路径', 'output_compare.mp4')
    .option('--layout <layout>', '布局 (side-by-side|top-bottom|pip)', 'side-by-side')
    .option('--preset <preset>', '输出预设', '1080p')
    .action(async (opts) => {
      try {
        const spec = resolveOutputSpec(opts.preset)

        logInfo(`生成${opts.layout === 'side-by-side' ? '左右' : opts.layout === 'top-bottom' ? '上下' : '画中画'}对比...`)
        await ffmpegCompare(opts.original, opts.result, opts.output, spec, opts.layout, (p) => progressBar('compare', p))
        logSuccess(`对比完成: ${opts.output}`)
      } catch (err) {
        logError(`对比失败: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
