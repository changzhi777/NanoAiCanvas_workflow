import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import {
  togglePanel,
  toggleToolbar,
  toggleShortcutPanel
} from '@/store/slices/uiSlice'
import { AchievementStorage } from '@/components/canvas/AchievementSystem'

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
        AchievementStorage.recordShortcutUsage('save-canvas')
        console.log('保存')
      }

      // Ctrl/Cmd + Z: 撤销
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        // TODO: 触发撤销
        AchievementStorage.recordShortcutUsage('undo')
        console.log('撤销')
      }

      // Ctrl/Cmd + Shift + Z: 重做
      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        // TODO: 触发重做
        AchievementStorage.recordShortcutUsage('redo')
        console.log('重做')
      }

      // Ctrl/Cmd + Y: 重做
      if (cmdOrCtrl && e.key === 'y') {
        e.preventDefault()
        // TODO: 触发重做
        AchievementStorage.recordShortcutUsage('redo')
        console.log('重做')
      }

      // Delete: 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // TODO: 删除选中的节点或连线
        AchievementStorage.recordShortcutUsage('delete')
        console.log('删除')
      }

      // Ctrl/Cmd + D: 复制
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault()
        // TODO: 复制选中节点
        AchievementStorage.recordShortcutUsage('duplicate')
        console.log('复制')
      }

      // Ctrl/Cmd + +: 放大
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        // TODO: 放大画布
        AchievementStorage.recordShortcutUsage('zoom-in')
        console.log('放大')
      }

      // Ctrl/Cmd + -: 缩小
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault()
        // TODO: 缩小画布
        AchievementStorage.recordShortcutUsage('zoom-out')
        console.log('缩小')
      }

      // Ctrl/Cmd + 0: 适应屏幕
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault()
        // TODO: 适应屏幕
        AchievementStorage.recordShortcutUsage('fit-view')
        console.log('适应屏幕')
      }

      // F1: 切换属性面板
      if (e.key === 'F1') {
        e.preventDefault()
        dispatch(togglePanel('properties'))
        AchievementStorage.recordShortcutUsage('toggle-properties')
      }

      // F2: 切换模板面板
      if (e.key === 'F2') {
        e.preventDefault()
        dispatch(togglePanel('templates'))
        AchievementStorage.recordShortcutUsage('toggle-templates')
      }

      // Ctrl/Cmd + B: 切换工具栏
      if (cmdOrCtrl && e.key === 'b') {
        e.preventDefault()
        dispatch(toggleToolbar())
        AchievementStorage.recordShortcutUsage('toggle-toolbar')
      }

      // Ctrl/Cmd + F1: 显示快捷键面板
      if (cmdOrCtrl && e.key === 'F1') {
        e.preventDefault()
        dispatch(toggleShortcutPanel())
        AchievementStorage.recordShortcutUsage('toggle-shortcuts')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])
}
