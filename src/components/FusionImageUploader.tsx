'use client'

import { useCallback, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useChatStore } from '@/stores/nanoImageChatStore'
import type { FusionImage } from '@/types'

export function FusionImageUploader() {
  const { fusionImages, addFusionImage, removeFusionImage, clearFusionImages } = useChatStore()
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('请上传图片文件')
        return
      }

      if (fusionImages.length >= 4) {
        toast.warning('最多上传 4 张图片')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        const newImage: FusionImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url,
          file,
        }
        addFusionImage(newImage)
      }
      reader.readAsDataURL(file)
    },
    [fusionImages.length, addFusionImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const remainingSlots = 4 - fusionImages.length
      const filesToProcess = files.slice(0, remainingSlots)

      filesToProcess.forEach(handleFile)
    },
    [fusionImages.length, handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const remainingSlots = 4 - fusionImages.length
      const filesToProcess = files.slice(0, remainingSlots)

      filesToProcess.forEach(handleFile)
      e.target.value = ''
    },
    [fusionImages.length, handleFile]
  )

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center transition-colors
          bg-card/60 backdrop-blur-xl border-white/10
          ${isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'hover:border-white/20'}
          ${fusionImages.length >= 4 ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={fusionImages.length >= 4}
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          拖拽或点击上传图片
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {fusionImages.length}/4 张图片
        </p>
      </div>

      {/* Image Preview Grid */}
      {fusionImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fusionImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-card/40 group"
            >
              <img
                src={image.url}
                alt="融合图片"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeFusionImage(image.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: 4 - fusionImages.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-lg border-2 border-dashed border-white/10
                         flex items-center justify-center"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      )}

      {/* Clear Button */}
      {fusionImages.length > 0 && (
        <button
          onClick={clearFusionImages}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          清空所有图片
        </button>
      )}
    </div>
  )
}
