/**
 * IME 兼容输入组件
 * 解决中文/日文/韩文输入法在 React 受控组件中的组合输入中断问题
 *
 * 原理：IME 组合期间使用本地状态缓冲，组合结束后同步到父组件
 * 避免父组件 re-render 期间重置 DOM value 导致输入法被打断
 */

import React, { useState, useRef, useEffect } from 'react'
import { Input, InputProps } from '@/components/ui/input'
import { Textarea, TextareaProps } from '@/components/ui/textarea/index'

// ==================== IME Input ====================

export const IMEInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ value: externalValue, onChange, onCompositionStart, onCompositionEnd, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(externalValue ?? '')
    const isComposing = useRef(false)

    useEffect(() => {
      if (!isComposing.current) {
        setLocalValue(externalValue ?? '')
      }
    }, [externalValue])

    return (
      <Input
        ref={ref}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value)
          if (!isComposing.current) {
            onChange?.(e)
          }
        }}
        onCompositionStart={(e) => {
          isComposing.current = true
          onCompositionStart?.(e)
        }}
        onCompositionEnd={(e) => {
          isComposing.current = false
          const v = (e.target as HTMLInputElement).value
          setLocalValue(v)
          onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)
          onCompositionEnd?.(e)
        }}
        {...props}
      />
    )
  }
)
IMEInput.displayName = 'IMEInput'

// ==================== IME Textarea ====================

export const IMETextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ value: externalValue, onChange, onCompositionStart, onCompositionEnd, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(externalValue ?? '')
    const isComposing = useRef(false)

    useEffect(() => {
      if (!isComposing.current) {
        setLocalValue(externalValue ?? '')
      }
    }, [externalValue])

    return (
      <Textarea
        ref={ref}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value)
          if (!isComposing.current) {
            onChange?.(e)
          }
        }}
        onCompositionStart={(e) => {
          isComposing.current = true
          onCompositionStart?.(e)
        }}
        onCompositionEnd={(e) => {
          isComposing.current = false
          const v = (e.target as HTMLTextAreaElement).value
          setLocalValue(v)
          onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLTextAreaElement>)
          onCompositionEnd?.(e)
        }}
        {...props}
      />
    )
  }
)
IMETextarea.displayName = 'IMETextarea'

// ==================== useIMEValue Hook ====================
// 用于原生 <input>/<textarea> 元素（非 shadcn 组件）

export function useIMEValue(
  externalValue: string,
  onChange: (v: string) => void
) {
  const [localValue, setLocalValue] = useState(externalValue ?? '')
  const isComposing = useRef(false)

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(externalValue ?? '')
    }
  }, [externalValue])

  return {
    value: localValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLocalValue(e.target.value)
      if (!isComposing.current) {
        onChange(e.target.value)
      }
    },
    onCompositionStart: () => { isComposing.current = true },
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isComposing.current = false
      const v = (e.target as HTMLInputElement | HTMLTextAreaElement).value
      setLocalValue(v)
      onChange(v)
    },
  }
}

// ==================== 原生元素包装 ====================
// 用于不使用 shadcn 组件的原生 <input>/<textarea>（如 BaseNode ParamEditor）

export const IMERawInput = React.memo(({ value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) => {
  const ime = useIMEValue(value, onChange)
  return <input {...ime} {...props} />
})
IMERawInput.displayName = 'IMERawInput'

export const IMERawTextarea = React.memo(({ value, onChange, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) => {
  const ime = useIMEValue(value, onChange)
  return <textarea {...ime} {...props} />
})
IMERawTextarea.displayName = 'IMERawTextarea'
