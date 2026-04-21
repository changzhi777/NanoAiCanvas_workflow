/**
 * 游戏化成就系统
 * 包括使用频率成就、熟练度徽章、连续使用天数、可视化进度
 */

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement, ShortcutStats, UserStats } from '@/types/shortcuts'

// 成就定义
const ACHIEVEMENTS: Achievement[] = [
  // 使用频率成就
  {
    id: 'first-save',
    title: '第一次保存',
    description: '使用快捷键保存画布',
    icon: '💾',
    unlocked: false,
  },
  {
    id: 'save-master',
    title: '保存达人',
    description: '使用保存快捷键 100 次',
    icon: '💾',
    unlocked: false,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: 'copy-paste-pro',
    title: '复制粘贴高手',
    description: '使用复制粘贴快捷键 50 次',
    icon: '📋',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: 'undo-fan',
    title: '撤销爱好者',
    description: '使用撤销快捷键 200 次',
    icon: '↩️',
    unlocked: false,
    progress: 0,
    maxProgress: 200,
  },

  // 熟练度徽章
  {
    id: 'shortcut-novice',
    title: '快捷键新手',
    description: '掌握 5 个快捷键',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'shortcut-intermediate',
    title: '快捷键熟手',
    description: '掌握 15 个快捷键',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 15,
  },
  {
    id: 'shortcut-master',
    title: '快捷键大师',
    description: '掌握所有 27 个快捷键',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 27,
  },

  // 连续使用天数
  {
    id: 'first-day',
    title: '初次使用',
    description: '使用 NanoAiCanvas',
    icon: '🌟',
    unlocked: false,
  },
  {
    id: 'three-day-streak',
    title: '连续使用 3 天',
    description: '连续 3 天使用 NanoAiCanvas',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'seven-day-streak',
    title: '连续使用 7 天',
    description: '连续 7 天使用 NanoAiCanvas',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    maxProgress: 7,
  },
  {
    id: 'thirty-day-streak',
    title: '连续使用 30 天',
    description: '连续 30 天使用 NanoAiCanvas',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    maxProgress: 30,
  },
]

// 熟练度等级定义
const MASTERY_LEVELS = {
  beginner: { label: '新手', color: 'bg-gray-500', minUsage: 0 },
  intermediate: { label: '熟手', color: 'bg-blue-500', minUsage: 10 },
  advanced: { label: '高手', color: 'bg-blue-500', minUsage: 50 },
  master: { label: '大师', color: 'bg-yellow-500', minUsage: 100 },
} as const

interface AchievementSystemProps {
  shortcutStats: ShortcutStats[]
  userStats: UserStats
  onAchievementUnlock?: (achievement: Achievement) => void
}

export default function AchievementSystem({
  shortcutStats,
  userStats,
  onAchievementUnlock,
}: AchievementSystemProps) {
  const [showAchievements, setShowAchievements] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS)

  // 计算每个快捷键的熟练度
  const shortcutMastery = useMemo(() => {
    return shortcutStats.map((stat) => {
      let level: keyof typeof MASTERY_LEVELS = 'beginner'

      if (stat.usageCount >= MASTERY_LEVELS.master.minUsage) {
        level = 'master'
      } else if (stat.usageCount >= MASTERY_LEVELS.advanced.minUsage) {
        level = 'advanced'
      } else if (stat.usageCount >= MASTERY_LEVELS.intermediate.minUsage) {
        level = 'intermediate'
      }

      return {
        ...stat,
        level,
        levelInfo: MASTERY_LEVELS[level],
      }
    })
  }, [shortcutStats])

  // 更新成就进度
  useEffect(() => {
    const updatedAchievements = achievements.map((achievement) => {
      let progress = achievement.progress || 0
      let unlocked = achievement.unlocked

      // 使用频率成就
      if (achievement.id === 'first-save') {
        const saveStat = shortcutStats.find((s) => s.shortcutId === 'save-canvas')
        unlocked = (saveStat?.usageCount || 0) > 0
      } else if (achievement.id === 'save-master') {
        const saveStat = shortcutStats.find((s) => s.shortcutId === 'save-canvas')
        progress = Math.min(saveStat?.usageCount || 0, achievement.maxProgress || 100)
        unlocked = progress >= (achievement.maxProgress || 100)
      } else if (achievement.id === 'copy-paste-pro') {
        const copyStat = shortcutStats.find((s) => s.shortcutId === 'copy')
        const pasteStat = shortcutStats.find((s) => s.shortcutId === 'paste')
        progress = Math.min(
          (copyStat?.usageCount || 0) + (pasteStat?.usageCount || 0),
          achievement.maxProgress || 50
        )
        unlocked = progress >= (achievement.maxProgress || 50)
      } else if (achievement.id === 'undo-fan') {
        const undoStat = shortcutStats.find((s) => s.shortcutId === 'undo')
        progress = Math.min(undoStat?.usageCount || 0, achievement.maxProgress || 200)
        unlocked = progress >= (achievement.maxProgress || 200)
      }

      // 熟练度徽章
      else if (achievement.id === 'shortcut-novice') {
        const masteredCount = shortcutMastery.filter(
          (s) => s.level !== 'beginner'
        ).length
        progress = masteredCount
        unlocked = masteredCount >= (achievement.maxProgress || 5)
      } else if (achievement.id === 'shortcut-intermediate') {
        const masteredCount = shortcutMastery.filter(
          (s) => s.level !== 'beginner'
        ).length
        progress = masteredCount
        unlocked = masteredCount >= (achievement.maxProgress || 15)
      } else if (achievement.id === 'shortcut-master') {
        const masteredCount = shortcutMastery.filter(
          (s) => s.level !== 'beginner'
        ).length
        progress = masteredCount
        unlocked = masteredCount >= (achievement.maxProgress || 27)
      }

      // 连续使用天数
      else if (achievement.id === 'first-day') {
        unlocked = true
      } else if (
        ['three-day-streak', 'seven-day-streak', 'thirty-day-streak'].includes(
          achievement.id
        )
      ) {
        progress = userStats.consecutiveDays
        unlocked = progress >= (achievement.maxProgress || 3)
      }

      const newAchievement = { ...achievement, progress }
      if (!achievement.unlocked && unlocked && onAchievementUnlock) {
        // 成就解锁！
        setTimeout(() => onAchievementUnlock(newAchievement), 0)
      }

      return { ...achievement, progress, unlocked }
    })

    setAchievements(updatedAchievements)
  }, [shortcutStats, userStats, shortcutMastery, onAchievementUnlock])

  // 渲染成就列表
  const renderAchievements = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          成就系统
        </h3>
        <Badge variant="secondary" className="text-xs">
          {achievements.filter((a) => a.unlocked).length} / {achievements.length}
        </Badge>
      </div>

      <Separator />

      <div className="space-y-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={cn(
              'p-3 rounded-lg border transition-all',
              achievement.unlocked
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-muted/30 border-border/50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        achievement.unlocked && 'text-yellow-600 dark:text-yellow-500'
                      )}
                    >
                      {achievement.title}
                      {achievement.unlocked && (
                        <CheckCircle2 className="w-3 h-3 inline ml-1" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </div>

                {achievement.maxProgress && (
                  <div className="space-y-1">
                    <Progress
                      value={(achievement.progress || 0) / achievement.maxProgress * 100}
                      className="h-1"
                    />
                    <p className="text-xs text-muted-foreground">
                      {achievement.progress || 0} / {achievement.maxProgress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {/* 成就按钮 */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setShowAchievements(!showAchievements)}
        className={cn(
          'transition-all duration-200',
          showAchievements && 'bg-yellow-500/10 text-yellow-600'
        )}
        title="查看成就"
      >
        <Trophy className="w-4 h-4" />
      </Button>

      {/* 成就面板 */}
      {showAchievements && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {renderAchievements()}
        </div>
      )}
    </div>
  )
}

// 本地存储管理
export const AchievementStorage = {
  // 获取快捷键统计
  getShortcutStats: (): ShortcutStats[] => {
    const data = localStorage.getItem('shortcut-stats')
    return data ? JSON.parse(data) : []
  },

  // 保存快捷键统计
  saveShortcutStats: (stats: ShortcutStats[]) => {
    localStorage.setItem('shortcut-stats', JSON.stringify(stats))
  },

  // 记录快捷键使用
  recordShortcutUsage: (shortcutId: string) => {
    const stats = AchievementStorage.getShortcutStats()
    const existing = stats.find((s) => s.shortcutId === shortcutId)

    if (existing) {
      existing.usageCount++
      existing.lastUsed = Date.now()
      // 更新熟练度
      if (existing.usageCount >= 100) {
        existing.masteryLevel = 'master'
      } else if (existing.usageCount >= 50) {
        existing.masteryLevel = 'advanced'
      } else if (existing.usageCount >= 10) {
        existing.masteryLevel = 'intermediate'
      }
    } else {
      stats.push({
        shortcutId,
        usageCount: 1,
        lastUsed: Date.now(),
        masteryLevel: 'beginner',
      })
    }

    AchievementStorage.saveShortcutStats(stats)
  },

  // 获取用户统计
  getUserStats: (): UserStats => {
    const data = localStorage.getItem('user-stats')
    if (!data) {
      return {
        totalUsage: 0,
        consecutiveDays: 0,
        shortcutsLearned: 0,
        achievementsUnlocked: 0,
      }
    }
    return JSON.parse(data)
  },

  // 保存用户统计
  saveUserStats: (stats: UserStats) => {
    localStorage.setItem('user-stats', JSON.stringify(stats))
  },

  // 更新连续使用天数
  updateConsecutiveDays: () => {
    const stats = AchievementStorage.getUserStats()
    const lastLogin = localStorage.getItem('last-login-date')
    const today = new Date().toDateString()

    if (lastLogin) {
      const lastDate = new Date(lastLogin)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      if (lastDate.toDateString() === yesterday.toDateString()) {
        stats.consecutiveDays++
      } else if (lastDate.toDateString() !== today) {
        stats.consecutiveDays = 1
      }
    } else {
      stats.consecutiveDays = 1
    }

    localStorage.setItem('last-login-date', today)
    AchievementStorage.saveUserStats(stats)
  },
}
