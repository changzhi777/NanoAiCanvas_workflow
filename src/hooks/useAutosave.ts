import { useEffect, useRef } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAutosave, selectAutosaveInterval } from '@/store/slices/settingsSlice'
import { exportData } from '@/store/db'
import { toast } from 'sonner'

export function useAutosave() {
  const autosave = useAppSelector(selectAutosave)
  const autosaveInterval = useAppSelector(selectAutosaveInterval)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!autosave) return

    const save = async () => {
      try {
        const data = await exportData()
        localStorage.setItem('autosave', data)
        toast.success('自动保存成功')
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      save()
      // 递归调用以实现循环
      if (autosave) {
        timeoutRef.current = setTimeout(() => {
          save()
        }, autosaveInterval)
      }
    }, autosaveInterval)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [autosave, autosaveInterval])
}
