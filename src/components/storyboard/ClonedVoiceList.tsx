'use client'

import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import { Button } from '@/components/ui/button'
import { Trash2, Volume2 } from 'lucide-react'
import { toast } from 'sonner'

export function ClonedVoiceList() {
  const { clonedVoices, removeClonedVoice } = useStoryboardVoiceStore()

  const handleDelete = async (voiceId: string, voiceName: string) => {
    try {
      removeClonedVoice(voiceId)
      toast.success(`已删除音色「${voiceName}」`)
    } catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  const handlePlay = (audioUrl: string) => {
    const audio = new Audio(audioUrl)
    audio.play().catch(() => {
      toast.error('无法播放音频')
    })
  }

  if (clonedVoices.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-center text-muted-foreground text-xs">
        暂无克隆音色，请上传或录制音频样本进行克隆
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <span className="text-green-400">●</span>
        克隆音色列表
        <span className="text-[10px] text-muted-foreground font-normal">
          ({clonedVoices.length})
        </span>
      </h3>

      <div className="space-y-2">
        {clonedVoices.map((voice) => (
          <div
            key={voice.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {/* 音色信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-xs truncate">
                  {voice.name}
                </span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-400">
                  克隆
                </span>
              </div>
              {voice.sampleText && (
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                  "{voice.sampleText}"
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(voice.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1">
              {voice.audioFileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => voice.audioFileUrl && handlePlay(voice.audioFileUrl)}
                  className="h-6 w-6 p-0"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(voice.id, voice.name)}
                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
