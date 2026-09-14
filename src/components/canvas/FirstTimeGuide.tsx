/**
 * 首次使用引导弹窗
 * 介绍 5 个核心快捷键
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideStep {
  id: string
  title: string
  description: string
  shortcut: {
    key: string[]
    description: string
  }
  tips: string[]
}

// 核心快捷键引导步骤
const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'step-1',
    title: '欢迎来到 NanoAiCanvas！',
    description: '让我们先学习 5 个最重要的快捷键，提升您的工作效率。',
    shortcut: {
      key: ['⌘', 'F1'],
      description: '显示/隐藏快捷键面板',
    },
    tips: [
      '随时按 ⌘F1 (Mac) 或 Ctrl+F1 (Windows) 查看所有快捷键',
      '快捷键面板支持搜索功能',
      '常用快捷键会有高亮标记',
    ],
  },
  {
    id: 'step-2',
    title: '保存您的作品',
    description: '画布会自动保存，但您也可以手动保存确保数据安全。',
    shortcut: {
      key: ['⌘', 'S'],
      description: '保存画布',
    },
    tips: [
      '画布会自动保存到本地',
      '建议定期手动保存重要修改',
      '保存后可以导出为文件',
    ],
  },
  {
    id: 'step-3',
    title: '撤销和重做',
    description: '不用担心犯错，随时可以撤销操作。',
    shortcut: {
      key: ['⌘', 'Z'],
      description: '撤销',
    },
    tips: [
      '支持撤销最近 50 步操作',
      '使用 ⌘⇧Z 可以重做',
      '撤销会自动创建历史记录',
    ],
  },
  {
    id: 'step-4',
    title: '快速复制和粘贴',
    description: '复制和粘贴是提升效率的关键操作。',
    shortcut: {
      key: ['⌘', 'C'],
      description: '复制选中节点',
    },
    tips: [
      '使用 ⌘V 粘贴复制的节点',
      '使用 ⌘D 快速复制节点',
      '粘贴时会自动调整位置',
    ],
  },
  {
    id: 'step-5',
    title: '管理节点属性',
    description: '右侧属性面板可以查看和编辑节点详细信息。',
    shortcut: {
      key: ['F1'],
      description: '显示/隐藏属性面板',
    },
    tips: [
      '选中节点时属性面板自动展开',
      '可以编辑节点的标题和描述',
      '支持修改节点状态和标签',
    ],
  },
]

interface FirstTimeGuideProps {
  open: boolean
  onComplete: () => void
  onSkip: () => void
}

export default function FirstTimeGuide({
  open,
  onComplete,
  onSkip,
}: FirstTimeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // 处理下一步
  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep])

  // 处理上一步
  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  // 完成引导
  const handleComplete = useCallback(() => {
    // 标记引导已完成
    localStorage.setItem('shortcut-guide-completed', 'true')
    onComplete()
  }, [onComplete])

  // 跳过引导
  const handleSkip = useCallback(() => {
    localStorage.setItem('shortcut-guide-completed', 'true')
    onSkip()
  }, [onSkip])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleNext, handlePrevious, handleSkip])

  const step = GUIDE_STEPS[currentStep]
  const isLastStep = currentStep === GUIDE_STEPS.length - 1
  const progress = ((currentStep + 1) / GUIDE_STEPS.length) * 100

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent
        className="max-w-lg bg-card/95 backdrop-blur-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleSkip}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg">{step.title}</DialogTitle>
          </div>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              步骤 {currentStep + 1} / {GUIDE_STEPS.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* 快捷键展示 */}
        <div className="py-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2 px-6 py-4 bg-muted/50 rounded-lg border">
              {step.shortcut.key.map((key, index) => (
                <div key={index} className="flex items-center">
                  <kbd className="px-3 py-2 text-lg font-semibold rounded-full bg-background border shadow-sm">
                    {key}
                  </kbd>
                  {index < step.shortcut.key.length - 1 && (
                    <span className="mx-2 text-2xl font-medium text-muted-foreground">
                      +
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm font-medium">{step.shortcut.description}</p>
        </div>

        {/* 提示 */}
        {step.tips.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">小贴士：</p>
            <ul className="space-y-1">
              {step.tips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 步骤指示器 */}
        <div className="flex justify-center gap-1.5">
          {GUIDE_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentStep
                  ? 'bg-primary w-6'
                  : index < currentStep
                  ? 'bg-primary/40'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`跳转到步骤 ${index + 1}`}
            />
          ))}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一步
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="text-xs text-muted-foreground">
            跳过引导
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? '开始使用' : '下一步'}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 检查是否已完成引导
export function hasCompletedGuide(): boolean {
  return localStorage.getItem('shortcut-guide-completed') === 'true'
}

// 重置引导状态（用于测试）
export function resetGuide(): void {
  localStorage.removeItem('shortcut-guide-completed')
}
