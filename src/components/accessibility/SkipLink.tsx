import { useI18n } from '@/hooks/useI18n'

/**
 * SkipLink 组件 - 允许键盘用户跳过导航直接到达主内容
 *
 * 可访问性最佳实践：
 * - 默认隐藏（sr-only）
 * - Focus 时显示（focus:not-sr-only）
 * - 高对比度和固定位置
 * - Tab 键首先聚焦此元素
 */
export function SkipLink() {
  const { t } = useI18n()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:transition-none"
      onClick={(e) => {
        e.preventDefault()
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          mainContent.focus()
          mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }}
    >
      {t('a11y.skipToMainContent') || '跳�转到主内容'}
    </a>
  )
}
