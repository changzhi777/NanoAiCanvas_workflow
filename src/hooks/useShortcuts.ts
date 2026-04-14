import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import {
  togglePanel,
  toggleToolbar,
  toggleShortcutPanel
} from '@/store/slices/uiSlice'

export function useShortcuts() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + S: 保存
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault()
        // TODO: 触发保存
        console.log('保存')
      }

      // Ctrl/Cmd + Z: 撤销
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        // TODO: 触发撤销
        console.log('撤销')
      }

      // Ctrl/Cmd + Shift + Z: 重做
      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        // TODO: 触发重做
        console.log('重做')
      }

      // Ctrl/Cmd + Y: 重做
      if (cmdOrCtrl && e.key === 'y') {
        e.preventDefault()
        // TODO: 触发重做
        console.log('重做')
      }

      // Delete: 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // TODO: 删除选中的节点或连线
        console.log('删除')
      }

      // Ctrl/Cmd + D: 复制
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault()
        // TODO: 复制选中节点
        console.log('复制')
      }

      // Ctrl/Cmd + +: 放大
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        // TODO: 放大画布
        console.log('放大')
      }

      // Ctrl/Cmd + -: 缩小
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault()
        // TODO: 缩小画布
        console.log('缩小')
      }

      // Ctrl/Cmd + 0: 适应屏幕
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault()
        // TODO: 适应屏幕
        console.log('适应屏幕')
      }

      // F1: 切换属性面板
      if (e.key === 'F1') {
        e.preventDefault()
        dispatch(togglePanel('properties'))
      }

      // F2: 切换模板面板
      if (e.key === 'F2') {
        e.preventDefault()
        dispatch(togglePanel('templates'))
      }

      // Ctrl/Cmd + B: 切换工具栏
      if (cmdOrCtrl && e.key === 'b') {
        e.preventDefault()
        dispatch(toggleToolbar())
      }

      // ?: 显示快捷键面板
      if (e.key === '?' && !cmdOrCtrl && !e.shiftKey) {
        e.preventDefault()
        dispatch(toggleShortcutPanel())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])
}
