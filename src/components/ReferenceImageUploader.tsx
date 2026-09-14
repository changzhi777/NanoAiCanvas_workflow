'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Wand2, Link, Clipboard } from 'lucide-react'
import { toast } from 'sonner'
import { useChatStore } from '@/stores/nanoImageChatStore'
import { useAuthStore } from '@/stores/remoteStore'
import { imageToPrompt } from '@/lib/api/image-to-prompt'
import { ReferenceResultDialog } from '@/components/ReferenceResultDialog'
import type { ReferenceImage } from '@/types'

export function ReferenceImageUploader() {
  const { referenceImage, setReferenceImage, clearReferenceImage } = useChatStore()
  const { user } = useAuthStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [isUrlLoading, setIsUrlLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 监听粘贴事件
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (referenceImage || showUrlInput) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleFileSelect(file)
            toast.success('已从剪贴板粘贴图片')
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [referenceImage, showUrlInput])

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string

      const newReferenceImage: ReferenceImage = {
        id: crypto.randomUUID(),
        url: base64,
        file,
      }

      setReferenceImage(newReferenceImage)
    }
    reader.readAsDataURL(file)
  }

  // 处理拖拽上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 处理点击上传
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 处理 URL 输入
  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      toast.error('请输入图片 URL')
      return
    }

    try {
      new URL(imageUrl)
    } catch {
      toast.error('请输入有效的 URL')
      return
    }

    setIsUrlLoading(true)

    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('无法获取图片')
      }

      const blob = await response.blob()

      if (!blob.type.startsWith('image/')) {
        throw new Error('URL 不是有效的图片')
      }

      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('图片大小不能超过 10MB')
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        const newReferenceImage: ReferenceImage = {
          id: crypto.randomUUID(),
          url: base64,
        }
        setReferenceImage(newReferenceImage)
        setShowUrlInput(false)
        setImageUrl('')
        toast.success('图片加载成功')
      }
      reader.readAsDataURL(blob)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载图片失败')
    } finally {
      setIsUrlLoading(false)
    }
  }

  // 分析图片
  const handleAnalyze = async () => {
    if (!referenceImage) {
      toast.error('请先上传参考图片')
      return
    }

    if (isAnalyzing) {
      return
    }

    const apiKey = user?.textApiKey
    if (!apiKey) {
      toast.error('请先配置文本 API Key')
      return
    }

    setIsAnalyzing(true)

    try {
      const base64Data = referenceImage.url.includes(',')
        ? referenceImage.url.split(',')[1]
        : referenceImage.url

      const prompt = await imageToPrompt({
        imageBase64: base64Data,
        apiKey,
        model: 'glm-4.6v-flash',
      })

      setGeneratedPrompt(prompt)
      setShowResultDialog(true)
      toast.success('提示词生成成功')
    } catch (error) {
      console.error('[ReferenceImageUploader] Analysis failed:', error)
      toast.error(error instanceof Error ? error.message : '分析失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 清除图片
  const handleClear = () => {
    clearReferenceImage()
    setGeneratedPrompt('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 如果没有上传图片，显示上传区域
  if (!referenceImage) {
    return (
      <div className="space-y-3">
        {/* 主上传区域 */}
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-emerald-500/50 transition-colors cursor-pointer bg-card/60 backdrop-blur-xl"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">点击或拖拽上传参考图片</p>
          <p className="text-xs text-muted-foreground/60 mt-1">支持粘贴（Ctrl+V）、JPG/PNG、最大 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* URL 输入切换 */}
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-sm text-foreground"
          >
            <Link className="h-4 w-4" />
            <span>通过 URL 添加图片</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="输入图片 URL..."
              className="flex-1 px-3 py-2 border border-white/10 rounded-xl text-sm bg-card/60 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              disabled={isUrlLoading}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 text-sm"
            >
              {isUrlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '加载'}
            </button>
            <button
              onClick={() => {
                setShowUrlInput(false)
                setImageUrl('')
              }}
              className="px-3 py-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 提示 */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clipboard className="h-3 w-3" />
            粘贴
          </span>
          <span className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            拖拽
          </span>
          <span className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            URL
          </span>
        </div>
      </div>
    )
  }

  // 显示已上传的图片
  return (
    <div className="space-y-3">
      {/* 图片预览 */}
      <div className="relative group">
        <img
          src={referenceImage.url}
          alt="参考图片"
          className="w-full h-48 object-cover rounded-xl border border-white/10"
        />
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 p-1.5 bg-card/80 backdrop-blur-xl hover:bg-card rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-foreground"
          title="移除图片"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>分析中...</span>
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              <span>生成提示词</span>
            </>
          )}
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-foreground"
        >
          清除
        </button>
      </div>

      {/* 提示 */}
      <p className="text-xs text-muted-foreground text-center">
        上传参考图片，AI 将分析图片内容并生成提示词
      </p>

      {/* 结果弹窗 */}
      <ReferenceResultDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        prompt={generatedPrompt}
      />
    </div>
  )
}
