'use client'

import { Image, Sparkles, Eye, Wand2 } from 'lucide-react'
import { useChatStore } from '@/stores/nanoImageChatStore'
import type { GenerationMode } from '@/types'
import { cn } from '@/lib/utils'

const MODE_OPTIONS: { value: GenerationMode; label: string; icon: typeof Image; description: string }[] = [
  {
    value: 'text-to-image',
    label: '文生图',
    icon: Sparkles,
    description: '输入描述生成图片',
  },
  {
    value: 'fusion',
    label: '融图',
    icon: Image,
    description: '上传多图融合',
  },
  {
    value: 'reference',
    label: '参考图',
    icon: Eye,
    description: '上传图片反推提示词',
  },
  {
    value: 'ai-skill',
    label: 'AI作图',
    icon: Wand2,
    description: 'AI智能模板推荐生图',
  },
]

export function FusionModeToggle() {
  const { generationMode, setGenerationMode, clearFusionImages, clearReferenceImage } = useChatStore()

  const handleModeChange = (mode: GenerationMode) => {
    if (mode !== generationMode) {
      setGenerationMode(mode)
      if (mode === 'text-to-image') {
        clearFusionImages()
        clearReferenceImage()
      }
      if (mode === 'reference') {
        clearFusionImages()
      }
      if (mode === 'fusion') {
        clearReferenceImage()
      }
      if (mode === 'ai-skill') {
        clearFusionImages()
        clearReferenceImage()
      }
    }
  }

  return (
    <div className="flex gap-1 p-1 bg-card/60 backdrop-blur-xl border border-white/10 rounded-lg">
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = generationMode === option.value

        return (
          <button
            key={option.value}
            onClick={() => handleModeChange(option.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
            title={option.description}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
