'use client'

import { useState, useCallback, useRef } from 'react'
import { Building2, X, Loader2, Sparkles, Upload, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useArchitectureStore } from '@/stores/nanoImageArchitectureStore'
import { toast } from 'sonner'
import {
  INTERIOR_SCENES,
  EXTERIOR_SCENES,
  ARCHITECTURE_STYLES,
  buildArchitecturePrompt,
  getSceneIcon,
} from '@/lib/constants/architecture-prompts'
import { cn } from '@/lib/utils'

interface ArchitectureDialogProps {
  onGenerate: (prompt: string) => void
}


export function ArchitectureDialog({ onGenerate }: ArchitectureDialogProps) {
  const {
    isDialogOpen,
    closeDialog,
    currentTab,
    setCurrentTab,
    selectedScene,
    setScene,
    selectedStyle,
    setStyle,
    referenceImage,
    setReferenceImage,
    clearReferenceImage,
  } = useArchitectureStore()

  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const url = URL.createObjectURL(file)
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || ''
        setReferenceImage({
          id: crypto.randomUUID(),
          url,
          file,
          base64,
        })
      }
      reader.readAsDataURL(file)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [setReferenceImage],
  )

  const handleGenerate = useCallback(() => {
    if (!description.trim()) {
      toast.error('请输入建筑描述')
      return
    }

    setIsGenerating(true)

    try {
      const prompt = buildArchitecturePrompt(
        selectedScene,
        currentTab,
        selectedStyle,
        description.trim(),
        !!referenceImage,
      )

      let finalPrompt = prompt
      if (referenceImage) {
        finalPrompt = `参考建筑设计图，根据参考图的风格和布局生成效果图。\n\n${prompt}`
      }

      onGenerate(finalPrompt)
      closeDialog()
      setDescription('')
      clearReferenceImage()
      toast.success('建筑效果图提示词已生成')
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [description, selectedScene, currentTab, selectedStyle, referenceImage, onGenerate, closeDialog, clearReferenceImage])

  const scenes = currentTab === 'interior' ? INTERIOR_SCENES : EXTERIOR_SCENES

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-lg bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          建筑效果图生成器
        </DialogTitle>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-white/10 p-0.5 mb-4">
          <button
            onClick={() => setCurrentTab('interior')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors flex-1 justify-center',
              currentTab === 'interior'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>🏠</span>
            室内
          </button>
          <button
            onClick={() => setCurrentTab('exterior')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors flex-1 justify-center',
              currentTab === 'exterior'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>🏢</span>
            室外
          </button>
        </div>

        {/* Scene Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-muted-foreground">场景选择</label>
          <div className="grid grid-cols-3 gap-2">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setScene(scene.id)}
                className={cn(
                  'rounded-lg border p-2.5 text-left transition-colors',
                  selectedScene === scene.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{getSceneIcon(scene.id)}</span>
                  <span className="text-sm font-medium">{scene.label}</span>
                </div>
                <p className="text-[10px] opacity-70">{scene.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-muted-foreground">建筑风格</label>
          <div className="grid grid-cols-4 gap-1.5">
            {ARCHITECTURE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setStyle(style.id)}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-center transition-colors',
                  selectedStyle === style.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                )}
              >
                <span className="text-xs">{style.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reference Image Upload */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-muted-foreground">参考图（可选，支持CAD平面图/草图）</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {referenceImage ? (
            <div className="relative inline-block">
              <img
                src={referenceImage.url}
                alt="参考图"
                className="w-24 h-24 object-cover rounded-lg border border-white/10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full"
                onClick={clearReferenceImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-20 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Upload className="w-5 h-5" />
                <span className="text-xs">上传平面图或草图</span>
              </div>
            </Button>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-muted-foreground">建筑描述</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述建筑的特点，如：现代风格客厅，落地窗，浅色木地板..."
            rows={1}
            className="bg-transparent border-input min-h-[36px] resize-none"
          />
        </div>

        {/* Info Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg mb-4">
          <Building2 className="w-3 h-3" />
          <span>
            {currentTab === 'interior' ? '室内' : '室外'} · {scenes.find(s => s.id === selectedScene)?.label} · {ARCHITECTURE_STYLES.find(s => s.id === selectedStyle)?.label}
          </span>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成提示词
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
