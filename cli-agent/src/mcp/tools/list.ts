/**
 * MCP Tool 定义 — 仅作参考文档
 * 实际注册在 mcp/server.ts 中使用 server.tool()
 */

export const toolDefs = [
  {
    name: 'compose',
    description: '完整视频合成管线：拼接分镜 → 对比分屏 → 字幕烧录 → BGM 混流 → 多规格输出',
    inputSchema: {
      type: 'object' as const,
      properties: {
        clips: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: '视频片段路径列表',
        },
        bgmPath: { type: 'string' as const, description: 'BGM 音频路径' },
        bgmVolume: { type: 'number' as const, description: 'BGM 音量 0-1' },
        subtitlesPath: { type: 'string' as const, description: '字幕 JSON 文件路径' },
        compareOriginal: { type: 'string' as const, description: '对比模式原始视频路径' },
        compareLayout: {
          type: 'string' as const,
          enum: ['side-by-side', 'top-bottom', 'picture-in-picture'],
          description: '对比布局',
        },
        outputPreset: { type: 'string' as const, description: '输出预设 (720p|1080p|4k)' },
        outputPath: { type: 'string' as const, description: '输出文件路径前缀' },
      },
      required: ['clips'],
    },
  },
  {
    name: 'concat',
    description: 'FFmpeg 快速拼接视频片段',
    inputSchema: {
      type: 'object' as const,
      properties: {
        inputs: { type: 'array' as const, items: { type: 'string' as const }, description: '视频路径列表' },
        output: { type: 'string' as const, description: '输出路径' },
        preset: { type: 'string' as const, description: '输出预设' },
      },
      required: ['inputs'],
    },
  },
  {
    name: 'compare',
    description: '前后对比分屏合成（左右/上下/画中画）',
    inputSchema: {
      type: 'object' as const,
      properties: {
        original: { type: 'string' as const, description: '原始视频路径' },
        result: { type: 'string' as const, description: '成品视频路径' },
        output: { type: 'string' as const, description: '输出路径' },
        layout: { type: 'string' as const, enum: ['side-by-side', 'top-bottom', 'picture-in-picture'] },
      },
      required: ['original', 'result'],
    },
  },
  {
    name: 'status',
    description: '查询任务状态',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' as const, description: '任务 ID' },
      },
      required: ['taskId'],
    },
  },
] as const
