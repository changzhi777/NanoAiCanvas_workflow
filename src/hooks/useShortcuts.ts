import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  togglePanel,
  toggleToolbar,
  toggleShortcutPanel,
  selectSelectedNodes,
  selectSelectedEdges,
} from '@/store/slices/uiSlice'
import { deleteNodeAsync, deleteEdgeAsync } from '@/store/slices/canvasSlice'
import { AchievementStorage } from '@/components/canvas/AchievementSystem'
import { toast } from 'sonner'

interface UseShortcutsOptions {
  undo?: () => boolean
  redo?: () => boolean
  canUndo?: boolean
  canRedo?: boolean
}

export function useShortcuts(options?: UseShortcutsOptions) {
  const dispatch = useAppDispatch()
  const selectedNodes = useAppSelector(selectSelectedNodes)
  const selectedEdges = useAppSelector(selectSelectedEdges)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // 检查是否在输入框中
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.contentEditable === 'true'

      // Ctrl/Cmd + S: 保存
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault()
        AchievementStorage.recordShortcutUsage('save-canvas')
      }

      // Ctrl/Cmd + Z: 撤销
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (options?.undo && options?.canUndo) {
          const success = options.undo()
          if (success) {
            toast.success('已撤销')
            AchievementStorage.recordShortcutUsage('undo')
          }
        } else {
          AchievementStorage.recordShortcutUsage('undo')
          // undo executed
        }
      }

      // Ctrl/Cmd + Shift + Z: 重做
      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (options?.redo && options?.canRedo) {
          const success = options.redo()
          if (success) {
            toast.success('已重做')
            AchievementStorage.recordShortcutUsage('redo')
          }
        } else {
          AchievementStorage.recordShortcutUsage('redo')
        }
      }

      // Ctrl/Cmd + Y: 重做
      if (cmdOrCtrl && e.key === 'y') {
        e.preventDefault()
        if (options?.redo && options?.canRedo) {
          const success = options.redo()
          if (success) {
            toast.success('已重做')
            AchievementStorage.recordShortcutUsage('redo')
          }
        } else {
          AchievementStorage.recordShortcutUsage('redo')
        }
      }

      // Delete: 删除选中（仅在非输入框中）
      if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()

        // 删除选中的节点和连线
        const deletedCount = selectedNodes.length + selectedEdges.length

        if (deletedCount > 0) {
          // 删除节点
          selectedNodes.forEach((nodeId: string) => {
            dispatch(deleteNodeAsync(nodeId))
          })

          // 删除连线
          selectedEdges.forEach((edgeId: string) => {
            dispatch(deleteEdgeAsync(edgeId))
          })

          // 显示提示
          toast.success(`已删除 ${deletedCount} 个项目`)
          AchievementStorage.recordShortcutUsage('delete')
        }
      }

      // Ctrl/Cmd + D: 复制
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault()
        // TODO: 复制选中节点
        AchievementStorage.recordShortcutUsage('duplicate')
      }

      // Ctrl/Cmd + +: 放大
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        // TODO: 放大画布
        AchievementStorage.recordShortcutUsage('zoom-in')
      }

      // Ctrl/Cmd + -: 缩小
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault()
        // TODO: 缩小画布
        AchievementStorage.recordShortcutUsage('zoom-out')
      }

      // Ctrl/Cmd + 0: 适应屏幕
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault()
        // TODO: 适应屏幕
        AchievementStorage.recordShortcutUsage('fit-view')
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
  }, [dispatch, selectedNodes, selectedEdges, options])
}
