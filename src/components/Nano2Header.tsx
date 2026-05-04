'use client'

import { Images, Package, Workflow } from 'lucide-react'
import { LoginButton } from '@/components/ui/AuthDialog'

interface Nano2HeaderProps {
  onSwitchToAssets?: () => void
}

export function Nano2Header({ onSwitchToAssets }: Nano2HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Images className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Nano2 Image</h1>
          <p className="text-xs text-muted-foreground">AI图片瑞士军刀</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled
          className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary/50 cursor-not-allowed opacity-50"
        >
          🍌 香蕉哥哥
        </button>
        <button
          disabled
          className="px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground cursor-not-allowed opacity-50"
        >
          <Package className="w-4 h-4 inline mr-1" />
          故事板
        </button>
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

        {/* 统一使用 LoginButton 组件 */}
        <LoginButton />
      </div>
    </header>
  )
}
