import type { StoryboardScript as StoryboardScriptData } from '@/stores/nanoImageStoryboardStore'

// 节点类型
export enum NodeType {
  TASK = 'task',
  EVENT = 'event',
  MILESTONE = 'milestone',
  DECISION = 'decision',
  DATA = 'data',
  START = 'start',
  END = 'end',
  CUSTOM = 'custom',
}

// 节点状态
export enum NodeStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

// 节点数据结构
export interface NodeData {
  id: string
  type: NodeType
  label: string
  description?: string
  status: NodeStatus
  color?: string
  icon?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
  // 优先级
  priority?: 'low' | 'medium' | 'high' | 'critical'
  // 统计数据
  stats?: {
    progress?: number // 0-100
    completedTasks?: number
    totalTasks?: number
    timeSpent?: number // 小时
    trend?: number[] // 趋势数据 [0-100]
  }
}

// 边数据结构
export interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  color?: string
  type?: 'default' | 'straight' | 'step' | 'smoothstep'
  animated?: boolean
  style?: {
    strokeWidth?: number
    strokeDasharray?: string
  }
  condition?: string
  createdAt: number
}

// 画布状态
export interface CanvasState {
  nodes: NodeData[]
  edges: EdgeData[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
  selectedNodes: string[]
  selectedEdges: string[]
}

// 主题类型
export type Theme = 'light' | 'dark'

// 应用状态
export interface AppState {
  theme: Theme
  locale: string
  autosave: boolean
  autosaveInterval: number
}
// User types
export interface User {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'user'
  credits: number
  groupId?: string
  groupName?: string
  imageApiKey: string
  textApiKey?: string
  avatarUrl?: string
  createdAt: string
  settings: UserSettings
}

export interface UserSettings {
  defaultSize: '1K' | '2K' | '4K'
  defaultAspectRatio: string
  theme: 'light' | 'dark' | 'system'
  textModel?: string
  imageModel?: string
  imageProvider?: string
  customProviderUrl?: string
}

// Group Member type
export interface GroupMember {
  userId: string
  username: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

// Group types
export interface Group {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  members: GroupMember[]
  createdAt: string
}

// Chat types
export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  metadata: ChatMetadata
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'pending' | 'generating' | 'success' | 'error'
  imageUrl?: string | string[]
  referenceImages?: string[]
  params?: ImageParams
  prompt?: string
  enhancedPrompt?: string
  progress?: number
  error?: string
  createdAt: string
  updatedAt?: string
}

export interface ChatMetadata {
  totalImages: number
  lastPrompt?: string
  mode: 'text-to-image' | 'fusion' | 'reference'
}

// Image types
export interface ImageAsset {
  id: string
  userId: string
  groupId?: string
  isShared: boolean
  imageUrl: string
  prompt: string
  enhancedPrompt?: string
  params: ImageParams
  referenceImages?: string[]
  createdAt: string
}

export interface ImageParams {
  model?: string
  size?: string
  aspectRatio?: string
  style?: string
  quality?: string
  shotType?: string
  cameraAngle?: string
  lensType?: string
  focus?: string
  lighting?: string
  technical?: string
  cameraModel?: string
  atmosphere?: string
  version?: string
  shotNumber?: number
  mood?: string
  scriptTitle?: string
}

// API types
export interface NanoBananaRequest {
  prompt: string
  size?: string
  aspectRatio?: string
  urls?: string[]
}

export interface NanoBananaResponse {
  code: number
  message: string
  data: {
    taskId: string
    status: number
    result?: string[]
    error?: string
  }
}

export interface PromptEnhanceRequest {
  prompt: string
}

export interface PromptEnhanceResponse {
  enhancedPrompt: string
}

// Knowledge Card Preset types
export type KnowledgeCardCategory =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'geography'
  | 'chinese'
  | 'english'
  | 'other'

export type CardStyle = 'minimal' | 'colorful' | 'handwritten'

// Mindmap types
export interface MindmapNode {
  id: string
  text: string
  children: MindmapNode[]
  isEditing?: boolean
}

export type MindmapStyle = CardStyle | 'tree' | 'radial' | 'fishbone'

export interface MindmapData {
  rootNode: MindmapNode
  style: MindmapStyle
}

// Fusion types
export type GenerationMode = 'text-to-image' | 'fusion' | 'reference' | 'ai-skill'

export interface FusionImage {
  id: string
  url: string
  file?: File
}

// Reference image types
export interface ReferenceImage {
  id: string
  url: string
  file?: File
}

// Task Queue types
export interface TaskQueueItem {
  id: string                    // ChatMessage.id
  sessionId: string
  sessionTitle: string
  prompt: string
  enhancedPrompt?: string
  status: 'pending' | 'generating' | 'success' | 'error'
  progress: number
  model?: string
  error?: string
  imageUrl?: string | string[]
  createdAt: string
  updatedAt?: string
  params?: ImageParams
}

// 3D Model viewer types
export interface ModelViewerSettings {
  customModelUrl: string | null
  autoRotate: boolean
  wireframe: boolean
}

// Storyboard types
export type StoryboardTaskStatus = 'pending' | 'generating_script' | 'generating_storyboard' | 'generating_characters' | 'generating_audio' | 'success' | 'error'

/** 预览状态类型 */
export type PreviewType = 'scene' | 'character' | 'script'

/** 预览状态 */
export interface PreviewState {
  type: PreviewType
  index: number
}

/** 子任务定义 */
export interface StoryboardSubTask {
  id: string
  type: 'script' | 'storyboard' | 'character' | 'audio'
  label: string
  status: 'pending' | 'running' | 'success' | 'error'
  progress: number
  error?: string
}

export interface StoryboardTask {
  id: string
  userId: string
  title: string
  inputText: string
  style: string
  status: StoryboardTaskStatus
  progress: number
  error?: string
  // 结果数据
  script?: any  // StoryboardScript
  storyboardImages: string[]
  characterDesigns: Array<{ characterId: string; characterName: string; imageUrl?: string }>
  // 时间戳
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface StoryboardAsset {
  id: string
  taskId: string
  userId: string
  groupId?: string
  isShared: boolean
  // 故事板数据
  title: string
  synopsis: string
  script: StoryboardScriptData  // StoryboardScript JSON
  storyboardImages: string[]
  characterDesigns: Array<{ characterId: string; characterName: string; imageUrl?: string }>
  // 语音配置
  voiceConfig?: StoryboardVoiceConfig
  dialogueAudios?: DialogueAudio[]
  // 分类
  category: 'storyboard'
  // 时间戳
  createdAt: string
}

// ============== GLM-TTS 语音合成类型 ==============

/** 预设音色 */
export type PresetVoice = 'tongtong' | 'xiaochen' | 'chuichui' | 'jam' | 'kazi' | 'douji' | 'luodo'

/** 预设音色配置 */
export const PRESET_VOICES: Array<{ id: PresetVoice; name: string; description: string }> = [
  { id: 'tongtong', name: '彤彤', description: '温柔女声（默认）' },
  { id: 'xiaochen', name: '小陈', description: '清新女声' },
  { id: 'chuichui', name: '锤锤', description: '活泼女声' },
  { id: 'jam', name: 'jam', description: '磁性男声' },
  { id: 'kazi', name: 'kazi', description: '沉稳男声' },
  { id: 'douji', name: 'douji', description: '少年音' },
  { id: 'luodo', name: 'luodo', description: '萝莉音' },
]

/** 克隆音色 */
export interface ClonedVoice {
  id: string              // 音色ID（API返回）
  name: string            // 用户命名
  characterId?: string    // 关联的角色ID（可选）
  audioFileUrl?: string   // 上传的音频文件URL
  sampleText?: string     // 克隆时使用的样本文本
  createdAt: string
}

/** 角色音色配置 */
export interface CharacterVoiceConfig {
  characterId: string
  voiceId: string         // 预设音色ID 或 克隆音色ID
  voiceType: 'preset' | 'cloned' | 'global'
}

/** TTS 生成参数 */
export interface TTSParams {
  voice: string           // 音色ID
  speed: number           // 语速 0.5-2.0
  volume: number          // 音量 0.0-2.0
  responseFormat: 'wav' | 'mp3' | 'pcm'
}

/** 对白音频 */
export interface DialogueAudio {
  dialogueId: string      // 对白唯一标识 (sceneId_dialogueIndex)
  sceneId: number
  characterId: string
  characterName: string
  text: string
  audioUrl: string        // 生成的音频URL (blob URL 或 data URL)
  duration?: number       // 音频时长（秒）
  params: TTSParams
  createdAt: string
}

/** 故事板语音配置 */
export interface StoryboardVoiceConfig {
  globalVoice: string     // 全局音色ID
  globalSpeed: number     // 全局语速
  globalVolume: number    // 全局音量
  globalFormat: 'wav' | 'mp3' | 'pcm'
  characterVoices: CharacterVoiceConfig[]
  clonedVoices: ClonedVoice[]
}
