/**
 * 快捷键演示动画组件
 * 使用 GIF 或 CSS 动画展示快捷键使用效果
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutDemoProps {
  shortcutId: string
  description: string
  autoPlay?: boolean
}

// 演示动画映射（将来可以用真实的 GIF 替换）
const DEMO_ANIMATIONS: Record<string, { src: string; duration: number }> = {
  'add-node': { src: '/demos/add-node.gif', duration: 2000 },
  'save-canvas': { src: '/demos/save-canvas.gif', duration: 1500 },
  'undo': { src: '/demos/undo.gif', duration: 1800 },
  'redo': { src: '/demos/redo.gif', duration: 1800 },
  'delete': { src: '/demos/delete.gif', duration: 1600 },
  'toggle-shortcuts': { src: '/demos/toggle-shortcuts.gif', duration: 2000 },
  'zoom-in': { src: '/demos/zoom-in.gif', duration: 2000 },
  'zoom-out': { src: '/demos/zoom-out.gif', duration: 2000 },
  'fit-view': { src: '/demos/fit-view.gif', duration: 2500 },
  'copy': { src: '/demos/copy.gif', duration: 1800 },
  'paste': { src: '/demos/paste.gif', duration: 1800 },
  'duplicate': { src: '/demos/duplicate.gif', duration: 2000 },
  'toggle-properties': { src: '/demos/toggle-properties.gif', duration: 2000 },
  'toggle-templates': { src: '/demos/toggle-templates.gif', duration: 2000 },
  'toggle-toolbar': { src: '/demos/toggle-toolbar.gif', duration: 1800 },
  'search': { src: '/demos/search.gif', duration: 2500 },
  'next-node': { src: '/demos/next-node.gif', duration: 1500 },
  'prev-node': { src: '/demos/prev-node.gif', duration: 1500 },
  'escape': { src: '/demos/escape.gif', duration: 1500 },
}

// CSS 动画演示组件（临时方案，用于开发阶段）
function CSSAnimationDemo({ shortcutId }: { shortcutId: string }) {
  const animations: Record<string, JSX.Element> = {
    'add-node': (
      <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">⌘ + N</span>
              <span>→</span>
              <span className="text-primary">新节点出现</span>
            </div>
            <div className="w-16 h-12 bg-primary/20 border-2 border-primary rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    ),
    'save-canvas': (
      <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">⌘ + S</span>
              <span>→</span>
              <span className="text-primary">保存成功 ✓</span>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    ),
    'undo': (
      <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">⌘ + Z</span>
              <span>→</span>
              <span className="text-primary">撤销操作 ↩️</span>
            </div>
            <div className="text-2xl animate-bounce">↩️</div>
          </div>
        </div>
      </div>
    ),
  }

  return (
    animations[shortcutId] || (
      <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">演示动画开发中...</p>
      </div>
    )
  )
}

export default function ShortcutDemo({
  shortcutId,
  description,
  autoPlay = false,
}: ShortcutDemoProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [useCSSAnimation, setUseCSSAnimation] = useState(true) // 临时使用 CSS 动画

  const demo = DEMO_ANIMATIONS[shortcutId]

  const handlePlay = () => {
    setIsPlaying(true)
    // 播放完成后停止
    setTimeout(() => {
      setIsPlaying(false)
    }, demo?.duration || 2000)
  }

  return (
    <div className="space-y-2">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{description}</p>
        <Badge variant="outline" className="text-xs">
          演示
        </Badge>
      </div>

      {/* 动画区域 */}
      <div className="relative rounded-lg border bg-background overflow-hidden">
        {useCSSAnimation ? (
          // CSS 动画演示（临时方案）
          <CSSAnimationDemo shortcutId={shortcutId} />
        ) : (
          // GIF 演示（正式方案）
          demo && (
            <>
              <img
                src={demo.src}
                alt={description}
                className={cn(
                  'w-full h-auto',
                  !isPlaying && 'opacity-50'
                )}
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handlePlay}
                    className="w-12 h-12 rounded-full bg-background/80 hover:bg-background"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </div>
              )}
            </>
          )
        )}

        {/* 控制栏 */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            className="bg-background/80 hover:bg-background"
            onClick={() => setUseCSSAnimation(!useCSSAnimation)}
            title="切换演示模式"
          >
            {useCSSAnimation ? '🎬' : '🎨'}
          </Button>
        </div>
      </div>

      {/* 提示 */}
      <p className="text-xs text-muted-foreground">
        {isPlaying ? '演示播放中...' : '点击播放演示动画'}
      </p>
    </div>
  )
}

// 内联版本（用于快捷键面板中的紧凑显示）
export function InlineShortcutDemo({
  shortcutId,
}: {
  shortcutId: string
}) {
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="relative group">
      {/* 演示按钮 */}
      <button
        onClick={() => setShowDemo(!showDemo)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        title="查看演示"
      >
        <Play className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* 弹出演示 */}
      {showDemo && (
        <div className="absolute top-full right-0 mt-2 z-50 w-64 p-2 bg-popover border rounded-lg shadow-lg">
          <ShortcutDemo
            shortcutId={shortcutId}
            description={shortcutId.replace(/-/g, ' ')}
            autoPlay={true}
          />
        </div>
      )}
    </div>
  )
}
