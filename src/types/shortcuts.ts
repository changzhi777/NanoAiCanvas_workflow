/**
 * 快捷键系统类型定义
 */

// 快捷键组合类型
export type KeyCombo = string[]

// 快捷键冲突类型
export type ConflictType = 'system' | 'browser' | 'custom'

// 快捷键冲突信息
export interface ShortcutConflict {
  type: ConflictType
  shortcut: KeyCombo
  description: string
  suggestion?: KeyCombo
}

// 快捷键配置项
export interface ShortcutConfig {
  id: string // 唯一标识
  defaultKeys: KeyCombo // 默认快捷键
  currentKeys: KeyCombo // 当前快捷键
  description: string // 描述
  category: string // 分类
  important?: boolean // 是否常用
  conflict?: ShortcutConflict // 冲突信息
}

// 快捷键分类
export interface ShortcutCategory {
  title: string
  description: string
  shortcuts: ShortcutConfig[]
}

// 自定义快捷键存储格式
export interface CustomShortcuts {
  [shortcutId: string]: KeyCombo
}

// 虚拟键盘布局
export interface KeyboardLayout {
  row: number
  keys: KeyboardKey[]
}

export interface KeyboardKey {
  code: string
  label: string
  width?: number // 1 = 标准宽度, 2 = 双倍宽度（如空格）
  type?: 'modifier' | 'letter' | 'number' | 'special' | 'space'
}

// 成就系统类型
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

// 快捷键使用统计
export interface ShortcutStats {
  shortcutId: string
  usageCount: number
  lastUsed: number
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'master'
}

// 用户总览统计
export interface UserStats {
  totalUsage: number
  consecutiveDays: number
  shortcutsLearned: number
  achievementsUnlocked: number
}
