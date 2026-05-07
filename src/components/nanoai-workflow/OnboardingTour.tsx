'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const TOUR_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: '节点面板',
    content: '这里包含所有可用的 AI 节点，拖拽到画布即可使用。点击展开查看完整列表。',
    placement: 'right' as const,
  },
  {
    target: '[data-tour="canvas"]',
    title: '无限画布',
    content: '自由拖拽、缩放的工作区域。滚轮缩放，按住空格拖拽画布。',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="toolbar"]',
    title: '工具栏',
    content: '包含模板选择、执行工作流、保存、导出等核心操作。点击"模板"快速加载预设流程。',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="properties"]',
    title: '属性面板',
    content: '选中画布上的节点后，在此处查看和修改节点参数。',
    placement: 'left' as const,
  },
  {
    target: '[data-tour="execute-btn"]',
    title: '执行工作流',
    content: '配置好节点后，点击执行按钮或按 Cmd+E 启动工作流。节点会按连接顺序依次运行。',
    placement: 'bottom' as const,
  },
]

const STORAGE_KEY = 'nanoai-onboarding-completed'
const BUBBLE_WIDTH = 320
const GAP = 12

function getBubbleStyle(rect: DOMRect, placement: 'top' | 'bottom' | 'left' | 'right') {
  switch (placement) {
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: 'translateY(-50%)' }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP, transform: 'translate(-100%, -50%)' }
    case 'bottom':
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
    case 'top':
      return { top: rect.top - GAP, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' }
  }
}

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // 首次访问时启动引导
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  // 按步骤/resize/scroll 更新位置，不用 rAF 循环
  const refreshRect = useCallback(() => {
    const el = document.querySelector(TOUR_STEPS[step]?.target || '')
    setRect(el?.getBoundingClientRect() ?? null)
  }, [step])

  useEffect(() => {
    if (!visible) return
    refreshRect()
    window.addEventListener('resize', refreshRect)
    window.addEventListener('scroll', refreshRect, true)
    return () => {
      window.removeEventListener('resize', refreshRect)
      window.removeEventListener('scroll', refreshRect, true)
    }
  }, [visible, step, refreshRect])

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }, [])

  // Esc 跳过
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, close])

  if (!visible || !rect) return null

  const current = TOUR_STEPS[step]
  const bubble = getBubbleStyle(rect, current.placement)

  return (
    <>
      {/* 高亮 + 遮罩（boxShadow 挖洞） */}
      <div
        style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          zIndex: 9999,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          border: '2px solid hsl(var(--primary))',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* 气泡 */}
      <div
        style={{
          position: 'fixed',
          zIndex: 10000,
          transition: 'all 0.3s ease',
          ...bubble,
        }}
      >
        <div style={{
          width: BUBBLE_WIDTH,
          padding: 20,
          borderRadius: 12,
          backgroundColor: 'hsl(0 0% 12%)',
          border: '1px solid hsl(0 0% 20%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          color: 'hsl(0 0% 95%)',
        }}>
          {/* 步骤指示器 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === step ? 'hsl(var(--primary))' : i < step ? 'hsl(var(--primary)/0.5)' : 'hsl(0 0% 25%)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{current.title}</h3>
          <p style={{ fontSize: 13, color: 'hsl(0 0% 65%)', lineHeight: 1.6, marginBottom: 16 }}>{current.content}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={close} style={{ background: 'none', border: 'none', color: 'hsl(0 0% 45%)', cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>
              跳过
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} style={{ background: 'hsl(0 0% 18%)', border: '1px solid hsl(0 0% 25%)', color: 'hsl(0 0% 80%)', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>
                  上一步
                </button>
              )}
              <button
                onClick={() => step < TOUR_STEPS.length - 1 ? setStep(step + 1) : close()}
                style={{ background: 'hsl(var(--primary))', border: 'none', color: 'hsl(var(--primary-foreground))', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                {step === TOUR_STEPS.length - 1 ? '开始使用' : '下一步'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'hsl(0 0% 35%)' }}>
            {step + 1} / {TOUR_STEPS.length} · Esc 跳过
          </div>
        </div>
      </div>
    </>
  )
}
