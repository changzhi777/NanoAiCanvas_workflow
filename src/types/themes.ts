// 节点主题系统类型定义
export interface NodeTheme {
  id: string
  name: string
  description?: string
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    border: string
  }
  icon?: string
  layout?: 'default' | 'minimal' | 'detailed'
  customCSS?: string
}

// 预设主题
export const presetThemes: Record<string, NodeTheme> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: '深海主题 - 蓝色系',
    colors: {
      primary: 'oklch(0.6 0.2 220)',
      secondary: 'oklch(0.7 0.15 200)',
      background: 'oklch(0.2 0.05 220 / 0.8)',
      text: 'oklch(0.95 0 0)',
      border: 'oklch(0.3 0.1 220)',
    },
    icon: 'waves',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: '日落主题 - 橙色系',
    colors: {
      primary: 'oklch(0.65 0.2 30)',
      secondary: 'oklch(0.7 0.15 40)',
      background: 'oklch(0.25 0.08 35 / 0.8)',
      text: 'oklch(0.95 0 0)',
      border: 'oklch(0.35 0.12 35)',
    },
    icon: 'sun',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: '森林主题 - 绿色系',
    colors: {
      primary: 'oklch(0.6 0.2 142)',
      secondary: 'oklch(0.7 0.15 130)',
      background: 'oklch(0.2 0.05 142 / 0.8)',
      text: 'oklch(0.95 0 0)',
      border: 'oklch(0.3 0.1 142)',
    },
    icon: 'leaf',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: '午夜主题 - 紫色系',
    colors: {
      primary: 'oklch(0.6 0.2 280)',
      secondary: 'oklch(0.7 0.15 260)',
      background: 'oklch(0.2 0.05 280 / 0.8)',
      text: 'oklch(0.95 0 0)',
      border: 'oklch(0.3 0.1 280)',
    },
    icon: 'moon',
  },
}
