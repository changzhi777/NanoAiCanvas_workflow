import { useRef, useCallback, useState } from 'react'

/**
 * IME 兼容的 textarea/input 辅助 hook
 *
 * 核心问题：React 受控输入 + IME 冲突
 *   composition 期间 React 重渲染会把 textarea.value 重置为 store 旧值，
 *   导致 IME 临时文本被清空，中文无法上屏。
 *
 * 解决方案：
 *   1. composition 期间切换到本地 draft state 作为 value 源
 *   2. composition 结束后将 draft 一次性同步到外部 store
 *   3. 非组合状态直接透传
 */
export function useIMETextarea(storeValue: string) {
  const [draft, setDraft] = useState<string | null>(null)
  const isComposingRef = useRef(false)

  // composition 期间用 draft，否则用 store 值
  const value = draft !== null ? draft : storeValue

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLTextAreaElement | HTMLInputElement>, onCommit: (value: string) => void) => {
      isComposingRef.current = false
      const finalValue = (e.target as HTMLTextAreaElement).value
      setDraft(null)
      onCommit(finalValue)
    },
    [],
  )

  const createOnChange = useCallback(
    (onCommit: (value: string) => void) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const v = e.target.value
      if (isComposingRef.current) {
        // composition 期间：只更新本地 draft，不触发外部更新
        setDraft(v)
      } else {
        onCommit(v)
      }
    },
    [],
  )

  return { value, isComposingRef, onCompositionStart, handleCompositionEnd, createOnChange }
}
