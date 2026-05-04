'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardStep } from '@/stores/nanoImageStoryboardWizardStore'

interface StepConfig {
  id: WizardStep
  label: string
  shortLabel: string
  description: string
}

// 四步流程配置
const STEPS: StepConfig[] = [
  { id: 1, label: '生成剧本', shortLabel: '剧本', description: '导入或生成剧本内容' },
  { id: 2, label: '故事板图片', shortLabel: '图片', description: '导入或生成故事板图片' },
  { id: 3, label: '对白生成', shortLabel: '对白', description: '生成对白及音频' },
  { id: 4, label: '角色设计', shortLabel: '角色', description: '生成角色设计提示词' },
]

interface WizardStepperProps {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  onStepClick?: (step: WizardStep) => void
}

export function WizardStepper({ currentStep, completedSteps, onStepClick }: WizardStepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700" />

        {/* Progress line fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step) => {
          const isActive = currentStep === step.id
          const isCompleted = completedSteps.includes(step.id)
          const isPast = currentStep > step.id

          return (
            <div
              key={step.id}
              onClick={() => isCompleted && onStepClick?.(step.id)}
              className={cn(
                "relative flex flex-col items-center z-10",
                isCompleted && "cursor-pointer"
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive && "border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30",
                  isCompleted && !isActive && "border-green-500 bg-green-500/20",
                  isPast && !isCompleted && "border-purple-500/50 bg-purple-500/10",
                  !isActive && !isCompleted && !isPast && "border-slate-600 bg-slate-800"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isActive && "text-purple-300",
                      !isActive && !isPast && "text-slate-400",
                      isPast && !isCompleted && "text-purple-400"
                    )}
                  >
                    {step.id}
                  </span>
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive && "text-purple-300",
                    isCompleted && "text-green-400",
                    !isActive && !isCompleted && !isPast && "text-slate-500",
                    isPast && !isCompleted && "text-purple-400/70"
                  )}
                >
                  {step.shortLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current step description */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400">
          步骤 {currentStep}/4：{STEPS[currentStep - 1]?.description}
        </p>
      </div>
    </div>
  )
}
