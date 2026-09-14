/**
 * 默认快捷键配置
 */

import type { ShortcutCategory } from '@/types/shortcuts'

// 系统保留快捷键列表（不可自定义）
export const SYSTEM_RESERVED_KEYS: string[][] = [
  ['⌘', 'R'], // 刷新页面
  ['⌘', 'W'], // 关闭标签页
  ['⌘', 'Q'], // 退出应用
  ['⌘', 'T'], // 新建标签页
  ['⌘', 'N'], // 新建窗口
  ['⌘', '⇧', 'N'], // 隐身窗口
  ['⌘', 'L'], // 聚焦地址栏
  ['⌘', 'D'], // 添加书签
  ['⌘', 'J'], // 下载
  ['⌘', 'U'], // 查看源代码
  ['⌘', 'P'], // 打印
  ['⌘', '⇧', 'T'], // 重新打开关闭的标签页
]

// 浏览器冲突快捷键列表（警告但可覆盖）
export const BROWSER_CONFLICT_KEYS: string[][] = [
  ['⌘', 'C'], // 复制（系统功能）
  ['⌘', 'V'], // 粘贴（系统功能）
  ['⌘', 'X'], // 剪切（系统功能）
  ['⌘', 'A'], // 全选（系统功能）
  ['⌘', 'F'], // 查找（系统功能）
  ['⌘', 'G'], // 查找下一个（系统功能）
  ['⌘', 'S'], // 保存（系统功能）
  ['⌘', 'Z'], // 撤销（系统功能）
  ['⌘', '⇧', 'Z'], // 重做（系统功能）
]

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutCategory[] = [
  {
    title: '基础操作',
    description: '常用操作快捷键',
    shortcuts: [
      {
        id: 'add-node',
        defaultKeys: ['N'],
        currentKeys: ['N'],
        description: '添加新节点',
        category: 'basic',
      },
      {
        id: 'save-canvas',
        defaultKeys: ['⌘', 'S'],
        currentKeys: ['⌘', 'S'],
        description: '保存画布',
        category: 'basic',
        important: true,
      },
      {
        id: 'undo',
        defaultKeys: ['⌘', 'Z'],
        currentKeys: ['⌘', 'Z'],
        description: '撤销',
        category: 'basic',
        important: true,
      },
      {
        id: 'redo',
        defaultKeys: ['⌘', '⇧', 'Z'],
        currentKeys: ['⌘', '⇧', 'Z'],
        description: '重做',
        category: 'basic',
      },
      {
        id: 'delete',
        defaultKeys: ['⌫'],
        currentKeys: ['⌫'],
        description: '删除选中元素',
        category: 'basic',
        important: true,
      },
      {
        id: 'toggle-shortcuts',
        defaultKeys: ['⌘', 'F1'],
        currentKeys: ['⌘', 'F1'],
        description: '显示/隐藏快捷键面板',
        category: 'basic',
        important: true,
      },
    ],
  },
  {
    title: '视图控制',
    description: '画布缩放和平移',
    shortcuts: [
      {
        id: 'zoom-in',
        defaultKeys: ['⌘', '+'],
        currentKeys: ['⌘', '+'],
        description: '放大视图',
        category: 'view',
      },
      {
        id: 'zoom-out',
        defaultKeys: ['⌘', '-'],
        currentKeys: ['⌘', '-'],
        description: '缩小视图',
        category: 'view',
      },
      {
        id: 'fit-view',
        defaultKeys: ['⌘', '0'],
        currentKeys: ['⌘', '0'],
        description: '适应视图',
        category: 'view',
      },
      {
        id: 'pan-canvas',
        defaultKeys: ['空格', '拖拽'],
        currentKeys: ['空格', '拖拽'],
        description: '平移画布',
        category: 'view',
      },
    ],
  },
  {
    title: '编辑操作',
    description: '节点编辑快捷键',
    shortcuts: [
      {
        id: 'edit-node',
        defaultKeys: ['Enter'],
        currentKeys: ['Enter'],
        description: '编辑选中节点',
        category: 'edit',
      },
      {
        id: 'copy',
        defaultKeys: ['⌘', 'C'],
        currentKeys: ['⌘', 'C'],
        description: '复制选中节点',
        category: 'edit',
        important: true,
      },
      {
        id: 'paste',
        defaultKeys: ['⌘', 'V'],
        currentKeys: ['⌘', 'V'],
        description: '粘贴节点',
        category: 'edit',
        important: true,
      },
      {
        id: 'duplicate',
        defaultKeys: ['⌘', 'D'],
        currentKeys: ['⌘', 'D'],
        description: '快速复制节点',
        category: 'edit',
      },
    ],
  },
  {
    title: '面板控制',
    description: '界面面板开关',
    shortcuts: [
      {
        id: 'toggle-properties',
        defaultKeys: ['F1'],
        currentKeys: ['F1'],
        description: '显示/隐藏属性面板',
        category: 'panel',
        important: true,
      },
      {
        id: 'toggle-templates',
        defaultKeys: ['F2'],
        currentKeys: ['F2'],
        description: '显示/隐藏模板面板',
        category: 'panel',
        important: true,
      },
      {
        id: 'toggle-toolbar',
        defaultKeys: ['⌘', 'B'],
        currentKeys: ['⌘', 'B'],
        description: '显示/隐藏工具栏',
        category: 'panel',
      },
    ],
  },
  {
    title: '导航操作',
    description: '节点导航快捷键',
    shortcuts: [
      {
        id: 'search',
        defaultKeys: ['⌘', 'F'],
        currentKeys: ['⌘', 'F'],
        description: '搜索节点',
        category: 'nav',
      },
      {
        id: 'next-node',
        defaultKeys: ['Tab'],
        currentKeys: ['Tab'],
        description: '下一个节点',
        category: 'nav',
      },
      {
        id: 'prev-node',
        defaultKeys: ['⇧', 'Tab'],
        currentKeys: ['⇧', 'Tab'],
        description: '上一个节点',
        category: 'nav',
      },
      {
        id: 'escape',
        defaultKeys: ['Esc'],
        currentKeys: ['Esc'],
        description: '取消选择/退出编辑',
        category: 'nav',
        important: true,
      },
    ],
  },
]

// 替代快捷键建议
export function getSuggestedAlternates(currentKeys: string[]): string[][] {
  const alternatives: string[][] = []

  // 如果是 ⌘+单键，建议 ⌘+⇧+单键
  if (currentKeys.length === 2 && currentKeys[0] === '⌘') {
    alternatives.push(['⌘', '⇧', currentKeys[1]])
  }

  // 如果是功能键，建议其他功能键
  const fnKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
  const currentFn = currentKeys.find(k => fnKeys.includes(k))
  if (currentFn) {
    const currentIndex = fnKeys.indexOf(currentFn)
    if (currentIndex > 0) {
      alternatives.push([fnKeys[currentIndex - 1]])
    }
    if (currentIndex < fnKeys.length - 1) {
      alternatives.push([fnKeys[currentIndex + 1]])
    }
  }

  // 默认建议
  if (alternatives.length === 0) {
    alternatives.push(['⌥', ...currentKeys])
  }

  return alternatives
}
