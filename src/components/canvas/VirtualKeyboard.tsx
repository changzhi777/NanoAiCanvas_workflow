/**
 * 虚拟键盘组件
 * 用于可视化地设置快捷键
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { KeyCombo, KeyboardKey } from '@/types/shortcuts'

interface VirtualKeyboardProps {
  value: KeyCombo
  onChange: (keys: KeyCombo) => void
  maxKeys?: number
  disabled?: boolean
  onConflict?: (keys: KeyCombo) => boolean
}

// macOS 键盘布局
const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  // 第一行：数字键
  [
    { code: 'Digit1', label: '1', type: 'number' },
    { code: 'Digit2', label: '2', type: 'number' },
    { code: 'Digit3', label: '3', type: 'number' },
    { code: 'Digit4', label: '4', type: 'number' },
    { code: 'Digit5', label: '5', type: 'number' },
    { code: 'Digit6', label: '6', type: 'number' },
    { code: 'Digit7', label: '7', type: 'number' },
    { code: 'Digit8', label: '8', type: 'number' },
    { code: 'Digit9', label: '9', type: 'number' },
    { code: 'Digit0', label: '0', type: 'number' },
    { code: 'Minus', label: '-', type: 'special' },
    { code: 'Equal', label: '=', type: 'special' },
    { code: 'Backspace', label: '⌫', type: 'special', width: 2 },
  ],
  // 第二行：Tab + QWERTYYUIOP[]
  [
    { code: 'Tab', label: 'Tab', type: 'special', width: 1.5 },
    { code: 'KeyQ', label: 'Q', type: 'letter' },
    { code: 'KeyW', label: 'W', type: 'letter' },
    { code: 'KeyE', label: 'E', type: 'letter' },
    { code: 'KeyR', label: 'R', type: 'letter' },
    { code: 'KeyT', label: 'T', type: 'letter' },
    { code: 'KeyY', label: 'Y', type: 'letter' },
    { code: 'KeyU', label: 'U', type: 'letter' },
    { code: 'KeyI', label: 'I', type: 'letter' },
    { code: 'KeyO', label: 'O', type: 'letter' },
    { code: 'KeyP', label: 'P', type: 'letter' },
    { code: 'BracketLeft', label: '[', type: 'special' },
    { code: 'BracketRight', label: ']', type: 'special' },
    { code: 'Backslash', label: '\\', type: 'special', width: 1.5 },
  ],
  // 第三行：Caps + ASDFGHJKL;' Enter
  [
    { code: 'CapsLock', label: '⇪', type: 'special', width: 1.8 },
    { code: 'KeyA', label: 'A', type: 'letter' },
    { code: 'KeyS', label: 'S', type: 'letter' },
    { code: 'KeyD', label: 'D', type: 'letter' },
    { code: 'KeyF', label: 'F', type: 'letter' },
    { code: 'KeyG', label: 'G', type: 'letter' },
    { code: 'KeyH', label: 'H', type: 'letter' },
    { code: 'KeyJ', label: 'J', type: 'letter' },
    { code: 'KeyK', label: 'K', type: 'letter' },
    { code: 'KeyL', label: 'L', type: 'letter' },
    { code: 'Semicolon', label: ';', type: 'special' },
    { code: 'Quote', label: "'", type: 'special' },
    { code: 'Enter', label: '↩', type: 'special', width: 2.2 },
  ],
  // 第四行：Shift + ZXCVBNM,./ Shift
  [
    { code: 'ShiftLeft', label: '⇧', type: 'modifier', width: 2.3 },
    { code: 'KeyZ', label: 'Z', type: 'letter' },
    { code: 'KeyX', label: 'X', type: 'letter' },
    { code: 'KeyC', label: 'C', type: 'letter' },
    { code: 'KeyV', label: 'V', type: 'letter' },
    { code: 'KeyB', label: 'B', type: 'letter' },
    { code: 'KeyN', label: 'N', type: 'letter' },
    { code: 'KeyM', label: 'M', type: 'letter' },
    { code: 'Comma', label: ',', type: 'special' },
    { code: 'Period', label: '.', type: 'special' },
    { code: 'Slash', label: '/', type: 'special' },
    { code: 'ShiftRight', label: '⇧', type: 'modifier', width: 2.7 },
  ],
  // 第五行：修饰键 + 空格 + 修饰键
  [
    { code: 'ControlLeft', label: '⌃', type: 'modifier', width: 1.5 },
    { code: 'MetaLeft', label: '⌘', type: 'modifier', width: 1.5 },
    { code: 'AltLeft', label: '⌥', type: 'modifier', width: 1.5 },
    { code: 'Space', label: '', type: 'space', width: 6 },
    { code: 'AltRight', label: '⌥', type: 'modifier', width: 1.5 },
    { code: 'MetaRight', label: '⌘', type: 'modifier', width: 1.5 },
    { code: 'ControlRight', label: '⌃', type: 'modifier', width: 1.5 },
  ],
]

// 功能键行（F1-F12）
const FUNCTION_KEYS: KeyboardKey[] = [
  { code: 'Escape', label: 'Esc', type: 'special', width: 1.5 },
  { code: 'F1', label: 'F1', type: 'special' },
  { code: 'F2', label: 'F2', type: 'special' },
  { code: 'F3', label: 'F3', type: 'special' },
  { code: 'F4', label: 'F4', type: 'special' },
  { code: 'F5', label: 'F5', type: 'special' },
  { code: 'F6', label: 'F6', type: 'special' },
  { code: 'F7', label: 'F7', type: 'special' },
  { code: 'F8', label: 'F8', type: 'special' },
  { code: 'F9', label: 'F9', type: 'special' },
  { code: 'F10', label: 'F10', type: 'special' },
  { code: 'F11', label: 'F11', type: 'special' },
  { code: 'F12', label: 'F12', type: 'special' },
]

// 将键盘事件代码转换为显示标签
export function codeToLabel(code: string): string {
  const labelMap: Record<string, string> = {
    'ControlLeft': '⌃',
    'ControlRight': '⌃',
    'MetaLeft': '⌘',
    'MetaRight': '⌘',
    'AltLeft': '⌥',
    'AltRight': '⌥',
    'ShiftLeft': '⇧',
    'ShiftRight': '⇧',
    'Space': '空格',
    'Enter': '↩',
    'Tab': 'Tab',
    'Backspace': '⌫',
    'Escape': 'Esc',
    'CapsLock': '⇪',
  }

  return labelMap[code] || code.replace(/Key|Digit/, '').toUpperCase()
}

export default function VirtualKeyboard({
  value,
  onChange,
  maxKeys = 4,
  disabled = false,
  onConflict,
}: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())

  // 处理按键点击
  const handleKeyClick = useCallback(
    (key: KeyboardKey) => {
      if (disabled) return

      const label = codeToLabel(key.code)
      let newValue = [...value]

      // 检查是否已经按下过这个键
      const existingIndex = newValue.indexOf(label)

      if (existingIndex !== -1) {
        // 如果已经按下，则移除
        newValue.splice(existingIndex, 1)
      } else {
        // 如果没达到最大按键数，则添加
        if (newValue.length < maxKeys) {
          newValue.push(label)

          // 检查冲突
          if (onConflict && onConflict(newValue)) {
            // 有冲突，移除刚添加的键
            newValue.pop()
            return
          }
        }
      }

      onChange(newValue)
    },
    [value, onChange, maxKeys, disabled, onConflict]
  )

  // 处理物理键盘按键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      e.preventDefault()
      const label = codeToLabel(e.code)

      // 防止重复触发
      if (pressedKeys.has(label)) return

      setPressedKeys(prev => new Set(prev).add(label))

      let newValue = [...value]

      if (newValue.length < maxKeys) {
        newValue.push(label)

        // 检查冲突
        if (onConflict && onConflict(newValue)) {
          newValue.pop()
          return
        }

        onChange(newValue)
      }
    },
    [value, onChange, maxKeys, disabled, onConflict, pressedKeys]
  )

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const label = codeToLabel(e.code)
    setPressedKeys(prev => {
      const newSet = new Set(prev)
      newSet.delete(label)
      return newSet
    })
  }, [])

  // 清除所有按键
  const handleClear = useCallback(() => {
    onChange([])
  }, [onChange])

  // 渲染按键
  const renderKey = (key: KeyboardKey) => {
    const label = codeToLabel(key.code)
    const isSelected = value.includes(label)
    const isPressed = pressedKeys.has(label)
    const baseWidth = key.width || 1

    return (
      <button
        key={key.code}
        type="button"
        onClick={() => handleKeyClick(key)}
        disabled={disabled}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'h-10 px-1 rounded-md',
          'border transition-all duration-100',
          'text-xs font-medium',
          'select-none',
          // 默认状态
          'bg-background border-border hover:border-border/80',
          // 选中状态
          isSelected && 'bg-primary text-primary-foreground border-primary',
          // 按下状态
          isPressed && 'scale-95 bg-muted',
          // 禁用状态
          disabled && 'opacity-50 cursor-not-allowed',
          // 修饰键样式
          key.type === 'modifier' && 'text-sm font-bold',
          // 功能键样式
          key.type === 'special' && 'text-xs',
          // 空格键样式
          key.type === 'space' && 'bg-muted/50'
        )}
        style={{
          width: `${baseWidth * 2.5}rem`,
        }}
        tabIndex={-1}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className="space-y-2"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
      autoFocus
    >
      {/* 当前选中的按键显示 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">已选按键：</span>
          <div className="flex gap-1">
            {value.length === 0 ? (
              <span className="text-sm text-muted-foreground">点击下方按键组合快捷键</span>
            ) : (
              value.map((key, index) => (
                <kbd
                  key={index}
                  className="px-2 py-1 text-xs font-semibold rounded-full bg-background border shadow-sm"
                >
                  {key}
                  {index < value.length - 1 && (
                    <span className="mx-1 text-muted-foreground">+</span>
                  )}
                </kbd>
              ))
            )}
          </div>
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* 功能键行 */}
      <div className="flex gap-1 px-1">
        {FUNCTION_KEYS.map((key) => renderKey(key))}
      </div>

      {/* 主键盘 */}
      <div className="space-y-1 px-1 bg-muted/30 rounded-lg p-2">
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center">
            {row.map((key) => renderKey(key))}
          </div>
        ))}
      </div>

      {/* 提示 */}
      <p className="text-xs text-muted-foreground text-center">
        也可以直接按物理键盘设置快捷键
      </p>
    </div>
  )
}
