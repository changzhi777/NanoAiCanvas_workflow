'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Download, Package, Loader2, Bookmark, Check, RefreshCw, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import JSZip from 'jszip'
import { getImageAssetsApi, deleteImageAssetApi, createImageAssetApi } from '@/lib/api/image-assets'
import type { ImageAsset } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ImageRecordsTabProps {
  onViewImage: (imageUrl: string) => void
}

export function ImageRecordsTab({ onViewImage }: ImageRecordsTabProps) {
  const [assets, setAssets] = useState<ImageAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 加载图片资产（免登录模式）
  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const result = await getImageAssetsApi()
      if (result.success && result.assets) {
        setAssets(result.assets)
      }
    } catch (error) {
      // 静默处理 - image-assets API 可能未部署
      console.warn('Image assets API not available, skipping load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
    // 监听生图完成事件，自动刷新
    const handleImageGenerated = () => {
      loadAssets()
    }
    window.addEventListener('image:generated', handleImageGenerated)
    return () => window.removeEventListener('image:generated', handleImageGenerated)
  }, [])

  // Scroll functions
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteImageAssetApi(id)
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      toast.error('删除失败')
    }
  }

  const handleDownload = async (asset: ImageAsset) => {
    try {
      const response = await fetch(asset.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image_${asset.id.slice(0, 8)}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleSaveToGallery = async (asset: ImageAsset) => {
    try {
      // 创建一个新的图库记录（复制）
      const result = await createImageAssetApi({
        imageUrl: asset.imageUrl,
        prompt: asset.prompt,
        enhancedPrompt: asset.enhancedPrompt,
        params: asset.params,
        referenceImages: asset.referenceImages,
        isShared: true, // 保存到图库时设为共享
      })
      if (result.success) {
        toast.success('已保存到图库')
        loadAssets() // 刷新列表
      } else {
        toast.error('保存失败')
      }
    } catch (error) {
      console.error('Save to gallery failed:', error)
      toast.error('保存失败')
    }
  }

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return

    const zip = new JSZip()
    const selectedAssets = assets.filter((a) => selectedIds.has(a.id))

    for (const asset of selectedAssets) {
      try {
        const response = await fetch(asset.imageUrl)
        const blob = await response.blob()
        zip.file(`image_${asset.id.slice(0, 8)}.png`, blob)
      } catch (error) {
        console.error('Failed to fetch image:', error)
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `images_${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)

    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(assets.map((a) => a.id)))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-muted-foreground">共 {assets.length} 张图片</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={loadAssets} className="h-6 px-2 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            刷新
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleBatchDownload} className="h-6 px-2 text-xs">
              <Package className="w-3 h-3 mr-1" />
              下载选中
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 px-1">
        <input
          type="checkbox"
          checked={selectedIds.size === assets.length && assets.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4"
        />
        <span className="text-xs text-muted-foreground">全选</span>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col gap-2 relative">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`group relative rounded-md overflow-hidden border ${
              selectedIds.has(asset.id)
                ? 'border-primary'
                : 'border-white/10'
            }`}
          >
            <div className="absolute top-1 left-1 z-10">
              <input
                type="checkbox"
                checked={selectedIds.has(asset.id)}
                onChange={() => toggleSelect(asset.id)}
                className="w-4 h-4"
              />
            </div>
            <img
              src={asset.imageUrl}
              alt={asset.prompt}
              className="w-full h-auto object-contain cursor-pointer bg-black/20"
              onClick={() => onViewImage(asset.imageUrl)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-transparent to-black/80 p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-black/50 hover:bg-black/70"
                onClick={() => onViewImage(asset.imageUrl)}
                title="预览"
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-black/50 hover:bg-black/70"
                onClick={() => handleSaveToGallery(asset)}
                title="保存到图库"
              >
                <Bookmark className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-black/50 hover:bg-black/70"
                onClick={() => handleDownload(asset)}
                title="下载"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-black/50 hover:bg-black/70 text-destructive"
                onClick={() => handleDelete(asset.id)}
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Scroll buttons */}
        {assets.length > 3 && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center gap-2 py-2 bg-gradient-to-t from-transparent via-card/80 to-card/95">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20"
            >
              <ChevronUp className="w-3 h-3 mr-1" />
              顶部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToBottom}
              className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              底部
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
