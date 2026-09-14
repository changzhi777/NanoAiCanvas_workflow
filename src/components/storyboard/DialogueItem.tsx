'use client'

import { Volume2 } from 'lucide-react'
import type { DialogueLine } from '@/stores/nanoImageStoryboardStore'

interface DialogueItemProps {
  dialogue: DialogueLine
  characterAvatar?: string
  showScene?: boolean
  sceneNumber?: number
}

// 情绪标签配置
const EMOTION_CONFIG: Record<string, { label: string; color: string }> = {
  neutral: { label: '平静', color: 'bg-gray-500/20 text-gray-400' },
  happy: { label: '开心', color: 'bg-yellow-500/20 text-yellow-400' },
  sad: { label: '悲伤', color: 'bg-blue-500/20 text-blue-400' },
  angry: { label: '愤怒', color: 'bg-red-500/20 text-red-400' },
  surprised: { label: '惊讶', color: 'bg-purple-500/20 text-purple-400' },
  fearful: { label: '恐惧', color: 'bg-indigo-500/20 text-indigo-400' },
  disgusted: { label: '厌恶', color: 'bg-green-500/20 text-green-400' },
  contemptuous: { label: '轻蔑', color: 'bg-orange-500/20 text-orange-400' },
  excited: { label: '兴奋', color: 'bg-pink-500/20 text-pink-400' },
  calm: { label: '镇定', color: 'bg-cyan-500/20 text-cyan-400' },
}

// 语气标签配置
const TONE_CONFIG: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: 'bg-gray-500/20 text-gray-400' },
  whisper: { label: '低语', color: 'bg-slate-500/20 text-slate-400' },
  shout: { label: '大喊', color: 'bg-red-500/20 text-red-400' },
  sarcastic: { label: '讽刺', color: 'bg-purple-500/20 text-purple-400' },
  gentle: { label: '温柔', color: 'bg-pink-500/20 text-pink-400' },
  stern: { label: '严厉', color: 'bg-orange-500/20 text-orange-400' },
  playful: { label: '调皮', color: 'bg-cyan-500/20 text-cyan-400' },
  hesitant: { label: '犹豫', color: 'bg-yellow-500/20 text-yellow-400' },
  confident: { label: '自信', color: 'bg-green-500/20 text-green-400' },
}

// 语速显示
function formatSpeed(speed: number): string {
  if (speed < 0.8) return '慢速'
  if (speed > 1.2) return '快速'
  return '正常'
}

export function DialogueItem({ dialogue, characterAvatar, showScene, sceneNumber }: DialogueItemProps) {
  const emotionInfo = EMOTION_CONFIG[dialogue.emotion] || EMOTION_CONFIG.neutral
  const toneInfo = TONE_CONFIG[dialogue.tone] || TONE_CONFIG.normal

  return (
    <div className="flex gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      {/* 角色头像 */}
      <div className="flex-shrink-0">
        {characterAvatar ? (
          <img
            src={characterAvatar}
            alt={dialogue.characterName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {dialogue.characterName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {/* 角色名和标签 */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-foreground text-sm">
            {dialogue.characterName}
          </span>

          {/* 场景号 */}
          {showScene && sceneNumber !== undefined && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-muted-foreground">
              镜头{sceneNumber}
            </span>
          )}

          {/* 情绪标签 */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${emotionInfo.color}`}>
            {emotionInfo.label}
          </span>

          {/* 语气标签 */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${toneInfo.color}`}>
            {toneInfo.label}
          </span>

          {/* 强度指示器 */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">强度</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-3 rounded-md ${
                    i < dialogue.emotionIntensity ? 'bg-primary' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 对白文本 */}
        <p className="text-sm text-foreground mb-1">{dialogue.text}</p>

        {/* 底部信息 */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {/* 语速 */}
          <span>语速：{formatSpeed(dialogue.speed)} ({dialogue.speed.toFixed(1)}x)</span>

          {/* 停顿 */}
          {dialogue.pause > 0 && <span>停顿：{dialogue.pause}s</span>}

          {/* 舞台指示 */}
          {dialogue.stageDirection && (
            <span className="italic">（{dialogue.stageDirection}）</span>
          )}
        </div>
      </div>

      {/* TTS 预留按钮 */}
      <div className="flex-shrink-0">
        <button
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          title="TTS 合成（开发中）"
          disabled
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
