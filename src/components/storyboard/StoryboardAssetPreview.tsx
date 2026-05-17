'use client'

import { useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Images,
  User,
  Volume2,
  Download,
  Trash2,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  FileJson,
  Calendar,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { StoryboardAsset } from '@/types'

interface StoryboardAssetPreviewProps {
  asset: StoryboardAsset | null
  onDownload?: () => void
  onDelete?: () => void
  onShare?: () => void
}

export function StoryboardAssetPreview({
  asset,
  onDownload,
  onDelete,
  onShare,
}: StoryboardAssetPreviewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  // 播放/暂停音频
  const toggleAudio = useCallback((audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null)
    } else {
      setPlayingAudio(audioUrl)
    }
  }, [playingAudio])

  // 复制脚本JSON
  const handleCopyScript = useCallback(() => {
    if (!asset?.script) return
    navigator.clipboard.writeText(JSON.stringify(asset.script, null, 2))
      .then(() => toast.success('脚本已复制'))
      .catch(() => toast.error('复制失败'))
  }, [asset?.script])

  // 下载JSON
  const handleDownloadScript = useCallback(() => {
    if (!asset?.script) return
    const blob = new Blob([JSON.stringify(asset.script, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${asset.title || 'storyboard'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [asset?.script, asset?.title])

  if (!asset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Images className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-sm">选择资产查看详情</p>
      </div>
    )
  }

  const images = asset.storyboardImages || []
  const characters = asset.script?.characters || []
  const audios = asset.dialogueAudios || []
  const scenes = asset.script?.scenes || []

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* 标题 */}
        <div>
          <h2 className="text-lg font-bold text-foreground">{asset.title}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(asset.createdAt), 'yyyy-MM-dd HH:mm')}
          </div>
        </div>

        {/* 剧本梗概 */}
        {asset.synopsis && (
          <div className="p-3 rounded-lg bg-white/5">
            <h3 className="text-xs font-medium mb-1">剧本梗概</h3>
            <p className="text-xs text-muted-foreground">{asset.synopsis}</p>
          </div>
        )}

        {/* 场景图轮播 */}
        {images.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Images className="w-3 h-3" />
              场景图 ({images.length})
            </h3>
            <div className="relative rounded-lg overflow-hidden bg-black/20">
              <img
                src={images[currentImageIndex]}
                alt={`场景 ${currentImageIndex + 1}`}
                className="w-full aspect-video object-contain"
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 h-8 w-8"
                    onClick={() => setCurrentImageIndex(i => (i > 0 ? i - 1 : images.length - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 h-8 w-8"
                    onClick={() => setCurrentImageIndex(i => (i < images.length - 1 ? i + 1 : 0))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/50 rounded text-xs">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
            {/* 缩略图列表 */}
            <div className="flex gap-1 mt-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden border-2 transition-colors ${
                    currentImageIndex === idx ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 角色设计图 */}
        {characters.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-2 flex items-center gap-1">
              <User className="w-3 h-3" />
              角色 ({characters.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {characters.map((char: any) => {
                const design = asset.characterDesigns?.find(d => d.characterId === char.id)
                return (
                  <div key={char.id} className="p-2 rounded-lg bg-white/5">
                    {design?.imageUrl ? (
                      <img
                        src={design.imageUrl}
                        alt={char.name}
                        className="w-full aspect-square object-cover rounded mb-1"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded bg-white/5 flex items-center justify-center mb-1">
                        <User className="w-8 h-8 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{char.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {char.role === 'protagonist' ? '主角' : char.role === 'supporting' ? '配角' : '龙套'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 音频列表 */}
        {audios.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              音频 ({audios.length})
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {audios.map((audio: any, idx: number) => (
                <div
                  key={audio.dialogueId || idx}
                  className="flex items-center gap-2 p-2 rounded bg-white/5"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => toggleAudio(audio.audioUrl)}
                  >
                    {playingAudio === audio.audioUrl ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{audio.characterName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{audio.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {playingAudio && (
              <audio
                src={playingAudio}
                autoPlay
                onEnded={() => setPlayingAudio(null)}
                className="hidden"
              />
            )}
          </div>
        )}

        {/* 场景信息 */}
        {scenes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-2">场景列表</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {scenes.map((scene: any, idx: number) => (
                <div key={scene.id || idx} className="p-2 rounded bg-white/5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
                      镜头{idx + 1}
                    </span>
                    <span className="text-muted-foreground">{scene.shotType}</span>
                    <span className="text-muted-foreground">{scene.duration}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                    {scene.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            下载全部
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleDownloadScript}
          >
            <FileJson className="w-4 h-4 mr-2" />
            下载脚本 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleCopyScript}
          >
            <Copy className="w-4 h-4 mr-2" />
            复制脚本
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="w-full justify-start"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
