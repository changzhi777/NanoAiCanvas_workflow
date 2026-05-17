'use client'
import { useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShoppingBag, Upload, Loader2, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react'
import { useEcommerceProductStore } from '@/stores/nanoImageEcommerceProductStore'
import { useAuthStore } from '@/stores/remoteStore'
import { analyzeEcommerceProduct } from '@/lib/api/ecommerce-product-analyze'
import { generateEcommercePrompts, type ProductAnalysis } from '@/lib/constants/ecommerce-prompts'
import { cn } from '@/lib/utils'

interface EcommerceProductDialogProps {
  onFillPrompts: (prompts: string[], productInfo?: ProductAnalysis) => void
}

export function EcommerceProductDialog({ onFillPrompts }: EcommerceProductDialogProps) {
  const {
    isDialogOpen,
    currentStep,
    referenceImage,
    productAnalysis,
    prompts,
    closeDialog,
    setCurrentStep,
    setReferenceImage,
    setProductAnalysis,
    setPrompts,
    updatePrompt,
    setError,
  } = useEcommerceProductStore()
  const { user } = useAuthStore()

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const url = URL.createObjectURL(file)
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || ''
        setReferenceImage({ id: crypto.randomUUID(), url, file, base64 })
      }
      reader.readAsDataURL(file)
    },
    [setReferenceImage],
  )

  const handleAnalyze = useCallback(async () => {
    if (!referenceImage?.base64) {
      setError('请先上传产品图片')
      return
    }
    if (!user?.textApiKey) {
      setError('请先配置 GLM API Key')
      return
    }

    setCurrentStep('analyzing')
    setError(null)

    // 从设置中获取模型配置
    const moduleSettings = (user?.settings as any)?.moduleSettings?.['ecommerce-analyze']
    const model = moduleSettings?.model || 'glm-5v-turbo'

    try {
      const analysis = await analyzeEcommerceProduct({
        imageBase64: referenceImage.base64,
        apiKey: user.textApiKey,
        model,
      })
      setProductAnalysis(analysis)
      const ecommercePrompts = generateEcommercePrompts(analysis)
      setPrompts(ecommercePrompts)
      setCurrentStep('prompts')
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
      setCurrentStep('upload')
    }
  }, [referenceImage, user?.textApiKey, setCurrentStep, setError, setProductAnalysis, setPrompts])

  const handleConfirm = useCallback(() => {
    if (prompts.length > 0 && productAnalysis) {
      onFillPrompts(prompts, productAnalysis)
    }
    closeDialog()
  }, [prompts, productAnalysis, onFillPrompts, closeDialog])

  // Step indicator
  const steps = ['upload', 'analyzing', 'prompts'] as const
  const stepIdx = steps.indexOf(currentStep as typeof steps[number])

  return (
    <Dialog open={isDialogOpen} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="sm:max-w-lg bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          电商产品详情图
        </DialogTitle>

        {/* Progress indicator */}
        <div className="flex items-center gap-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all',
                idx <= stepIdx ? 'bg-primary w-8' : 'bg-white/10 w-6'
              )}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="py-2 space-y-3">
          {currentStep === 'upload' && (
            <>
              {referenceImage ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={referenceImage.url}
                      alt="产品图"
                      className="max-h-48 rounded-lg border border-white/10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full"
                      onClick={() => setReferenceImage(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始分析
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-white/20 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-colors text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm">上传产品图片</span>
                  <span className="text-xs opacity-50">支持 JPG、PNG 格式</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </>
          )}

          {currentStep === 'analyzing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在分析产品图片...</p>
            </div>
          )}

          {currentStep === 'prompts' && productAnalysis && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                分析完成 — {productAnalysis.productName} ({productAnalysis.category})
              </div>
              {prompts.map((prompt, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">场景 {i + 1}</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => updatePrompt(i, e.target.value)}
                    className="bg-transparent border-input text-xs min-h-[50px]"
                    rows={3}
                  />
                </div>
              ))}
              <Button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                确认填充到输入框
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
