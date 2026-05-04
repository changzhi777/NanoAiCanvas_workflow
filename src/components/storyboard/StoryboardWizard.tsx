'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStoryboardWizardStore } from '@/stores/nanoImageStoryboardWizardStore'
import { WizardStepper } from './wizard/WizardStepper'
import { Step1Script } from './wizard/Step1Script'
import { Step2Storyboard } from './wizard/Step2Storyboard'
import { Step3Dialogue } from './wizard/Step3Dialogue'
import { Step4Character } from './wizard/Step4Character'
import type { WizardStep } from '@/stores/nanoImageStoryboardWizardStore'

// 导出 payload 类型
export type WizardPayload = {
  inputText: string
  style: string
  script: any
  storyboardImages: any[]
  dialogues: any[]
  characterPrompts: any[]
}

interface StoryboardWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: WizardPayload) => void | Promise<void>
}

export function StoryboardWizard({ open, onOpenChange, onSubmit }: StoryboardWizardProps) {
  const store = useStoryboardWizardStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    currentStep,
    scriptData,
    storyboardImages,
    dialogues,
    characterPrompts,
    nextStep,
    prevStep,
    goToStep,
    reset,
    getWizardPayload,
  } = store

  // 计算已完成的步骤
  const completedSteps: WizardStep[] = []
  if (scriptData?.scenes?.length) completedSteps.push(1)
  if (storyboardImages.length > 0) completedSteps.push(2)
  if (dialogues.length > 0) completedSteps.push(3)
  if (characterPrompts.length > 0) completedSteps.push(4)

  // 判断步骤是否可继续
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!scriptData?.scenes?.length
      case 2:
        return storyboardImages.length > 0
      case 3:
        return dialogues.length > 0
      case 4:
        return characterPrompts.length > 0
      default:
        return false
    }
  }

  // 处理步骤点击
  const handleStepClick = (step: WizardStep) => {
    if (completedSteps.includes(step) || step < currentStep) {
      goToStep(step)
    }
  }

  // 提交全部
  const handleSubmitAll = async () => {
    setIsSubmitting(true)
    try {
      const payload = getWizardPayload()
      await onSubmit({
        inputText: payload.inputText,
        style: payload.style,
        script: payload.script,
        storyboardImages: payload.storyboardImages,
        dialogues: payload.dialogues,
        characterPrompts: payload.characterPrompts,
      })
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 关闭时确认
  const handleClose = () => {
    if (completedSteps.length > 0) {
      const confirmed = window.confirm('当前有未提交的进度，关闭后将丢失，是否继续？')
      if (!confirmed) return
    }
    reset()
    onOpenChange(false)
  }

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Script />
      case 2:
        return <Step2Storyboard />
      case 3:
        return <Step3Dialogue />
      case 4:
        return <Step4Character />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              故事板向导
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="py-4 border-b border-slate-700">
          <WizardStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* 步骤内容 */}
        <div className="py-4 flex-1 overflow-y-auto max-h-[320px]">
          {renderStepContent()}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一步
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200"
            >
              取消
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
              >
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitAll}
                disabled={isSubmitting || !canProceed()}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    提交中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    一键生成全部
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
