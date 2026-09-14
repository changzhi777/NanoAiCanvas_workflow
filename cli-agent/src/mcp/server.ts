import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { runPipeline } from '../core/pipeline.js'
import { ffmpegConcat, ffmpegCompare } from '../core/ffmpeg.js'
import { resolveOutputSpec } from '../core/config.js'
import type { VideoClip, Subtitle } from '../types.js'
import fs from 'node:fs'

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'nanoai-video-compose',
    version: '0.1.0',
  })

  // Register compose tool
  server.tool('compose', '完整视频合成管线', {
    clips: z.array(z.string()).describe('视频片段路径列表'),
    bgmPath: z.string().optional().describe('BGM 音频路径'),
    bgmVolume: z.number().optional().describe('BGM 音量 0-1'),
    subtitlesPath: z.string().optional().describe('字幕 JSON 文件路径'),
    compareOriginal: z.string().optional().describe('对比模式原始视频路径'),
    compareLayout: z.enum(['side-by-side', 'top-bottom', 'picture-in-picture']).optional(),
    outputPreset: z.string().optional().describe('输出预设'),
    outputPath: z.string().optional().describe('输出文件路径前缀'),
  }, async (params) => {
    try {
      const clips: VideoClip[] = params.clips.map((src: string) => ({ src }))

      let subtitles: Subtitle[] | undefined
      if (params.subtitlesPath) {
        subtitles = JSON.parse(fs.readFileSync(params.subtitlesPath, 'utf-8'))
      }

      const result = await runPipeline({
        clips,
        subtitles,
        bgmUrl: params.bgmPath,
        bgmVolume: params.bgmVolume,
        compare: params.compareOriginal ? {
          original: params.compareOriginal,
          result: params.clips[0],
          layout: params.compareLayout || 'side-by-side',
        } : undefined,
        outputPreset: params.outputPreset,
        outputPath: params.outputPath,
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, output1080p: result.output1080p, output4k: result.output4k, taskId: result.taskId }, null, 2),
        }],
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: (err as Error).message }) }],
        isError: true,
      }
    }
  })

  // Register concat tool
  server.tool('concat', 'FFmpeg 快速拼接', {
    inputs: z.array(z.string()).describe('视频路径列表'),
    output: z.string().optional().describe('输出路径'),
    preset: z.string().optional().describe('输出预设'),
  }, async (params) => {
    try {
      const clips: VideoClip[] = params.inputs.map((src: string) => ({ src }))
      const spec = resolveOutputSpec(params.preset)
      const output = params.output || 'output_concat.mp4'
      await ffmpegConcat(clips, output, spec)
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, output }) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: (err as Error).message }) }], isError: true }
    }
  })

  // Register compare tool
  server.tool('compare', '前后对比分屏合成', {
    original: z.string().describe('原始视频路径'),
    result: z.string().describe('成品视频路径'),
    output: z.string().optional().describe('输出路径'),
    layout: z.enum(['side-by-side', 'top-bottom', 'picture-in-picture']).optional(),
    preset: z.string().optional().describe('输出预设'),
  }, async (params) => {
    try {
      const spec = resolveOutputSpec(params.preset)
      const output = params.output || 'output_compare.mp4'
      await ffmpegCompare(params.original, params.result, output, spec, params.layout || 'side-by-side')
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, output }) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: (err as Error).message }) }], isError: true }
    }
  })

  // Register status tool
  server.tool('status', '查询任务状态', {
    taskId: z.string().describe('任务 ID'),
  }, async (params) => {
    const task = { status: 'not_implemented', taskId: params.taskId }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(task),
      }],
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
