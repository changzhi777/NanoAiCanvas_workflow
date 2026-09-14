import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  const mockCmd = {
    input: vi.fn().mockReturnThis(),
    inputOptions: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    complexFilter: vi.fn().mockReturnThis(),
    videoFilters: vi.fn().mockReturnThis(),
    videoCodec: vi.fn().mockReturnThis(),
    noAudio: vi.fn().mockReturnThis(),
    noVideo: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    size: vi.fn().mockReturnThis(),
    autopad: vi.fn().mockReturnThis(),
    fps: vi.fn().mockReturnThis(),
    setFfmpegPath: vi.fn().mockReturnThis(),
    setFfprobePath: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function(this: any, event: string, cb: Function) {
      if (event === 'end') setTimeout(() => cb(), 0)
      return this
    }),
    run: vi.fn(),
    ffprobe: vi.fn(),
  }

  const ffmpeg = vi.fn(() => mockCmd)
  ffmpeg.setFfmpegPath = vi.fn()
  ffmpeg.setFfprobePath = vi.fn()
  return { default: ffmpeg }
})

// Mock node:fs
vi.mock('node:fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    rmSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  rmSync: vi.fn(),
}))

// Mock node:os tmpdir
vi.mock('node:os', () => ({
  default: { tmpdir: () => '/tmp' },
  tmpdir: () => '/tmp',
}))

describe('config', () => {
  it('should resolve default 1080p preset', async () => {
    const { resolveOutputSpec, OUTPUT_PRESETS } = await import('../../src/core/config.js')
    const spec = resolveOutputSpec()
    expect(spec.width).toBe(1920)
    expect(spec.height).toBe(1080)
    expect(spec.fps).toBe(30)
  })

  it('should resolve 4k preset', async () => {
    const { resolveOutputSpec } = await import('../../src/core/config.js')
    const spec = resolveOutputSpec('4k')
    expect(spec.width).toBe(3840)
    expect(spec.height).toBe(2160)
  })

  it('should parse WxH@fps format', async () => {
    const { resolveOutputSpec } = await import('../../src/core/config.js')
    const spec = resolveOutputSpec('1280x720@60')
    expect(spec.width).toBe(1280)
    expect(spec.height).toBe(720)
    expect(spec.fps).toBe(60)
  })

  it('should validate supported formats', async () => {
    const { isValidFormat } = await import('../../src/core/config.js')
    expect(isValidFormat('mp4')).toBe(true)
    expect(isValidFormat('webm')).toBe(true)
    expect(isValidFormat('avi')).toBe(false)
  })
})

describe('types', () => {
  it('should export ENV defaults', async () => {
    const { ENV } = await import('../../src/types.js')
    expect(ENV.FFMPEG_PATH).toBe('ffmpeg')
    expect(ENV.FFPROBE_PATH).toBe('ffprobe')
    expect(ENV.API_PORT).toBe(3100)
  })
})

describe('pipeline', () => {
  it('should export runPipeline function', async () => {
    const { runPipeline } = await import('../../src/core/pipeline.js')
    expect(typeof runPipeline).toBe('function')
  })

  it('should export PipelineOptions type', async () => {
    const mod = await import('../../src/core/pipeline.js')
    expect(mod.runPipeline).toBeDefined()
  })
})

describe('skill interface', () => {
  it('should create VideoComposeSkill instance', async () => {
    const { VideoComposeSkill } = await import('../../src/skill/interface.js')
    const skill = new VideoComposeSkill()
    expect(typeof skill.execute).toBe('function')
  })

  it('should return error for unknown action', async () => {
    const { VideoComposeSkill } = await import('../../src/skill/interface.js')
    const skill = new VideoComposeSkill()
    const result = await skill.execute({ action: 'unknown' as any, params: {} })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown action')
  })
})
