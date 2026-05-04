'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Settings2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Wand2,
  Sparkles,
  BookOpen,
  User,
  ShoppingBag,
  Send,
  Building2,
  Mic,
  Clapperboard,
  Layers,
  Bookmark,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useChatStore } from '@/stores/nanoImageChatStore'
import { useAuthStore } from '@/stores/remoteStore'
import { useTaskQueueStore } from '@/stores/nanoImageTaskQueueStore'
import { useKnowledgeCardStore } from '@/stores/nanoImageKnowledgeCardStore'
import { useCharacterDesignStore } from '@/stores/nanoImageCharacterDesignStore'
import { useEcommerceProductStore } from '@/stores/nanoImageEcommerceProductStore'
import { useArchitectureStore } from '@/stores/nanoImageArchitectureStore'
import { FusionModeToggle } from '@/components/FusionModeToggle'
import { FusionImageUploader } from '@/components/FusionImageUploader'
import { ReferenceImageUploader } from '@/components/ReferenceImageUploader'
import { PromptWizardDialog } from '@/components/PromptWizardDialog'
import { KnowledgeCardDialog } from '@/components/KnowledgeCardDialog'
import { CharacterDesignDialog } from '@/components/CharacterDesignDialog'
import { EcommerceProductDialog } from '@/components/EcommerceProductDialog'
import { ArchitectureDialog } from '@/components/ArchitectureDialog'
import { RealtimeVoiceDialog } from '@/components/RealtimeVoiceDialog'
import { StoryboardDialog } from '@/components/StoryboardDialog'
import { BatchTaskDialog } from '@/components/BatchTaskDialog'
import { PromptTemplateDialog } from '@/components/PromptTemplateDialog'
import { getAdapter } from '@/lib/api/adapters'
import { enhancePrompt } from '@/lib/api/text-enhance'
import { createImageAssetApi } from '@/lib/api/image-assets'
import { promptRestrictionsApi } from '@/lib/api/prompt-restrictions'
import { MINIMAX_CONFIG } from '@/config/minimax'
import {
  SIZE_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  STYLE_PRESETS,
  SHOT_TYPE_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  LENS_TYPE_OPTIONS,
  FOCUS_OPTIONS,
  LIGHTING_OPTIONS,
  TECHNICAL_OPTIONS,
  CAMERA_MODEL_OPTIONS,
  ATMOSPHERE_PRESETS,
  IMAGE_MODEL_OPTIONS,
  QUALITY_OPTIONS,
  SATURATION_OPTIONS,
  CONTRAST_OPTIONS,
  NOISE_OPTIONS,
  buildPrompt,
} from '@/lib/constants/presets'
import type { ChatMessage } from '@/types'
import type { EnhanceMode } from '@/types/image'

// Helper to get label from option array
function getLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((opt) => opt.value === value)?.label ?? ''
}

export function GenerationPanel() {
  const { user } = useAuthStore()
  const {
    currentSession,
    loadSessions,
    generationMode,
    fusionImages,
    clearFusionImages,
    addMessage,
    updateMessage,
    renameSession,
    setGenerationMode,
  } = useChatStore()
  const knowledgeCardStore = useKnowledgeCardStore()
  const characterDesignStore = useCharacterDesignStore()
  const ecommerceProductStore = useEcommerceProductStore()
  const architectureStore = useArchitectureStore()
  const { registerAbortController, unregisterAbortController } = useTaskQueueStore()

  // ---- Local UI state ----
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [paramsPanelOpen, setParamsPanelOpen] = useState(false)
  const [showWizardDialog, setShowWizardDialog] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState('')
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [storyboardDialogOpen, setStoryboardDialogOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [enhanceMode, setEnhanceMode] = useState<EnhanceMode>('standard')

  // ---- 监听香蕉哥哥提示词事件 ----
  useEffect(() => {
    const handleBananaPrompt = (e: CustomEvent<{ prompt: string }>) => {
      setPrompt(e.detail.prompt)
      if (generationMode === 'fusion') {
        setGenerationMode('text-to-image')
      }
      toast.success('香蕉哥哥已生成提示词')
    }

    window.addEventListener('banana:promptGenerated', handleBananaPrompt as EventListener)
    return () => {
      window.removeEventListener('banana:promptGenerated', handleBananaPrompt as EventListener)
    }
  }, [generationMode, setGenerationMode])

  // ---- 初始化会话列表 ----
  useEffect(() => {
    if (user?.id) {
      loadSessions()
    }
  }, [user?.id, loadSessions])

  // ---- Advanced params ----
  const [imageModel, setImageModel] = useState<'nano-banana2' | 'nano-banana-pro' | 'gpt-image-2'>('gpt-image-2')
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [style, setStyle] = useState('none')
  const [shotType, setShotType] = useState('none')
  const [cameraAngle, setCameraAngle] = useState('none')
  const [lensType, setLensType] = useState('none')
  const [focus, setFocus] = useState('none')
  const [lighting, setLighting] = useState('none')
  const [technical, setTechnical] = useState('none')
  const [cameraModel, setCameraModel] = useState('none')
  const [atmosphere, setAtmosphere] = useState('none')
  // 步骤2.2-B: 新增参数维度
  const [quality, setQuality] = useState('auto')
  const [saturation, setSaturation] = useState('none')
  const [contrast, setContrast] = useState('none')
  const [noise, setNoise] = useState('none')

  // ---- Enhance prompt via MiniMax m2.7 ----
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('请输入提示词')
      return
    }
    if (!MINIMAX_CONFIG.API_KEY) {
      toast.error('请先在 .env 中配置 VITE_MINIMAX_API_KEY')
      return
    }

    setIsEnhancing(true)
    try {
      const result = await enhancePrompt({
        prompt: prompt.trim(),
        apiKey: MINIMAX_CONFIG.API_KEY,
        options: {
          styleLabel: getLabel(STYLE_PRESETS, style),
          shotTypeLabel: getLabel(SHOT_TYPE_OPTIONS, shotType),
          cameraAngleLabel: getLabel(CAMERA_ANGLE_OPTIONS, cameraAngle),
          lensTypeLabel: getLabel(LENS_TYPE_OPTIONS, lensType),
          focusLabel: getLabel(FOCUS_OPTIONS, focus),
          lightingLabel: getLabel(LIGHTING_OPTIONS, lighting),
          technicalLabel: getLabel(TECHNICAL_OPTIONS, technical),
          cameraModelLabel: getLabel(CAMERA_MODEL_OPTIONS, cameraModel),
          atmosphereLabel: getLabel(ATMOSPHERE_PRESETS, atmosphere),
        },
        mode: enhanceMode,
      })
      setPrompt(result)
      toast.success('提示词已优化')
    } catch (error) {
      console.error('Enhance prompt error:', error)
      toast.error('提示词优化失败')
    } finally {
      setIsEnhancing(false)
    }
  }, [prompt, style, shotType, cameraAngle, lensType, focus, lighting, technical, cameraModel, atmosphere, quality, saturation, contrast, noise, enhanceMode])

  // ---- Main generation handler ----
  const handleGenerate = useCallback(async () => {
    // 1. Validate
    if (generationMode === 'fusion') {
      if (fusionImages.length < 2) {
        toast.error('融图模式需要至少上传 2 张图片')
        return
      }
    } else {
      if (!prompt.trim()) {
        toast.error('请输入提示词')
        return
      }
    }

    if (!user?.id) {
      toast.error('请先登录')
      return
    }
    if (!currentSession) {
      toast.error('请先创建会话')
      return
    }

    // 2. Build final prompt (must be before restriction check)
    const finalPrompt =
      generationMode === 'fusion'
        ? prompt.trim() || '融合这些图片'
        : buildPrompt(prompt.trim(), {
            style,
            shotType,
            cameraAngle,
            lensType,
            focus,
            lighting,
            technical,
            cameraModel,
            atmosphere,
            quality,
            saturation,
            contrast,
            noise,
          })

    // 3. Check prompt restrictions for GPT-Image-2
    if (generationMode !== 'fusion' && imageModel === 'gpt-image-2') {
      try {
        const checkResult = await promptRestrictionsApi.checkPrompt(finalPrompt)
        if (!checkResult.is_safe) {
          const violationMessages = checkResult.violations
            .map(v => v.message)
            .join('\n')
          toast.error(`提示词包含限制内容:\n${violationMessages}`)
          return
        }
      } catch (error) {
        console.warn('Prompt restriction check failed:', error)
      }
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStatus('准备中...')

    // 切换到任务队列标签
    window.dispatchEvent(new CustomEvent('history:switchToTasks'))

    const messageId = crypto.randomUUID()
    const abortController = new AbortController()
    registerAbortController(messageId, abortController)

    // 3. Fusion image URLs
    const fusionImageUrls =
      generationMode === 'fusion' ? fusionImages.map((img) => img.url) : undefined

    // 4. Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content:
        generationMode === 'fusion'
          ? `融图：${fusionImages.length} 张图片`
          : prompt.trim(),
      referenceImages: fusionImageUrls,
      status: 'success',
      createdAt: new Date().toISOString(),
    }
    await addMessage(userMessage)

    // 5. Create assistant placeholder
    const assistantMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      prompt: prompt.trim(),
      enhancedPrompt: finalPrompt,
      referenceImages: fusionImageUrls,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    }
    await addMessage(assistantMessage)

    try {
      let images: string[]

      // Progress callback
      const onProgress = (progress: number) => {
        setGenerationProgress(progress)
        updateMessage(messageId, { progress, status: 'generating' })
        if (progress < 30) {
          setGenerationStatus('提交任务...')
        } else if (progress < 70) {
          setGenerationStatus(`生成中... ${progress}%`)
        } else {
          setGenerationStatus('即将完成...')
        }
      }

      // 6. Call API based on mode & model
      if (generationMode === 'fusion') {
        // Fusion: use adapter pattern for all models
        const adapter = getAdapter(imageModel)
        images = await adapter.generateImage(
          { prompt: finalPrompt, size, aspectRatio, urls: fusionImageUrls, signal: abortController.signal },
          onProgress,
        )
      } else {
        // Text-to-image: use adapter pattern for all models
        const adapter = getAdapter(imageModel)
        images = await adapter.generateImage(
          { prompt: finalPrompt, size, aspectRatio, signal: abortController.signal },
          onProgress,
        )
      }

      // 7. Update message with results
      await updateMessage(messageId, {
        imageUrl: images,
        status: 'success',
        progress: 100,
        updatedAt: new Date().toISOString(),
        params: {
          model: imageModel,
          size,
          aspectRatio,
          style,
          shotType: shotType !== 'none' ? shotType : undefined,
          cameraAngle: cameraAngle !== 'none' ? cameraAngle : undefined,
          lensType: lensType !== 'none' ? lensType : undefined,
          focus: focus !== 'none' ? focus : undefined,
          lighting: lighting !== 'none' ? lighting : undefined,
          technical: technical !== 'none' ? technical : undefined,
          cameraModel: cameraModel !== 'none' ? cameraModel : undefined,
          atmosphere: atmosphere !== 'none' ? atmosphere : undefined,
        },
      })
      setGenerationProgress(100)
      setGenerationStatus('完成!')

      // Save each image to Redis gallery (wrapped in try-catch to not break generation)
      for (const imageUrl of images) {
        try {
          const result = await createImageAssetApi({
            imageUrl,
            prompt: prompt.trim(),
            enhancedPrompt: finalPrompt,
            params: {
              model: imageModel,
              size,
              aspectRatio,
              style,
              shotType: shotType !== 'none' ? shotType : undefined,
              cameraAngle: cameraAngle !== 'none' ? cameraAngle : undefined,
              lensType: lensType !== 'none' ? lensType : undefined,
              focus: focus !== 'none' ? focus : undefined,
              lighting: lighting !== 'none' ? lighting : undefined,
              technical: technical !== 'none' ? technical : undefined,
              cameraModel: cameraModel !== 'none' ? cameraModel : undefined,
              atmosphere: atmosphere !== 'none' ? atmosphere : undefined,
            },
            referenceImages: fusionImageUrls,
          })
          if (!result.success) {
            console.warn('Failed to save to asset library:', result.error)
          }
        } catch (err) {
          console.warn('Asset save error (non-blocking):', err)
        }
      }

      // Auto-rename session if default title
      if (currentSession?.title === '新会话') {
        const autoTitle =
          generationMode === 'fusion'
            ? `融图-${fusionImages.length}张`
            : prompt.trim().slice(0, 20) + (prompt.trim().length > 20 ? '...' : '')
        await renameSession(currentSession.id, autoTitle)
      }

      toast.success(`生成成功，共 ${images.length} 张图片`)
      // 触发生图完成事件，通知生图记录刷新和资产库保存
      window.dispatchEvent(new CustomEvent('image:generated', { detail: { images, prompt: prompt.trim() } }))
      setPrompt('')
      if (generationMode === 'fusion') {
        clearFusionImages()
      }
    } catch (error) {
      console.error('Generate error:', error)
      // Check if aborted
      if (error instanceof DOMException && error.name === 'AbortError') {
        await updateMessage(messageId, {
          status: 'error',
          error: '任务已终止',
        })
        setGenerationStatus('任务已终止')
        toast.info('任务已终止')
      } else {
        const errorMessage = error instanceof Error ? error.message : '生成失败'
        await updateMessage(messageId, {
          status: 'error',
          error: errorMessage,
        })
        setGenerationStatus(`生成失败: ${errorMessage}`)
        toast.error(`图片生成失败: ${errorMessage}`)
      }
    } finally {
      unregisterAbortController(messageId)
      setIsGenerating(false)
    }
  }, [
    generationMode, fusionImages, prompt, user?.id, user?.imageApiKey,
    currentSession, size, aspectRatio, style, shotType, cameraAngle,
    lensType, focus, lighting, technical, cameraModel, atmosphere, imageModel,
    quality, saturation, contrast, noise,
    addMessage, updateMessage, renameSession, clearFusionImages,
  ])

  // ---- Prompt from dialog callbacks ----
  const handlePromptFromDialog = useCallback((generatedPrompt: string, ratio?: string) => {
    setPrompt(generatedPrompt)
    if (ratio) {
      setAspectRatio(ratio)
    }
    if (generationMode === 'fusion') {
      setGenerationMode('text-to-image')
      toast.success('提示词已填充，已切换到文生图模式')
    } else {
      toast.success('提示词已填充到输入框')
    }
  }, [generationMode, setGenerationMode])

  // ---- Keyboard: Enter triggers generation ----
  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate],
  )

  // ---- Derived state ----
  const isGenerateDisabled =
    isGenerating ||
    (generationMode === 'fusion' ? fusionImages.length < 2 : !prompt.trim())

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-card/60 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden">
        {/* ======== Tab Switcher ======== */}
        <div className="flex-shrink-0 border-b border-white/5 px-3 pt-3">
          <FusionModeToggle />
        </div>

        {/* ======== Scrollable content area ======== */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 gap-3">
          {/* ---- Input Section ---- */}
          <div className="flex-shrink-0">
            {/* Mode-specific content */}
            {generationMode === 'fusion' && (
              <div className="mb-3">
                <FusionImageUploader />
              </div>
            )}

            {generationMode === 'reference' && (
              <div className="mb-3">
                <ReferenceImageUploader />
              </div>
            )}

            {/* Textarea is always shown */}
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                generationMode === 'fusion'
                  ? '可选：描述融合效果（如：融合这些图片的风格和内容）'
                  : generationMode === 'reference'
                    ? '参考图描述或补充说明...'
                    : '描述你想要生成的图像...'
              }
              className={`${generationMode === 'fusion' ? 'min-h-[140px]' : generationMode === 'reference' ? 'min-h-[28px]' : 'min-h-[255px]'} resize-none text-sm leading-relaxed`}
              onKeyDown={handleTextareaKeyDown}
            />
          </div>

          {/* ---- Action Buttons Row ---- */}
          {/* 第一行：提示词优化相关 */}
          <div className="flex-shrink-0 flex items-center gap-1 flex-wrap">
            {/* Enhance mode selector - Dropdown Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                                            className="h-8 px-3 text-xs gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>提示词优化增强</span>
                      <ChevronRight className="h-3 w-3 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>选择提示词优化模式</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => setEnhanceMode('standard')} className="flex flex-col items-start gap-1 py-2">
                  <div className="flex items-center gap-2 w-full">
                    <span>标准</span>
                    {enhanceMode === 'standard' && <Check className="h-4 w-4 ml-auto" />}
                  </div>
                  <span className="text-xs text-muted-foreground">基础优化，保持原意</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEnhanceMode('creative')} className="flex flex-col items-start gap-1 py-2">
                  <div className="flex items-center gap-2 w-full">
                    <span>创意</span>
                    {enhanceMode === 'creative' && <Check className="h-4 w-4 ml-auto" />}
                  </div>
                  <span className="text-xs text-muted-foreground">发挥创意，戏剧性效果</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEnhanceMode('detailed')} className="flex flex-col items-start gap-1 py-2">
                  <div className="flex items-center gap-2 w-full">
                    <span>细节</span>
                    {enhanceMode === 'detailed' && <Check className="h-4 w-4 ml-auto" />}
                  </div>
                  <span className="text-xs text-muted-foreground">专业深度，极致细节</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEnhanceMode('cinematic')} className="flex flex-col items-start gap-1 py-2">
                  <div className="flex items-center gap-2 w-full">
                    <span>电影感</span>
                    {enhanceMode === 'cinematic' && <Check className="h-4 w-4 ml-auto" />}
                  </div>
                  <span className="text-xs text-muted-foreground">导演视角，电影级画面</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Enhance prompt */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !prompt.trim() || generationMode === 'fusion'}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>优化提示词 ({enhanceMode})</TooltipContent>
            </Tooltip>

            {/* Prompt Template */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTemplateDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>提示词模板</TooltipContent>
            </Tooltip>

            {/* Prompt Wizard */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowWizardDialog(true)}
                  disabled={!user?.textApiKey}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>智能生成</TooltipContent>
            </Tooltip>

            {/* Batch Task */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBatchDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>批量任务</TooltipContent>
            </Tooltip>
          </div>

          {/* 第二行：辅助工具 */}
          <div className="flex-shrink-0 flex items-center gap-1 flex-wrap">

            {/* Knowledge Card */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => knowledgeCardStore.openDialog()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>知识卡片</TooltipContent>
            </Tooltip>

            {/* Character Design */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => characterDesignStore.openDialog()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>人物角色</TooltipContent>
            </Tooltip>

            {/* Ecommerce Product */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => ecommerceProductStore.openDialog()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ShoppingBag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>电商产品</TooltipContent>
            </Tooltip>

            {/* Architecture */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => architectureStore.openDialog()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>建筑效果图</TooltipContent>
            </Tooltip>

            {/* Voice Dialog */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVoiceDialogOpen(true)}
                  disabled={!user?.textApiKey}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>语音对话</TooltipContent>
            </Tooltip>

            {/* Storyboard */}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStoryboardDialogOpen(true)}
                  disabled={!user?.textApiKey}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Clapperboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>故事板</TooltipContent>
            </Tooltip>
          </div>

          {/* ---- Advanced Params (collapsible) ---- */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setParamsPanelOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>高级参数</span>
              {paramsPanelOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {paramsPanelOpen && (
              <div className="mt-2 space-y-3 p-2 bg-white/5 rounded-lg border border-white/5 overflow-visible"
                   style={{ overflow: 'visible' }}>
                {/* 模型 - 独占一行 */}
                <div className="pb-2 border-b border-white/5">
                  <label className="text-xs text-muted-foreground mb-1 block">模型</label>
                  <Select value={imageModel} onValueChange={(v) => v && setImageModel(v as typeof imageModel)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="生成模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 输出分组 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">尺寸</label>
                    <Select value={size} onValueChange={(v) => v && setSize(v as '1K' | '2K' | '4K')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">比例</label>
                    <Select value={aspectRatio} onValueChange={(v) => v && setAspectRatio(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">画质</label>
                    <Select value={quality} onValueChange={(v) => v && setQuality(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 风格分组 */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">风格</label>
                  <Select value={style} onValueChange={(v) => v && setStyle(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_PRESETS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 构图与光影 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">构图</label>
                    <Select value={shotType} onValueChange={(v) => v && setShotType(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">光影</label>
                    <Select value={lighting} onValueChange={(v) => v && setLighting(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 镜头分组 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">角度</label>
                    <Select value={cameraAngle} onValueChange={(v) => v && setCameraAngle(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_ANGLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">镜头</label>
                    <Select value={lensType} onValueChange={(v) => v && setLensType(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LENS_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">对焦</label>
                    <Select value={focus} onValueChange={(v) => v && setFocus(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">相机</label>
                    <Select value={cameraModel} onValueChange={(v) => v && setCameraModel(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_MODEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 色彩分组 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">饱和度</label>
                    <Select value={saturation} onValueChange={(v) => v && setSaturation(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SATURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">对比度</label>
                    <Select value={contrast} onValueChange={(v) => v && setContrast(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRAST_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">噪点</label>
                    <Select value={noise} onValueChange={(v) => v && setNoise(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOISE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 氛围分组 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">氛围</label>
                    <Select value={atmosphere} onValueChange={(v) => v && setAtmosphere(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATMOSPHERE_PRESETS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">技术</label>
                    <Select value={technical} onValueChange={(v) => v && setTechnical(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TECHNICAL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---- Progress Section ---- */}
          {isGenerating && (
            <div className="flex-shrink-0 space-y-2">
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{generationStatus}</span>
                <span className="font-mono">{generationProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ======== Bottom Action Bar ======== */}
        <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-2">
          {/* Submit Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 rounded-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{generationMode === 'fusion' ? '开始融图' : '开始生成'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ======== Dialog Components ======== */}
      <PromptWizardDialog
        open={showWizardDialog}
        onOpenChange={setShowWizardDialog}
        apiKey={MINIMAX_CONFIG.API_KEY}
        onPromptGenerated={handlePromptFromDialog}
      />

      <KnowledgeCardDialog
        onGenerate={handlePromptFromDialog}
      />

      <CharacterDesignDialog
        onGenerate={handlePromptFromDialog}
      />

      <EcommerceProductDialog
        onFillPrompts={(prompts, _productInfo) => {
          if (prompts.length > 0) {
            setPrompt(prompts[0])
            if (generationMode === 'fusion') {
              setGenerationMode('text-to-image')
            }
            toast.success(`已填充第1个提示词（共${prompts.length}个）到输入框`)
          }
        }}
      />

      <ArchitectureDialog
        onGenerate={(generatedPrompt) => {
          setPrompt(generatedPrompt)
          if (generationMode === 'fusion') {
            setGenerationMode('text-to-image')
          }
          toast.success('建筑效果图提示词已填充到输入框')
        }}
      />

      <RealtimeVoiceDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        apiKey={user?.textApiKey || ''}
        onTextGenerated={(text: string) => {
          setPrompt(text)
          if (generationMode === 'fusion') {
            setGenerationMode('text-to-image')
          }
          toast.success('语音输入已转换为文本')
        }}
      />

      <StoryboardDialog
        open={storyboardDialogOpen}
        onOpenChange={setStoryboardDialogOpen}
        textApiKey={user?.textApiKey || ''}
        imageApiKey={user?.imageApiKey || ''}
      />

      <BatchTaskDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        currentParams={{
          model: imageModel,
          size,
          aspectRatio,
          style,
          shotType,
          cameraAngle,
          lensType,
          focus,
          lighting,
          technical,
          cameraModel,
          atmosphere,
          quality,
          saturation,
          contrast,
          noise,
        }}
      />

      <PromptTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onApply={(template) => {
          setPrompt(template.template)
          toast.success('模板已填充到输入框')
        }}
      />
    </TooltipProvider>
  )
}
