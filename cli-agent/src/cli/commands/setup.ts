import type { Command } from 'commander'
import { runDiagnostics, loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../core/settings.js'
import { logInfo, logSuccess, logWarn, logError } from '../utils.js'

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('环境诊断与配置管理')
    .option('--init', '生成本地配置文件（使用默认值）')
    .option('--global', '配置保存到全局 (~/.nanoai/)')
    .option('--ffmpeg-path <path>', '设置 FFmpeg 二进制路径')
    .option('--ffprobe-path <path>', '设置 FFprobe 二进制路径')
    .option('--default-preset <preset>', '设置默认输出预设 (720p|1080p|4k)')
    .option('--default-volume <vol>', '设置默认 BGM 音量 (0-1)')
    .option('--asset-dir <path>', '设置资产库目录')
    .option('--api-port <port>', '设置 HTTP API 端口')
    .action(async (opts) => {
      // 配置初始化模式
      if (opts.init) {
        const target = opts.global ? 'global' : 'project'
        const settings = { ...DEFAULT_SETTINGS }
        const savedPath = saveSettings(settings, target)
        logSuccess(`配置已生成: ${savedPath}`)
        return
      }

      // 逐项设置模式
      if (opts.ffmpegPath || opts.ffprobePath || opts.defaultPreset || opts.defaultVolume || opts.assetDir || opts.apiPort) {
        const settings = loadSettings()
        if (opts.ffmpegPath) settings.ffmpeg.path = opts.ffmpegPath
        if (opts.ffprobePath) settings.ffmpeg.ffprobePath = opts.ffprobePath
        if (opts.defaultPreset) settings.output.preset = opts.defaultPreset
        if (opts.defaultVolume) settings.bgm.defaultVolume = Number(opts.defaultVolume)
        if (opts.assetDir) settings.asset.directory = opts.assetDir
        if (opts.apiPort) settings.api.port = Number(opts.apiPort)

        const target = opts.global ? 'global' : 'project'
        const savedPath = saveSettings(settings, target)
        logSuccess(`配置已更新: ${savedPath}`)
        return
      }

      // 默认：诊断模式
      logInfo('环境诊断中...')
      const diag = await runDiagnostics()

      console.log('')
      console.log('  FFmpeg 环境')
      console.log('  ─────────────────────────────────')
      if (diag.ffmpeg.available) {
        logSuccess(`  ffmpeg: ${diag.ffmpeg.version}`)
      } else {
        logError(`  ffmpeg: 未找到 (${diag.ffmpeg.path})`)
      }
      if (diag.ffprobe.available) {
        logSuccess(`  ffprobe: 可用 (${diag.ffprobe.path})`)
      } else {
        logError(`  ffprobe: 未找到 (${diag.ffprobe.path})`)
      }

      console.log('')
      console.log('  Filter 支持')
      console.log('  ─────────────────────────────────')
      const filterLabels: Record<string, string> = {
        subtitles: '字幕烧录 (libass)',
        drawtext: '文字渲染 (freetype)',
        amix: '音频混流',
        overlay: '视频叠加',
        hstack: '水平拼接',
        vstack: '垂直拼接',
      }
      for (const [key, label] of Object.entries(filterLabels)) {
        const available = (diag.filters as any)[key]
        available
          ? logSuccess(`  ${label}: ✓`)
          : logWarn(`  ${label}: ✗`)
      }

      console.log('')
      console.log('  当前配置')
      console.log('  ─────────────────────────────────')
      console.log(`  配置文件: ${diag.configPath || '未找到（使用默认值）'}`)
      console.log(`  默认预设: ${diag.settings.output.preset}`)
      console.log(`  BGM 音量: ${diag.settings.bgm.defaultVolume}`)
      console.log(`  资产目录: ${diag.settings.asset.directory}`)
      console.log(`  API 端口: ${diag.settings.api.port}`)

      // 提示建议
      console.log('')
      if (!diag.filters.subtitles && !diag.filters.drawtext) {
        logWarn('字幕烧录不可用，建议安装带 libass/freetype 的 FFmpeg:')
        console.log('    brew install ffmpeg --with-libass --with-freetype')
        console.log('    或使用静态编译版本: https://ffmpeg.org/download.html')
      }
      if (!diag.ffmpeg.available) {
        logWarn('FFmpeg 未找到，请设置路径:')
        console.log('    nanoai-video setup --ffmpeg-path /path/to/ffmpeg')
      }
      if (!diag.configPath) {
        logInfo('可运行 `nanoai-video setup --init` 生成配置文件')
      }
    })
}
