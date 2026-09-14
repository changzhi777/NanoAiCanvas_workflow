/**
 * Skill 标准接口 — 适配不同 Agent 调用
 *
 * Usage:
 *   import { VideoComposeSkill } from './skill/interface.js'
 *   const skill = new VideoComposeSkill()
 *   const result = await skill.execute({ action: 'compose', params: { clips: [...] } })
 */

import { z } from 'zod'
import { runPipeline } from '../core/pipeline.js'
import { ffmpegConcat, ffmpegCompare } from '../core/ffmpeg.js'
import { resolveOutputSpec } from '../core/config.js'
import type { VideoClip, AgentAction, AgentCommand } from '../types.js'

export const SkillInputSchema = z.object({
  action: z.enum(['compose', 'concat', 'compare', 'subtitle', 'bgm']),
  params: z.record(z.any()),
  description: z.string().optional(),
})

export type SkillInput = z.infer<typeof SkillInputSchema>

export interface SkillOutput {
  success: boolean
  output?: string
  outputs?: Record<string, string>
  error?: string
  duration?: number
}

export class VideoComposeSkill {
  async execute(input: SkillInput): Promise<SkillOutput> {
    const start = Date.now()

    try {
      switch (input.action) {
        case 'compose': {
          const clips: VideoClip[] = (input.params.clips || []).map((src: string) => ({ src }))
          const result = await runPipeline({
            clips,
            bgmUrl: input.params.bgmUrl,
            bgmVolume: input.params.bgmVolume,
            subtitles: input.params.subtitles,
            compare: input.params.compare,
            outputPreset: input.params.outputPreset || '1080p',
            outputFormats: input.params.outputFormats || ['1080p'],
          })
          return {
            success: true,
            output: result.output1080p,
            outputs: { '1080p': result.output1080p, ...(result.output4k ? { '4k': result.output4k } : {}) },
            duration: Date.now() - start,
          }
        }

        case 'concat': {
          const clips: VideoClip[] = (input.params.clips || []).map((src: string) => ({ src }))
          const spec = resolveOutputSpec(input.params.preset)
          const output = input.params.output || 'output_concat.mp4'
          await ffmpegConcat(clips, output, spec)
          return { success: true, output, duration: Date.now() - start }
        }

        case 'compare': {
          const spec = resolveOutputSpec(input.params.preset)
          const output = input.params.output || 'output_compare.mp4'
          await ffmpegCompare(
            input.params.original,
            input.params.result,
            output,
            spec,
            input.params.layout || 'side-by-side',
          )
          return { success: true, output, duration: Date.now() - start }
        }

        default:
          return { success: false, error: `Unknown action: ${input.action}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message, duration: Date.now() - start }
    }
  }
}
