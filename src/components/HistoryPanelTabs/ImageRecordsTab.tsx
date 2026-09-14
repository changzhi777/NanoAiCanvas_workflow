'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Download, Loader2, RefreshCw, ChevronUp, ChevronDown, Eye, Copy } from 'lucide-react'
import JSZip from 'jszip'
import { getImageAssetsApi, deleteImageAssetApi } from '@/lib/api/image-assets'
import { useAuthStore } from '@/stores/remoteStore'
import type { ImageAsset } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ImageRecordsTabProps {
  onViewImage: (imageUrl: string) => void
}

export function ImageRecordsTab({ onViewImage }: ImageRecordsTabProps) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const [assets, setAssets] = useState<ImageAsset[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadAssets = async () => {
    if (!token) {
      setAssets([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getImageAssetsApi({ pageSize: 100 })
      if (result.success) {
        setAssets(result.assets || [])
        setTotal(result.total || 0)
      }
    } catch {
      // 静默处理
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()

    const handleImageGenerated = () => {
      // 延迟刷新，等后端保存完成
      setTimeout(loadAssets, 1000)
    }
    window.addEventListener('image:generated', handleImageGenerated)
    return () => window.removeEventListener('image:generated', handleImageGenerated)
  }, [token])

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
      setTotal((t) => Math.max(0, t - 1))
      toast.success('已删除')
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
    } catch {
      toast.error('下载失败')
    }
  }

  const handleCopyPrompt = (prompt: string) => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    toast.success('提示词已复制')
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
      } catch {
        // 跳过失败的图片
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        请登录后查看生图记录
      </div>
    )
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
        <span className="text-xs text-muted-foreground">共 {total} 张图片</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={loadAssets} className="h-6 px-2 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            刷新
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleBatchDownload} className="h-6 px-2 text-xs">
              下载选中 ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {assets.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <input
            type="checkbox"
            checked={selectedIds.size === assets.length && assets.length > 0}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground">全选</span>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-2 relative">
        {assets.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">暂无生图记录</div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className={`group relative rounded-md overflow-hidden border transition-colors ${
                selectedIds.has(asset.id)
                  ? 'border-primary/50 ring-1 ring-primary/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* 选择框 */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={() => toggleSelect(asset.id)}
                  className="w-3.5 h-3.5 accent-primary"
                />
              </div>

              {/* 图片 */}
              <img
                src={asset.imageUrl}
                alt={asset.prompt}
                className="w-full h-auto object-contain cursor-pointer bg-black/20"
                onClick={() => onViewImage(asset.imageUrl)}
                loading="lazy"
              />

              {/* 提示词信息 */}
              {asset.prompt && (
                <div className="px-2 py-1.5 bg-card/80 border-t border-white/5">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {asset.prompt}
                  </p>
                  {asset.params?.model && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                      {asset.params.model}
                    </span>
                  )}
                  {asset.params?.size && (
                    <span className="inline-block mt-1 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                      {asset.params.size}
                    </span>
                  )}
                </div>
              )}

              {/* 悬停操作栏 */}
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  onClick={() => handleCopyPrompt(asset.prompt)}
                  title="复制提示词"
                >
                  <Copy className="w-3 h-3" />
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

              {/* 时间戳 */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/60">
                  {new Date(asset.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}

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
