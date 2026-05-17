// ==================== 视频素材 ====================

export interface VideoClip {
  /** 本地文件路径或远程 URL */
  src: string
  /** 可选显示标签 */
  label?: string
  /** 时长（秒），未填则自动探测 */
  duration?: number
}

export interface Subtitle {
  /** 字幕文本 */
  text: string
  /** 起始时间（秒） */
  start: number
  /** 结束时间（秒） */
  end: number
  /** 样式预设 */
  style?: SubtitleStyle
}

export interface SubtitleStyle {
  fontSize?: number
  color?: string
  bgColor?: string
  position?: 'bottom' | 'top' | 'center'
}

export type CompareLayout = 'side-by-side' | 'top-bottom' | 'picture-in-picture'

export interface CompareConfig {
  /** 原始素材（左侧/上方） */
  original: string | VideoClip
  /** 成品素材（右侧/下方） */
  result: string | VideoClip
  layout: CompareLayout
  /** 画中画时的缩放比 */
  pipScale?: number
}

// ==================== 输出规格 ====================

export interface OutputSpec {
  width: number
  height: number
  fps: number
  codec: string
  pixelFormat: string
  bitrate?: string
  audioBitrate?: string
}

// ==================== 合成任务 ====================

export interface ComposeTask {
  id: string
  /** 输入视频片段列表 */
  clips: VideoClip[]
  /** 字幕列表 */
  subtitles?: Subtitle[]
  /** BGM 音频路径 */
  bgmUrl?: string
  /** BGM 音量 0-1 */
  bgmVolume?: number
  /** 前后对比配置 */
  compare?: CompareConfig
  /** 输出规格 */
  output: OutputSpec
  /** 输出文件路径 */
  outputPath: string
  /** 状态 */
  status: TaskStatus
  /** 进度 0-100 */
  progress: number
  /** 错误信息 */
  error?: string
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

// ==================== Agent 对话 ====================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Agent 返回的结构化指令 */
  command?: AgentCommand
}

export interface AgentCommand {
  action: AgentAction
  params: Record<string, unknown>
  /** 操作说明（给用户看） */
  description: string
}

export type AgentAction =
  | 'concat'
  | 'compare'
  | 'subtitle'
  | 'bgm'
  | 'compose'
  | 'preview'
  | 'status'

// ==================== 环境配置 ====================

export const ENV = {
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  FFPROBE_PATH: process.env.FFPROBE_PATH || 'ffprobe',
  API_PORT: Number(process.env.API_PORT || 3100),
  MCP_TRANSPORT: (process.env.MCP_TRANSPORT || 'stdio') as 'stdio' | 'sse',
} as const
