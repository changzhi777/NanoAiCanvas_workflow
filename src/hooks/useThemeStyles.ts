import { useMemo } from 'react';
import { useTheme } from '@/components/nanoai-workflow/ui/Theme';

/**
 * 主题样式 Hook - 统一管理深色/浅色主题的样式类名
 * 避免在组件中重复 isDark ? '...' : '...' 判断
 */
export function useThemeStyles() {
  const { isDark } = useTheme();

  return useMemo(() => ({
    // 背景样式
    background: isDark
      ? 'bg-slate-900/80 border-white/10'
      : 'bg-white border-gray-200',

    backgroundSecondary: isDark
      ? 'bg-slate-800/50 border-white/5'
      : 'bg-gray-50 border-gray-200',

    // 文本颜色
    textPrimary: isDark ? 'text-slate-200' : 'text-gray-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-gray-600',
    textTertiary: isDark ? 'text-slate-500' : 'text-gray-500',

    // 输入框样式
    input: isDark
      ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500 focus:ring-blue-500'
      : '',

    // 按钮样式
    buttonOutline: isDark
      ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
      : 'border-gray-300 text-gray-700 hover:bg-gray-100',

    buttonGhost: isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100',

    // 渐变色
    gradientText: isDark
      ? 'from-blue-400 to-cyan-400'
      : 'from-blue-600 to-cyan-600',

    // 状态颜色
    success: isDark ? 'text-green-400' : 'text-green-600',
    error: isDark ? 'text-red-400' : 'text-red-600',
    warning: isDark ? 'text-yellow-400' : 'text-yellow-600',

    // 边框
    border: isDark ? 'border-white/10' : 'border-gray-200',
    divider: isDark ? 'bg-white/10' : 'bg-gray-200',

    // 卡片
    card: isDark
      ? 'bg-slate-700/30 border-white/5'
      : 'bg-white border-gray-200',
  }), [isDark]);
}
