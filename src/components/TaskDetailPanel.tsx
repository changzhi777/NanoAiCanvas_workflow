'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/nanoImageChatStore'
import type { TaskQueueItem, StoryboardTask, StoryboardSubTask, ChatMessage } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, Bot, Clock, Copy, Check, ChevronLeft, ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { StoryboardPreviewAnimation } from '@/components/storyboard/StoryboardPreviewAnimation'

/** Normalise imageUrl (string | string[]) to always be string[] */
function normaliseImageUrls(imageUrl: string | string[] | undefined): string[] {
  if (!imageUrl) return []
  return Array.isArray(imageUrl) ? imageUrl : [imageUrl]
}

/** Build param tags from ImageParams */
function buildParamTags(params: ChatMessage['params']): { label: string; value: string }[] {
  if (!params) return []
  const tags: { label: string; value: string }[] = []
  if (params.model) tags.push({ label: '模型', value: params.model })
  if (params.size) tags.push({ label: '尺寸', value: params.size })
  if (params.aspectRatio) tags.push({ label: '比例', value: params.aspectRatio })
  if (params.style) tags.push({ label: '风格', value: params.style })
  if (params.shotType) tags.push({ label: '构图', value: params.shotType })
  if (params.cameraAngle) tags.push({ label: '机位', value: params.cameraAngle })
  if (params.lensType) tags.push({ label: '镜头', value: params.lensType })
  if (params.focus) tags.push({ label: '焦距', value: params.focus })
  if (params.lighting) tags.push({ label: '光照', value: params.lighting })
  if (params.technical) tags.push({ label: '技术', value: params.technical })
  if (params.cameraModel) tags.push({ label: '相机', value: params.cameraModel })
  if (params.atmosphere) tags.push({ label: '氛围', value: params.atmosphere })
  return tags
}

/** 计算耗时 */
function formatDuration(start: string, end?: string): string | null {
  try {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const diffMs = endTime - startTime
    if (diffMs < 0) return null
    const seconds = Math.floor(diffMs / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainSeconds = seconds % 60
    return `${minutes}分${remainSeconds}秒`
  } catch {
    return null
  }
}

/** 格式化时间 */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// 信息行组件
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground/60 shrink-0 min-w-[40px]">{label}:</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  )
}

// Prompt 区域组件 - 支持3行截断和展开
function PromptSection({ msg }: { msg: ChatMessage }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const promptText = msg.prompt || msg.content || ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // silent fail
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">Prompt</p>
        <button
          onClick={handleCopy}
          className="text-[10px] text-primary cursor-pointer hover:text-primary/80 flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              复制
            </>
          )}
        </button>
      </div>
      <p className={`text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words ${!isExpanded ? 'line-clamp-3' : ''}`}>
        {promptText}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[10px] text-primary cursor-pointer hover:text-primary/80 mt-1"
      >
        {isExpanded ? '收起' : '显示更多'}
      </button>
    </div>
  )
}

function ImagePreviewDialog({
  src,
  open,
  onOpenChange,
}: {
  src: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed !inset-0 !top-0 !left-0 !w-screen !h-screen !max-w-none !translate-x-0 !translate-y-0 rounded-md border-none bg-black/95 p-0 flex items-center justify-center cursor-pointer"
        onClick={() => onOpenChange(false)}
      >
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <DialogDescription className="sr-only">点击任意位置关闭预览</DialogDescription>
        <img
          src={src}
          alt="Preview"
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
        <div className="absolute bottom-6 text-white/60 text-sm">
          点击任意位置关闭
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmptyPreview() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-muted/30">
      <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
      <p className="mt-3 text-sm text-muted-foreground">
        生成图片后将在此预览
      </p>
    </div>
  )
}

// 生成中过渡动画
function GeneratingAnimation({ progress, status }: { progress: number; status: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
        <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>

      <div className="relative w-16 h-16 mb-4">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
          {progress}%
        </span>
      </div>

      <p className="text-sm text-muted-foreground animate-pulse">{status}</p>
    </div>
  )
}

// 消息详情视图
function MessageDetailView({
  messages,
  onImageClick,
  onCopyPrompt,
}: {
  messages: ChatMessage[]
  onImageClick: (url: string) => void
  onCopyPrompt: (text: string) => void
}) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {messages.map((msg) => {
          const images = normaliseImageUrls(msg.imageUrl)
          const isUser = msg.role === 'user'
          const isError = msg.status === 'error'
          const isGenerating = msg.status === 'generating'

          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 ${
                isUser
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isUser ? (
                  <User className="h-4 w-4 text-blue-400" />
                ) : (
                  <Bot className="h-4 w-4 text-emerald-400" />
                )}
                <span className={`text-xs font-medium ${isUser ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {isUser ? '用户' : '助手'}
                </span>
                {msg.createdAt && (
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(msg.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {isGenerating && <Loader2 className="h-3 w-3 text-yellow-400 animate-spin" />}
                {isError && <AlertCircle className="h-3 w-3 text-red-400" />}
              </div>

              {(msg.content || msg.prompt) && (
                <div className="mb-2">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {msg.content || msg.prompt}
                  </p>
                  {isUser && (
                    <button
                      onClick={() => onCopyPrompt(msg.content || msg.prompt || '')}
                      className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      复制
                    </button>
                  )}
                </div>
              )}

              {msg.enhancedPrompt && msg.enhancedPrompt !== msg.prompt && (
                <div className="mb-2 p-2 rounded bg-white/5 border border-white/10">
                  <p className="text-[10px] text-muted-foreground mb-1">增强提示词:</p>
                  <p className="text-xs text-foreground/70 line-clamp-3">{msg.enhancedPrompt}</p>
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {images.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => onImageClick(url)}
                      className="relative rounded-md overflow-hidden border border-white/10 hover:border-primary/50 transition-colors group"
                    >
                      <img src={url} alt={`图片 ${idx + 1}`} className="w-full h-auto object-contain" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TaskDetailPanel() {
  const currentSession = useChatStore((s) => s.currentSession)

  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // 故事板预览状态
  const [storyboardPreview, setStoryboardPreview] = useState<{
    task: StoryboardTask
    subTasks: StoryboardSubTask[]
  } | null>(null)

  useEffect(() => {
    const handleViewDetail = () => setShowDetail(true)
    window.addEventListener('history:viewDetail', handleViewDetail)
    return () => window.removeEventListener('history:viewDetail', handleViewDetail)
  }, [])

  // Listen for taskQueue:viewTask event to view a specific task
  useEffect(() => {
    const handleViewTask = async (e: Event) => {
      const customEvent = e as CustomEvent<{ task: TaskQueueItem }>
      const { task } = customEvent.detail
      // Switch to the session containing this task
      const selectSession = useChatStore.getState().selectSession
      await selectSession(task.sessionId)
      setShowDetail(true)
    }
    window.addEventListener('taskQueue:viewTask', handleViewTask)
    return () => window.removeEventListener('taskQueue:viewTask', handleViewTask)
  }, [])

  // 监听故事板预览事件
  useEffect(() => {
    const handleStoryboardPreview = (e: Event) => {
      const customEvent = e as CustomEvent<{ task: StoryboardTask; subTasks: StoryboardSubTask[] }>
      setStoryboardPreview(customEvent.detail)
      setShowDetail(false) // 关闭消息详情，显示故事板预览
    }
    window.addEventListener('storyboard:previewTask', handleStoryboardPreview)
    return () => window.removeEventListener('storyboard:previewTask', handleStoryboardPreview)
  }, [])

  const imageMessages = useMemo(() => {
    if (!currentSession?.messages) return []
    // 按创建时间倒序排列，最新的记录优先显示
    return [...currentSession.messages]
      .filter((msg) => msg.role === 'assistant' && msg.imageUrl)
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
  }, [currentSession?.messages])

  const allImageUrls = useMemo(() => {
    const urls: string[] = []
    imageMessages.forEach((msg) => urls.push(...normaliseImageUrls(msg.imageUrl)))
    return urls
  }, [imageMessages])

  const generatingMessage = useMemo(() => {
    if (!currentSession?.messages) return null
    const reversed = [...currentSession.messages].reverse()
    return reversed.find(
      (msg) => msg.role === 'assistant' && (msg.status === 'pending' || msg.status === 'generating')
    ) || null
  }, [currentSession?.messages])

  const isGenerating = generatingMessage !== null

  const handleCopyPrompt = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* silent */ }
  }, [])

  const handleImageClick = useCallback((url: string) => setPreviewSrc(url), [])

  return (
    <div className="h-full flex flex-col bg-card/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 h-10 border-b border-white/5">
        {showDetail ? (
          <>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowDetail(false)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回预览
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentSession?.messages.length || 0} 条消息
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">预览</span>
            <div className="flex items-center gap-1">
              {isGenerating && (
                <span className="flex items-center gap-1 text-xs text-primary mr-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  生成中
                </span>
              )}
              {allImageUrls.length > 0 && (
                <span className="text-xs text-muted-foreground mr-2">
                  {allImageUrls.length} 张图片
                </span>
              )}
              {currentSession?.messages && currentSession.messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowDetail(true)}>
                  查看全部消息
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-2">
        {storyboardPreview ? (
          /* 故事板任务预览 - 参考3D项目效果 */
          <StoryboardPreviewAnimation
            status={storyboardPreview.task.status}
            progress={storyboardPreview.task.progress}
            subTasks={storyboardPreview.subTasks}
            error={storyboardPreview.task.error}
            title={storyboardPreview.task.title}
            createdAt={storyboardPreview.task.createdAt}
          />
        ) : showDetail ? (
          currentSession?.messages && currentSession.messages.length > 0 ? (
            <MessageDetailView
              messages={currentSession.messages}
              onImageClick={handleImageClick}
              onCopyPrompt={handleCopyPrompt}
            />
          ) : (
            <EmptyPreview />
          )
        ) : isGenerating ? (
          <GeneratingAnimation
            progress={generatingMessage?.progress || 0}
            status={generatingMessage?.status === 'pending' ? '准备中...' : '生成中...'}
          />
        ) : allImageUrls.length === 0 ? (
          <EmptyPreview />
        ) : (
          /* 图片预览视图 - 按消息分组，带详细信息 */
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-2">
              {imageMessages.map((msg) => {
                const images = normaliseImageUrls(msg.imageUrl)
                const tags = buildParamTags(msg.params)

                return (
                  <div key={msg.id} className="rounded-lg overflow-hidden bg-white/5 border border-white/5">
                    {/* 图片区域 */}
                    {images.length === 1 ? (
                      <div
                        className="relative group cursor-zoom-in"
                        onClick={() => setPreviewSrc(images[0])}
                      >
                        <img src={images[0]} alt="生成的图片" className="w-full h-auto object-contain rounded-t-lg" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setPreviewSrc(images[0]) }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-0.5">
                        {images.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group cursor-zoom-in"
                            onClick={() => setPreviewSrc(url)}
                          >
                            <img src={url} alt={`图片 ${idx + 1}`} className="w-full h-auto object-contain" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-7 w-7 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setPreviewSrc(url) }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
                              </svg>
                            </Button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 详细信息区域 - 并排布局 */}
                    <div className="px-3 py-2.5 border-t border-white/5">
                      <div className="flex gap-4">
                        {/* 左侧：基本信息 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium tracking-wide">基本信息</p>
                          <div className="space-y-0.5 text-[11px]">
                            <InfoRow label="类型" value="文生图" />
                            {msg.createdAt && (
                              <InfoRow label="创建" value={formatTime(msg.createdAt)} />
                            )}
                            {msg.status === 'success' && msg.updatedAt && (
                              <InfoRow label="完成" value={formatTime(msg.updatedAt)} />
                            )}
                            {msg.createdAt && msg.updatedAt && msg.status === 'success' && (
                              <InfoRow label="耗时" value={formatDuration(msg.createdAt, msg.updatedAt) || '-'} />
                            )}
                            {images.length > 1 && (
                              <InfoRow label="数量" value={`${images.length} 张`} />
                            )}
                          </div>
                        </div>

                        {/* 右侧：生成参数 */}
                        {tags.length > 0 && (
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium tracking-wide">生成参数</p>
                            <div className="space-y-0.5 text-[11px]">
                              {tags.map((tag) => (
                                <InfoRow key={tag.label} label={tag.label} value={tag.value} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Prompt - 单独一行，限制3行显示，点击展开 */}
                      {(msg.prompt || msg.enhancedPrompt) && (
                        <PromptSection msg={msg} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialog */}
      {previewSrc && (
        <ImagePreviewDialog
          src={previewSrc}
          open={!!previewSrc}
          onOpenChange={(open) => { if (!open) setPreviewSrc(null) }}
        />
      )}
    </div>
  )
}
