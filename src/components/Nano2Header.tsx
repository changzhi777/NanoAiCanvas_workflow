'use client'

import { Images, Package, Workflow, Film } from 'lucide-react'
import { LoginButton } from '@/components/ui/LoginButton'
import { useAppVisibilityStore } from '@/stores/appVisibilityStore'
import { cn } from '@/lib/utils'

export type Nano2Mode = 'image' | 'tvc'

interface Nano2HeaderProps {
  onSwitchToAssets?: () => void
  mode?: Nano2Mode
  onModeChange?: (mode: Nano2Mode) => void
}

const MODE_CONFIG: Record<Nano2Mode, { icon: typeof Images; title: string; subtitle: string }> = {
  image: { icon: Images, title: 'Nano2 Image', subtitle: 'AI图片瑞士军刀' },
  tvc: { icon: Film, title: 'Nano2 TVC', subtitle: 'AI视频广告制作' },
}

export function Nano2Header({ onSwitchToAssets, mode = 'image', onModeChange }: Nano2HeaderProps) {
  const nano2Visibility = useAppVisibilityStore(state => state.nano2Modules)
  const bananaVisible = nano2Visibility['banana-brother'] !== 'hidden'
  const config = MODE_CONFIG[mode]
  const ModeIcon = config.icon

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <ModeIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
          <p className="text-xs text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 模式切换 */}
        <div className="flex items-center bg-muted/50 rounded-full p-0.5">
          <button
            onClick={() => onModeChange?.('image')}
            className={cn(
              'px-3 py-1 rounded-full text-xs transition-colors',
              mode === 'image' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Images className="w-3.5 h-3.5 inline mr-1" />
            生图
          </button>
          <button
            onClick={() => onModeChange?.('tvc')}
            className={cn(
              'px-3 py-1 rounded-full text-xs transition-colors',
              mode === 'tvc' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Film className="w-3.5 h-3.5 inline mr-1" />
            视频
          </button>
        </div>

        {mode === 'image' && bananaVisible && (
          <button
            disabled
            className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary/50 cursor-not-allowed opacity-50"
          >
            🍌 香蕉哥哥
          </button>
        )}
        <button
          onClick={onSwitchToAssets}
          className="px-3 py-1.5 rounded-full text-sm bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <Package className="w-4 h-4 inline mr-1" />
          资产库
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('switch-page', { detail: 'workflow' }))}
          className="px-3 py-1.5 rounded-full text-sm bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <Workflow className="w-4 h-4 inline mr-1" />
          Workflow
        </button>

        <LoginButton />
      </div>
    </header>
  )
}
