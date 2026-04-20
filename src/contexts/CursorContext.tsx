import { createContext, useContext, useState, ReactNode } from 'react'

/**
 * CursorContext - 自定义 cursor 状态管理
 *
 * 功能：
 * - 启用/禁用自定义 cursor
 * - 用户偏好持久化
 * - 自动检测设备能力
 */

interface CursorContextType {
  enabled: boolean
  toggleCursor: () => void
}

const CursorContext = createContext<CursorContextType | undefined>(undefined)

export function useCursor() {
  const context = useContext(CursorContext)
  if (!context) {
    throw new Error('useCursor must be used within CursorProvider')
  }
  return context
}

interface CursorProviderProps {
  children: ReactNode
}

export function CursorProvider({ children }: CursorProviderProps) {
  // 从 localStorage 读取用户偏好
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false

    // 检查是否支持（仅桌面端）
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    if (isCoarsePointer) return false

    // 读取用户偏好
    const saved = localStorage.getItem('custom-cursor-enabled')
    return saved ? saved === 'true' : false // 默认禁用
  })

  const toggleCursor = () => {
    setEnabled((prev) => {
      const newValue = !prev
      localStorage.setItem('custom-cursor-enabled', String(newValue))
      return newValue
    })
  }

  return (
    <CursorContext.Provider value={{ enabled, toggleCursor }}>
      {children}
    </CursorContext.Provider>
  )
}
