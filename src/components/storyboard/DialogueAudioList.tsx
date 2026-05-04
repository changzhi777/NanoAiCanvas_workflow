'use client'

import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import { Button } from '@/components/ui/button'
import { Play, Pause, Download, Trash2 } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { StoryboardScene } from '@/stores/nanoImageStoryboardStore'

interface DialogueAudioListProps {
  dialogues: Array<{
    id: string
    sceneId: number
    text: string
    characterId: string
    characterName: string
  }>
  scenes: StoryboardScene[]
}

export function DialogueAudioList({ dialogues, scenes }: DialogueAudioListProps) {
  const { dialogueAudios, removeDialogueAudio } = useStoryboardVoiceStore()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // 获取场景信息
  const getSceneInfo = (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    return scene ? `${scene.shotType} - ${scene.duration}` : `场景 ${sceneId}`
  }

  // 播放/暂停音频
  const togglePlay = useCallback((dialogueId: string, audioUrl: string) => {
    const audio = audioRefs.current.get(dialogueId)

    if (!audio) {
      const newAudio = new Audio(audioUrl)
      newAudio.onended = () => setPlayingId(null)
      newAudio.onerror = () => {
        toast.error('音频加载失败')
        setPlayingId(null)
      }
      audioRefs.current.set(dialogueId, newAudio)
      newAudio.play()
      setPlayingId(dialogueId)
    } else if (playingId === dialogueId) {
      audio.pause()
      setPlayingId(null)
    } else {
      // 暂停其他音频
      audioRefs.current.forEach(a => a.pause())
      audio.play()
      setPlayingId(dialogueId)
    }
  }, [playingId])

  // 下载音频
  const handleDownload = useCallback((audioUrl: string, characterName: string, dialogueId: string) => {
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `${characterName}_${dialogueId}.wav`
    a.click()
  }, [])

  // 删除音频
  const handleDelete = useCallback((dialogueId: string) => {
    removeDialogueAudio(dialogueId)
    // 清理 audio 元素
    const audio = audioRefs.current.get(dialogueId)
    if (audio) {
      audio.pause()
      audioRefs.current.delete(dialogueId)
    }
    if (playingId === dialogueId) {
      setPlayingId(null)
    }
  }, [removeDialogueAudio, playingId])

  if (dialogueAudios.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-white/10 bg-white/5 text-center text-muted-foreground text-xs">
        <div className="text-lg mb-2">🎙️</div>
        <div>暂无生成音频，点击上方按钮开始生成</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {dialogueAudios.map((audio) => {
        const dialogue = dialogues.find(d => d.id === audio.dialogueId)
        const isPlaying = playingId === audio.dialogueId

        return (
          <div
            key={audio.dialogueId}
            className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* 播放按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePlay(audio.dialogueId, audio.audioUrl)}
                className="w-8 h-8 rounded-full p-0 flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-xs">
                    {audio.characterName}
                  </span>
                  <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-muted-foreground">
                    {getSceneInfo(audio.sceneId)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {audio.text}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(audio.audioUrl, audio.characterName, audio.dialogueId)}
                  className="h-7 w-7 p-0"
                  title="下载音频"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(audio.dialogueId)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  title="删除音频"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* 参数信息 */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span>语速: {audio.params.speed.toFixed(1)}x</span>
              <span>音量: {(audio.params.volume * 100).toFixed(0)}%</span>
              <span>格式: {audio.params.responseFormat.toUpperCase()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
