'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './ui/Theme'
import {
  Rocket,
  PenLine,
  Wand2,
  Image,
  Download,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  icon: React.ElementType
  label: string
  title: string
  description: string
  detail: string
  accent: string
}

const STEPS: TourStep[] = [
  {
    icon: PenLine,
    label: '输入描述',
    title: '写下你的想法',
    description: '在「故事板分镜V1版」节点中输入场景描述、角色动作或故事片段。',
    detail: '支持中文自然语言描述，越详细生成的图片越精准',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Wand2,
    label: '优化提示词',
    title: 'AI 自动优化',
    description: 'GLM-4.5-Air 将你的描述转化为专业的图像生成提示词。',
    detail: '自动添加构图、光影、风格等专业关键词',
    accent: 'from-violet-500 to-purple-500',
  },
  {
    icon: Image,
    label: '生成图片',
    title: '一键生成分镜',
    description: '优化后的提示词直接驱动图片生成，结果在「图片预览」节点查看。',
    detail: '点击顶部「执行工作流」按钮启动，需先登录',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Download,
    label: '保存输出',
    title: '保存或下载',
    description: '通过「输出/保存」节点将图片保存到资产库或下载到本地。',
    detail: '资产库支持云端同步，随时随地访问',
    accent: 'from-orange-500 to-amber-500',
  },
]

const STORAGE_KEY = 'nanoai-onboarding-completed'

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    // 直接标记已完成，跳过新手教程
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const close = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, 'true')
      setVisible(false)
      setExiting(false)
    }, 300)
  }, [])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (step < STEPS.length - 1) setStep(step + 1); else close()
      }
      else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setStep(s => Math.max(0, s - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, close])

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isDark ? 'bg-black/60' : 'bg-black/40',
          exiting ? 'opacity-0' : 'opacity-100'
        )}
        onClick={close}
      />

      {/* 主卡片 */}
      <div
        className={cn(
          'relative w-full max-w-lg mx-4 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300',
          isDark
            ? 'bg-slate-900 border border-white/10'
            : 'bg-white border border-gray-200',
          exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
      >
        {/* 顶部渐变条 */}
        <div className={cn('h-1.5 bg-gradient-to-r', current.accent)} />

        {/* 关闭按钮 */}
        <button
          onClick={close}
          className={cn(
            'absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10',
            isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* 内容区 */}
        <div className="p-8 pb-6">
          {/* 流程步骤条 */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon
              return (
                <div key={i} className="flex items-center flex-1">
                  <button
                    onClick={() => setStep(i)}
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300',
                      i === step
                        ? cn('bg-gradient-to-br text-white shadow-lg', s.accent)
                        : i < step
                        ? (isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary')
                        : (isDark ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400')
                    )}
                  >
                    <StepIcon className="w-4 h-4" />
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300',
                      i < step
                        ? 'bg-primary/40'
                        : (isDark ? 'bg-white/10' : 'bg-gray-200')
                    )} />
                  )}
                </div>
              )
            })}
          </div>

          {/* 图标 + 标签 */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br text-white shadow-lg',
              current.accent
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-500'
              )}>
                第 {step + 1} 步 · {current.label}
              </span>
            </div>
          </div>

          {/* 标题 */}
          <h2 className={cn(
            'text-2xl font-bold mb-3',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {current.title}
          </h2>

          {/* 描述 */}
          <p className={cn(
            'text-base leading-relaxed mb-2',
            isDark ? 'text-slate-300' : 'text-gray-600'
          )}>
            {current.description}
          </p>

          {/* 补充说明 */}
          <p className={cn(
            'text-sm',
            isDark ? 'text-slate-500' : 'text-gray-400'
          )}>
            💡 {current.detail}
          </p>
        </div>

        {/* 进度条 */}
        <div className={cn('h-0.5', isDark ? 'bg-white/5' : 'bg-gray-100')}>
          <div
            className={cn('h-full bg-gradient-to-r transition-all duration-500 ease-out', current.accent)}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 底部操作 */}
        <div className={cn(
          'flex items-center justify-between px-8 py-5',
          isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50'
        )}>
          <button
            onClick={close}
            className={cn(
              'text-sm transition-colors',
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            跳过引导
          </button>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className={cn(
                  'flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  isDark
                    ? 'text-slate-300 bg-white/5 hover:bg-white/10'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}
            <button
              onClick={() => isLast ? close() : setStep(step + 1)}
              className={cn(
                'flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
                `bg-gradient-to-r ${current.accent}`
              )}
            >
              {isLast ? '开始创作' : '下一步'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
              {isLast && <Rocket className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
