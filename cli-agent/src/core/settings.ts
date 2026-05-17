import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { clearFilterCache } from './ffmpeg.js'

// ==================== 配置结构 ====================

export interface NanoaiSettings {
  /** FFmpeg 二进制路径 */
  ffmpeg: {
    path: string
    ffprobePath: string
  }
  /** 默认输出配置 */
  output: {
    preset: string
    formats: string[]
    directory: string
  }
  /** BGM 默认配置 */
  bgm: {
    defaultVolume: number
  }
  /** 字幕配置 */
  subtitle: {
    fontSize: number
    color: string
    outlineColor: string
    outlineWidth: number
    position: 'bottom' | 'top' | 'center'
  }
  /** 资产库配置 */
  asset: {
    enabled: boolean
    directory: string
    namingPattern: string
  }
  /** HTTP API 配置 */
  api: {
    port: number
    host: string
  }
}

export const DEFAULT_SETTINGS: NanoaiSettings = {
  ffmpeg: {
    path: 'ffmpeg',
    ffprobePath: 'ffprobe',
  },
  output: {
    preset: '1080p',
    formats: ['1080p'],
    directory: './output',
  },
  bgm: {
    defaultVolume: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: '&HFFFFFF',
    outlineColor: '&H000000',
    outlineWidth: 2,
    position: 'bottom',
  },
  asset: {
    enabled: false,
    directory: '../backend/chat-uploads/assets',
    namingPattern: 'tvc_{timestamp}_{suffix}.mp4',
  },
  api: {
    port: 3100,
    host: '0.0.0.0',
  },
}

// ==================== 配置文件路径 ====================

const CONFIG_FILENAME = '.nanoairc.json'

/** 获取全局配置路径 (~/.nanoai/.nanoairc.json) */
function globalConfigPath(): string {
  return path.join(os.homedir(), '.nanoai', CONFIG_FILENAME)
}

/** 获取项目级配置路径 */
function projectConfigPaths(): string[] {
  const cwd = process.cwd()
  const paths: string[] = []
  for (let dir = cwd; dir !== '/'; dir = path.dirname(dir)) {
    paths.push(path.join(dir, CONFIG_FILENAME))
    // 也检查 .nanoai 子目录
    paths.push(path.join(dir, '.nanoai', CONFIG_FILENAME))
  }
  return paths
}

// ==================== 配置加载 ====================

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch { /* ignore */ }
  return null
}

/** 深度合并配置（仅一层） */
function mergeSettings(base: NanoaiSettings, override: Record<string, unknown>): NanoaiSettings {
  const result: NanoaiSettings = JSON.parse(JSON.stringify(base))
  const keys = Object.keys(result) as (keyof NanoaiSettings)[]
  for (const key of keys) {
    const val = override[key]
    if (val == null) continue
    if (typeof val === 'object' && !Array.isArray(val)) {
      (result as any)[key] = { ...(result[key] as object), ...(val as object) }
    } else if (val !== undefined) {
      (result as any)[key] = val
    }
  }
  return result
}

let _cachedSettings: NanoaiSettings | null = null

/** 加载配置（全局 ← 项目级覆盖 ← 环境变量覆盖） */
export function loadSettings(): NanoaiSettings {
  if (_cachedSettings) return _cachedSettings

  let settings = { ...DEFAULT_SETTINGS }

  // 1. 全局配置
  const globalCfg = readJsonFile(globalConfigPath())
  if (globalCfg) settings = mergeSettings(settings, globalCfg)

  // 2. 项目级配置（从 cwd 向上查找）
  for (const p of projectConfigPaths()) {
    const projCfg = readJsonFile(p)
    if (projCfg) {
      settings = mergeSettings(settings, projCfg)
      break
    }
  }

  // 3. 环境变量覆盖
  if (process.env.FFMPEG_PATH) settings.ffmpeg.path = process.env.FFMPEG_PATH
  if (process.env.FFPROBE_PATH) settings.ffmpeg.ffprobePath = process.env.FFPROBE_PATH
  if (process.env.API_PORT) settings.api.port = Number(process.env.API_PORT)

  _cachedSettings = settings
  return settings
}

/** 清除配置缓存 */
export function clearSettingsCache(): void {
  _cachedSettings = null
  clearFilterCache()
}

// ==================== 配置写入 ====================

/** 保存配置到指定路径 */
export function saveSettings(settings: NanoaiSettings, target: 'global' | 'project' = 'project'): string {
  const filePath = target === 'global' ? globalConfigPath() : path.join(process.cwd(), CONFIG_FILENAME)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n')
  clearSettingsCache()
  return filePath
}

// ==================== 环境诊断 ====================

export interface DiagnosticResult {
  ffmpeg: {
    available: boolean
    path: string
    version: string
  }
  ffprobe: {
    available: boolean
    path: string
    version: string
  }
  filters: {
    subtitles: boolean
    drawtext: boolean
    amix: boolean
    overlay: boolean
    hstack: boolean
    vstack: boolean
  }
  configPath: string | null
  settings: NanoaiSettings
}

/** 运行环境诊断 */
export function runDiagnostics(): Promise<DiagnosticResult> {
  const settings = loadSettings()

  return new Promise((resolve) => {
    const result: DiagnosticResult = {
      ffmpeg: { available: false, path: settings.ffmpeg.path, version: '' },
      ffprobe: { available: false, path: settings.ffmpeg.ffprobePath, version: '' },
      filters: { subtitles: false, drawtext: false, amix: false, overlay: false, hstack: false, vstack: false },
      configPath: findActiveConfigPath(),
      settings,
    }

    import('node:child_process').then(({ exec }) => {
      let done = 0
      const total = 3

      const finish = () => { if (++done >= total) resolve(result) }

      // ffmpeg version
      exec(`"${settings.ffmpeg.path}" -version 2>/dev/null | head -1`, (err, stdout) => {
        result.ffmpeg.available = !err && !!stdout.trim()
        result.ffmpeg.version = stdout.trim().split('\n')[0]
        finish()
      })

      // ffprobe version
      exec(`"${settings.ffmpeg.ffprobePath}" -version 2>/dev/null | head -1`, (err, stdout) => {
        result.ffprobe.available = !err && !!stdout.trim()
        result.ffprobe.version = stdout.trim().split('\n')[0]
        finish()
      })

      // filter check
      const filterNames = ['subtitles', 'drawtext', 'amix', 'overlay', 'hstack', 'vstack']
      exec(`"${settings.ffmpeg.path}" -filters 2>/dev/null`, (err, stdout) => {
        if (!err && stdout) {
          for (const name of filterNames) {
            const regex = new RegExp(`\\b${name}\\b`)
            ;(result.filters as any)[name] = regex.test(stdout)
          }
        }
        finish()
      })
    })
  })
}

/** 找到当前生效的配置文件路径 */
function findActiveConfigPath(): string | null {
  const globalPath = globalConfigPath()
  if (fs.existsSync(globalPath)) return globalPath

  for (const p of projectConfigPaths()) {
    if (fs.existsSync(p)) return p
  }
  return null
}
