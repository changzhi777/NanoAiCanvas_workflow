'use client'

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StoryboardPanel } from './StoryboardPanel'
import type { StoryboardScene } from '@/stores/storyboardStore'

interface StoryboardChartTabProps {
  scenes: StoryboardScene[]
  images: string[]
  onDownloadImage?: (url: string, filename: string) => void
}

export function StoryboardChartTab({
  scenes,
  images,
  onDownloadImage,
}: StoryboardChartTabProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // 将图片映射到场景
  const sceneImages = scenes.map((scene, i) => ({
    scene,
    imageUrl: images[i] || '',
  }))

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
        {/* 标题 */}
        <div className="p-2 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {scenes.length} 个镜头 | {images.filter(Boolean).length}/{scenes.length} 张图片已生成
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
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            关闭
          </button>
        </div>
      )}
    </>
  )
}
