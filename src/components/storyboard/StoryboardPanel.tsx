'use client'

import { useState, useCallback } from 'react'
import { Download, ZoomIn, Maximize2, Film } from 'lucide-react'
import type { StoryboardScene } from '@/stores/nanoImageStoryboardStore'
import { cn } from '@/lib/utils'

interface StoryboardPanelProps {
  scene: StoryboardScene
  sceneNumber: number
  imageUrl?: string
  onDownload?: (url: string, filename: string) => void
  onZoom?: (imageUrl: string) => void
  onGenerateVideo?: (sceneId: number, imageUrl: string) => void
  isVideoGenerating?: boolean
}

export function StoryboardPanel({
  scene,
  sceneNumber,
  imageUrl,
  onDownload,
  onZoom,
  onGenerateVideo,
  isVideoGenerating = false,
}: StoryboardPanelProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 生成对白摘要
  const dialogueSummary = scene.dialogues
    .slice(0, 2)
    .map((d) => `${d.characterName}：${d.text.substring(0, 20)}...`)
    .join(' | ')

  const handleDownload = useCallback(() => {
    if (imageUrl && onDownload) {
      onDownload(imageUrl, `scene-${sceneNumber}.png`)
    }
  }, [imageUrl, onDownload, sceneNumber])

  const handleZoom = useCallback(() => {
    if (imageUrl && onZoom) {
      setIsFullscreen(true)
    }
  }, [imageUrl, onZoom])

  return (
    <>
      <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden group">
        {/* 图片区域 */}
        <div className="aspect-video bg-white/5 relative">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={`场景 ${sceneNumber}`}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
              />

              {/* 悬停操作按钮 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onZoom && (
                  <button
                    onClick={handleZoom}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    title="放大查看"
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={handleDownload}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    title="下载图片"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </button>
                )}
                {onGenerateVideo && (
                  <button
                    onClick={() => onGenerateVideo(scene.id, imageUrl)}
                    className="p-2 bg-purple-500/50 rounded-lg hover:bg-purple-500/70 transition-colors"
                    title="生成视频"
                    disabled={isVideoGenerating}
                  >
                    <Film className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* 加载占位 */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{sceneNumber}</div>
                <div className="text-xs">等待生成</div>
              </div>
            </div>
          )}

          {/* 场景编号徽章 */}
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
            镜头 {sceneNumber}
          </div>

          {/* 视频生成中状态 */}
          {isVideoGenerating && imageUrl && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                <span className="text-white text-xs">生成中...</span>
              </div>
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-2">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">{scene.shotType}</span>
              <span className="text-xs text-muted-foreground">{scene.duration}</span>
            </div>
            <span className="text-xs text-muted-foreground">{scene.camera}</span>
          </div>

          {/* 画面描述 */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
            {scene.description}
          </p>

          {/* 对白摘要 */}
          {dialogueSummary && (
            <p className="text-[10px] text-muted-foreground/70 line-clamp-1 italic">
              {dialogueSummary}
            </p>
          )}

          {/* 旁白 */}
          {scene.narrator && (
            <p className="text-[10px] text-cyan-400/70 line-clamp-1 mt-1">
              【旁白】{scene.narrator}
            </p>
          )}
        </div>
      </div>

      {/* 全屏预览 */}
      {isFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt={`场景 ${sceneNumber}`}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}