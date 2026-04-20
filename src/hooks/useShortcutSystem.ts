/**
 * 快捷键系统管理 Hook
 * 整合所有快捷键相关功能
 */

import { useState, useEffect, useCallback } from 'react'
import type { ShortcutConfig, ShortcutStats, UserStats, ShortcutCategory } from '@/types/shortcuts'
import { DEFAULT_SHORTCUTS } from '@/config/shortcuts'
import { hasCompletedGuide } from '@/components/canvas/FirstTimeGuide'
import { AchievementStorage } from '@/components/canvas/AchievementSystem'

interface UseShortcutSystemOptions {
  onShortcutTrigger?: (shortcutId: string) => void
  disableGlobalListener?: boolean // 禁用全局键盘监听，避免与其他快捷键系统冲突
}

interface UseShortcutSystemReturn {
  // 快捷键配置
  shortcuts: ShortcutCategory[]
  updateShortcut: (id: string, keys: string[]) => void
  resetShortcut: (id: string) => void
  resetAllShortcuts: () => void

  // 使用统计
  stats: ShortcutStats[]
  userStats: UserStats
  recordUsage: (shortcutId: string) => void

  // 首次引导
  showGuide: boolean
  completeGuide: () => void

  // 自定义编辑器
  isEditing: boolean
  startEditing: () => void
  stopEditing: () => void
  saveShortcuts: (shortcuts: ShortcutConfig[]) => void

  // 键盘事件处理
  handleKeyDown: (e: KeyboardEvent) => boolean
}

export function useShortcutSystem(
  options: UseShortcutSystemOptions = {}
): UseShortcutSystemReturn {
  const { onShortcutTrigger, disableGlobalListener = false } = options

  // 快捷键配置
  const [shortcuts, setShortcuts] = useState<ShortcutCategory[]>(() => {
    // 从 localStorage 加载自定义快捷键
    const customShortcuts = localStorage.getItem('custom-shortcuts')
    if (customShortcuts) {
      const custom = JSON.parse(customShortcuts)
      return DEFAULT_SHORTCUTS.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.map((shortcut) => ({
          ...shortcut,
          currentKeys: custom[shortcut.id] || shortcut.defaultKeys,
        })),
      }))
    }
    return DEFAULT_SHORTCUTS
  })

  // 使用统计
  const [stats, setStats] = useState<ShortcutStats[]>(() =>
    AchievementStorage.getShortcutStats()
  )
  const [userStats, setUserStats] = useState<UserStats>(() =>
    AchievementStorage.getUserStats()
  )

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false)

  // 首次引导
  const [showGuide, setShowGuide] = useState(() => !hasCompletedGuide())

  // 更新快捷键
  const updateShortcut = useCallback((id: string, keys: string[]) => {
    setShortcuts((prev) =>
      prev.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.map((shortcut: ShortcutConfig) =>
          shortcut.id === id ? { ...shortcut, currentKeys: keys } : shortcut
        ),
      }))
    )
  }, [])

  // 重置单个快捷键
  const resetShortcut = useCallback((id: string) => {
    setShortcuts((prev) =>
      prev.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.map((shortcut: ShortcutConfig) =>
          shortcut.id === id
            ? { ...shortcut, currentKeys: shortcut.defaultKeys }
            : shortcut
        ),
      }))
    )
  }, [])

  // 重置所有快捷键
  const resetAllShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS)
  }, [])

  // 记录快捷键使用
  const recordUsage = useCallback(
    (shortcutId: string) => {
      AchievementStorage.recordShortcutUsage(shortcutId)
      setStats(AchievementStorage.getShortcutStats())

      // 更新用户总统计
      const newStats = AchievementStorage.getUserStats()
      newStats.totalUsage++
      AchievementStorage.saveUserStats(newStats)
      setUserStats(newStats)

      // 触发回调
      if (onShortcutTrigger) {
        onShortcutTrigger(shortcutId)
      }
    },
    [onShortcutTrigger]
  )

  // 完成引导
  const completeGuide = useCallback(() => {
    setShowGuide(false)
  }, [])

  // 开始编辑
  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  // 停止编辑
  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  // 保存快捷键配置
  const saveShortcuts = useCallback((newShortcuts: ShortcutConfig[]) => {
    const custom: Record<string, string[]> = {}
    newShortcuts.forEach((shortcut) => {
      if (
        JSON.stringify(shortcut.currentKeys) !==
        JSON.stringify(shortcut.defaultKeys)
      ) {
        custom[shortcut.id] = shortcut.currentKeys
      }
    })

    // 更新现有分类
    setShortcuts((prev) =>
      prev.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.map((originalShortcut) => {
          const updated = newShortcuts.find((s) => s.id === originalShortcut.id)
          return updated || originalShortcut
        }),
      }))
    )

    localStorage.setItem('custom-shortcuts', JSON.stringify(custom))
    setIsEditing(false)
  }, [])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      // 如果正在编辑，不处理快捷键
      if (isEditing) return false

      // 构建按键组合
      const keys: string[] = []
      if (e.metaKey) keys.push('⌘')
      if (e.ctrlKey) keys.push('⌃')
      if (e.altKey) keys.push('⌥')
      if (e.shiftKey) keys.push('⇧')

      // 将按键代码转换为显示标签
      const keyMap: Record<string, string> = {
        '?': '?',
        ' ': '空格',
        'Escape': 'Esc',
        'Enter': '↩',
        'Tab': 'Tab',
        'Backspace': '⌫',
        'Delete': '⌫',
      }

      const key = keyMap[e.key] || e.key
      if (key && !keys.includes(key)) {
        keys.push(key)
      }

      // 查找匹配的快捷键
      let matchedShortcut: ShortcutConfig | undefined

      for (const category of shortcuts) {
        for (const shortcut of category.shortcuts) {
          if (JSON.stringify(shortcut.currentKeys) === JSON.stringify(keys)) {
            matchedShortcut = shortcut
            break
          }
        }
        if (matchedShortcut) break
      }

      if (matchedShortcut) {
        e.preventDefault()
        recordUsage(matchedShortcut.id)

        // 特殊处理某些快捷键
        if (matchedShortcut.id === 'toggle-shortcuts') {
          // 由父组件处理
          return true
        }

        return true
      }

      return false
    },
    [shortcuts, isEditing, recordUsage]
  )

  // 初始化时更新连续使用天数
  useEffect(() => {
    AchievementStorage.updateConsecutiveDays()
    setUserStats(AchievementStorage.getUserStats())
  }, [])

  // 全局键盘事件监听（可选，默认禁用以避免冲突）
  useEffect(() => {
    if (disableGlobalListener) return // 禁用全局监听

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleKeyDown, disableGlobalListener])

  return {
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    stats,
    userStats,
    recordUsage,
    showGuide,
    completeGuide,
    isEditing,
    startEditing,
    stopEditing,
    saveShortcuts,
    handleKeyDown,
  }
}
