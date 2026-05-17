'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  User,
  FileText,
  List,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryboardAsset, PreviewType } from '@/types'

interface AssetPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: StoryboardAsset | null
  initialType?: PreviewType
  initialIndex?: number
}

export function AssetPreviewDialog({
  open,
  onOpenChange,
  asset,
  initialType = 'scene',
  initialIndex = 0,
}: AssetPreviewDialogProps) {
  const [previewType, setPreviewType] = useState<PreviewType>(initialType)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 重置状态
  useEffect(() => {
    if (open) {
      setPreviewType(initialType)
      setCurrentIndex(initialIndex)
      setZoom(1)
      setPlayingAudio(null)
    }
  }, [open, initialType, initialIndex])

  // 停止音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // 切换预览类型
  const handleSwitchType = useCallback((type: PreviewType) => {
    setPreviewType(type)
    setCurrentIndex(0)
    setZoom(1)
    setPlayingAudio(null)
  }, [])

  // 上一张/下一张
  const handlePrev = useCallback(() => {
    const maxIndex = getMaxIndex()
    setCurrentIndex(i => (i > 0 ? i - 1 : maxIndex))
  }, [previewType])

  const handleNext = useCallback(() => {
    const maxIndex = getMaxIndex()
    setCurrentIndex(i => (i < maxIndex ? i + 1 : 0))
  }, [previewType])

  // 获取最大索引
  const getMaxIndex = useCallback(() => {
    if (!asset) return 0
    switch (previewType) {
      case 'scene':
        return (asset.storyboardImages?.length || 1) - 1
      case 'character':
        return (asset.characterDesigns?.length || 1) - 1
      default:
        return 0
    }
  }, [asset, previewType])

  // 播放/暂停音频
  const toggleAudio = useCallback((audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    } else {
      setPlayingAudio(audioUrl)
    }
  }, [playingAudio])

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.25, 0.5))
  }, [])

  // 键盘导航
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isFullscreen, handlePrev, handleNext])

  if (!asset) return null

  const scenes = asset.script?.scenes || []
  const characters = asset.script?.characters || []
  const audios = asset.dialogueAudios || []
  const images = asset.storyboardImages || []
  const characterDesigns = asset.characterDesigns || []

  // 当前场景数据
  const currentScene = scenes[currentIndex]
  const currentImage = images[currentIndex]
  const currentCharacter = characters[currentIndex]
  const currentCharacterDesign = characterDesigns.find(d => d.characterId === currentCharacter?.id)

  // 当前场景的音频
  const currentSceneAudios = currentScene
    ? audios.filter(a => a.sceneId === currentScene.id)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[95vw] h-[95vh] p-0 gap-0 bg-black/95 border-white/10",
          isFullscreen && "max-w-full w-full h-full"
        )}
      >
        {/* 隐藏的 DialogTitle 用于无障碍 */}
        <DialogTitle className="sr-only">
          预览 - {asset.title}
        </DialogTitle>

        <div className="flex flex-col h-full">
          {/* 头部工具栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate max-w-[300px]">
                {asset.title}
              </h2>
            </div>

            {/* 类型切换 Tab */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant={previewType === 'scene' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => handleSwitchType('scene')}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                场景
              </Button>
              <Button
                variant={previewType === 'character' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => handleSwitchType('character')}
              >
                <User className="w-3 h-3 mr-1" />
                角色
              </Button>
              <Button
                variant={previewType === 'script' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => handleSwitchType('script')}
              >
                <FileText className="w-3 h-3 mr-1" />
                剧本
              </Button>
            </div>

            {/* 工具按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-white/70 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧：图片/内容预览 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 图片预览区 */}
              <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black/30">
                {previewType === 'scene' && currentImage && (
                  <img
                    src={currentImage}
                    alt={`场景 ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                  />
                )}

                {previewType === 'scene' && !currentImage && (
                  <div className="text-white/50">
                    <ImageIcon className="w-16 h-16 mb-2 opacity-30" />
                    <p>暂无场景图</p>
                  </div>
                )}

                {previewType === 'character' && currentCharacterDesign?.imageUrl && (
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={currentCharacterDesign.imageUrl}
                      alt={currentCharacter?.name || '角色'}
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                      style={{ transform: `scale(${zoom})` }}
                    />
                  </div>
                )}

                {previewType === 'character' && !currentCharacterDesign?.imageUrl && (
                  <div className="text-white/50">
                    <User className="w-16 h-16 mb-2 opacity-30" />
                    <p>暂无角色设计图</p>
                  </div>
                )}

                {previewType === 'script' && (
                  <ScrollArea className="w-full h-full">
                    <div
                      className="p-8 text-white/90 prose prose-invert max-w-4xl mx-auto"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    >
                      <h1 className="text-2xl font-bold mb-4">{asset.title}</h1>
                      {asset.synopsis && (
                        <div className="mb-6 p-4 bg-white/5 rounded-lg">
                          <h3 className="text-sm font-medium mb-2 text-white/70">梗概</h3>
                          <p className="text-sm text-white/90">{asset.synopsis}</p>
                        </div>
                      )}
                      {scenes.map((scene: any, idx: number) => (
                        <div key={scene.id || idx} className="mb-6 p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm">
                              场景 {idx + 1}
                            </span>
                            <span className="text-sm text-white/70">{scene.shotType}</span>
                          </div>
                          <p className="text-sm mb-2">{scene.description}</p>
                          {scene.dialogues?.length > 0 && (
                            <div className="space-y-1 mt-2 border-t border-white/10 pt-2">
                              {scene.dialogues.map((d: any, di: number) => (
                                <p key={di} className="text-sm text-white/80">
                                  <span className="font-medium text-primary">{d.characterName}：</span>
                                  {d.text}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* 左右切换按钮 */}
                {previewType !== 'script' && getMaxIndex() > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 h-12 w-12 text-white"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 h-12 w-12 text-white"
                      onClick={handleNext}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}

                {/* 索引指示器 */}
                {previewType !== 'script' && getMaxIndex() > 0 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded-full text-white text-sm">
                    {currentIndex + 1} / {getMaxIndex() + 1}
                  </div>
                )}
              </div>

              {/* 缩略图列表 */}
              {previewType !== 'script' && getMaxIndex() > 0 && (
                <div className="h-20 border-t border-white/10 bg-black/30 flex items-center px-4 gap-2 overflow-x-auto">
                  {previewType === 'scene' && images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all",
                        currentIndex === idx
                          ? "border-primary ring-2 ring-primary/50"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {previewType === 'character' && characters.map((char: any, idx: number) => {
                    const design = characterDesigns.find(d => d.characterId === char.id)
                    return (
                      <button
                        key={char.id || idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          "flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all flex items-center justify-center bg-white/5",
                          currentIndex === idx
                            ? "border-primary ring-2 ring-primary/50"
                            : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        {design?.imageUrl ? (
                          <img src={design.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-white/50" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 右侧：详情面板 */}
            {(previewType === 'scene' || previewType === 'character') && (
              <div className="w-80 flex-shrink-0 border-l border-white/10 bg-black/40 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* 场景详情 */}
                    {previewType === 'scene' && currentScene && (
                      <>
                        <div>
                          <h3 className="text-sm font-medium text-white/70 mb-2">场景描述</h3>
                          <p className="text-sm text-white">{currentScene.description}</p>
                        </div>

                        <div className="flex gap-3 text-sm">
                          <div className="px-2 py-1 bg-white/10 rounded">
                            {currentScene.shotType}
                          </div>
                          <div className="px-2 py-1 bg-white/10 rounded">
                            {currentScene.duration}
                          </div>
                        </div>

                        {/* 对白列表 */}
                        {currentScene.dialogues?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-white/70 mb-2">对白</h3>
                            <div className="space-y-2">
                              {currentScene.dialogues.map((d: any, idx: number) => {
                                const audio = currentSceneAudios.find(a => a.dialogueId === `${currentScene.id}_${idx}`)
                                return (
                                  <div key={idx} className="p-2 bg-white/5 rounded">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <span className="text-primary font-medium text-sm">
                                          {d.characterName}
                                        </span>
                                        <p className="text-sm text-white/80 mt-1">{d.text}</p>
                                      </div>
                                      {audio?.audioUrl && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 flex-shrink-0"
                                          onClick={() => toggleAudio(audio.audioUrl)}
                                        >
                                          {playingAudio === audio.audioUrl ? (
                                            <Pause className="w-4 h-4 text-primary" />
                                          ) : (
                                            <Play className="w-4 h-4" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* 角色详情 */}
                    {previewType === 'character' && currentCharacter && (
                      <>
                        <div>
                          <h3 className="text-sm font-medium text-white/70 mb-1">角色名</h3>
                          <p className="text-lg font-bold text-white">{currentCharacter.name}</p>
                        </div>

                        <div className="flex gap-2">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs",
                            currentCharacter.role === 'protagonist' && "bg-yellow-500/20 text-yellow-400",
                            currentCharacter.role === 'supporting' && "bg-blue-500/20 text-blue-400",
                            currentCharacter.role === 'minor' && "bg-gray-500/20 text-gray-400"
                          )}>
                            {currentCharacter.role === 'protagonist' ? '主角' :
                             currentCharacter.role === 'supporting' ? '配角' : '龙套'}
                          </span>
                        </div>

                        {currentCharacter.description && (
                          <div>
                            <h3 className="text-sm font-medium text-white/70 mb-2">角色描述</h3>
                            <p className="text-sm text-white">{currentCharacter.description}</p>
                          </div>
                        )}

                        {currentCharacter.appearance && (
                          <div>
                            <h3 className="text-sm font-medium text-white/70 mb-2">外貌特征</h3>
                            <p className="text-sm text-white/80">{currentCharacter.appearance}</p>
                          </div>
                        )}

                        {currentCharacter.personality && (
                          <div>
                            <h3 className="text-sm font-medium text-white/70 mb-2">性格特点</h3>
                            <p className="text-sm text-white/80">{currentCharacter.personality}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* 场景列表导航 */}
                    {previewType === 'scene' && scenes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-1">
                          <List className="w-3 h-3" />
                          场景列表
                        </h3>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {scenes.map((scene: any, idx: number) => (
                            <button
                              key={scene.id || idx}
                              onClick={() => setCurrentIndex(idx)}
                              className={cn(
                                "w-full text-left p-2 rounded text-xs transition-colors",
                                currentIndex === idx
                                  ? "bg-primary/20 text-primary"
                                  : "bg-white/5 text-white/70 hover:bg-white/10"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                                  #{idx + 1}
                                </span>
                                <span className="truncate flex-1">{scene.description}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* 音频播放器 */}
        {playingAudio && (
          <audio
            ref={audioRef}
            src={playingAudio}
            autoPlay
            onEnded={() => setPlayingAudio(null)}
            className="hidden"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
