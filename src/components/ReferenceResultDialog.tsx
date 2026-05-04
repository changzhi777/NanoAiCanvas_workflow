'use client'

import { Copy, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/nanoImageChatStore'

interface ReferenceResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: string
}

export function ReferenceResultDialog({
  open,
  onOpenChange,
  prompt,
}: ReferenceResultDialogProps) {
  const [copied, setCopied] = useState(false)
  const { setGenerationMode } = useChatStore()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const handleUsePrompt = () => {
    navigator.clipboard.writeText(prompt)
    setGenerationMode('text-to-image')
    onOpenChange(false)
    toast.success('已复制提示词，请切换到文生图模式粘贴使用')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/60 backdrop-blur-xl border border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            反推提示词
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            AI 根据参考图片生成的绘画提示词
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-8 text-foreground">
              {prompt || '暂无提示词'}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  复制提示词
                </>
              )}
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleUsePrompt}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              使用此提示词
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
