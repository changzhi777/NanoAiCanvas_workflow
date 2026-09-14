'use client'

import { useState } from 'react'
import { X, Maximize2, Minimize2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImagePreviewDialogProps {
  open: boolean
  onClose: () => void
  imageUrl: string
  alt?: string
}

export function ImagePreviewDialog({
  open,
  onClose,
  imageUrl,
  alt = '图片预览',
}: ImagePreviewDialogProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  if (!open) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nano2-image-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const a = document.createElement('a')
      a.href = imageUrl
      a.download = `nano2-image-${Date.now()}.png`
      a.click()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`relative transition-all duration-300 ${
          isMaximized ? 'w-full h-full' : 'w-full h-full p-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={handleDownload}
            title="下载图片"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            title="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={alt}
            className={`object-contain transition-all duration-300 ${
              isMaximized ? 'max-w-full max-h-full' : 'max-w-full max-h-full rounded-lg'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
