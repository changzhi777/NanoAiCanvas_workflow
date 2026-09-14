'use client'

import { useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StoryboardPanel } from './StoryboardPanel'
import { Button } from '@/components/ui/button'
import { Video, Download, Loader2 } from 'lucide-react'
import type { StoryboardScene } from '@/stores/nanoImageStoryboardStore'
import { toast } from 'sonner'

interface StoryboardChartTabProps {
  scenes: StoryboardScene[]
  images: string[]
  onDownloadImage?: (url: string, filename: string) => void
  onGenerateVideo?: (sceneId: number, imageUrl: string) => void
  isVideoGenerating?: boolean
}

export function StoryboardChartTab({
  scenes,
  images,
  onDownloadImage,
  onGenerateVideo,
  isVideoGenerating = false,
}: StoryboardChartTabProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [generatingSceneId, setGeneratingSceneId] = useState<number | null>(null)

  // 将图片映射到场景
  const sceneImages = scenes.map((scene, i) => ({
    scene,
    imageUrl: images[i] || '',
  }))

  const handleGenerateVideo = useCallback(async (sceneId: number, imageUrl: string) => {
    if (!imageUrl) {
      toast.error('请先生成图片')
      return
    }
    setGeneratingSceneId(sceneId)
    try {
      onGenerateVideo?.(sceneId, imageUrl)
    } finally {
      setTimeout(() => setGeneratingSceneId(null), 2000)
    }
  }, [onGenerateVideo])

  const handleBatchExport = useCallback(() => {
    if (images.filter(Boolean).length === 0) {
      toast.error('没有可导出的图片')
      return
    }
    // 批量下载图片
    images.forEach((url, i) => {
      if (url && onDownloadImage) {
        setTimeout(() => {
          onDownloadImage(url, `scene-${i + 1}.png`)
        }, i * 200)
      }
    })
    toast.success(`已触发 ${images.filter(Boolean).length} 张图片下载`)
  }, [images, onDownloadImage])

  if (scenes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        暂无故事板内容
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        {/* 标题栏 */}
        <div className="p-2 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {scenes.length} 个镜头 | {images.filter(Boolean).length}/{scenes.length} 张图片已生成
          </div>
          <div className="flex items-center gap-2">
            {images.filter(Boolean).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleBatchExport}
              >
                <Download className="w-3 h-3 mr-1" />
                批量导出
              </Button>
            )}
            {onGenerateVideo && images.filter(Boolean).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                onClick={() => {
                  // 生成所有图片的视频
                  const validImages = images.filter(Boolean)
                  if (validImages.length > 0) {
                    handleGenerateVideo(-1, validImages[0])
                  }
                }}
                disabled={isVideoGenerating}
              >
                {isVideoGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Video className="w-3 h-3 mr-1" />
                    生成视频
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 故事板网格 */}
        <div className="p-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sceneImages.map(({ scene, imageUrl }, index) => (
              <StoryboardPanel
                key={scene.id}
                scene={scene}
                sceneNumber={index + 1}
                imageUrl={imageUrl}
                onDownload={onDownloadImage}
                onZoom={setZoomedImage}
                onGenerateVideo={onGenerateVideo ? handleGenerateVideo : undefined}
                isVideoGenerating={isVideoGenerating && generatingSceneId === scene.id}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* 图片放大查看 */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="放大查看"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {onDownloadImage && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  const filename = zoomedImage.split('/').pop() || 'scene.png'
                  onDownloadImage(zoomedImage, filename)
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                下载
              </Button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setZoomedImage(null)
              }}
              className="px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  )
}