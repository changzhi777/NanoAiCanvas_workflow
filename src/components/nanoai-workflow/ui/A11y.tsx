import { useState, useEffect } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';

interface A11yProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
  role?: string;
  live?: 'polite' | 'assertive' | 'off';
}

/**
 * 无障碍访问组件 - 为屏幕阅读器提供额外信息
 */
export function A11y({ children, label, description, role, live }: A11yProps) {
  return (
    <>
      {/* 可见的屏幕阅读器文本（隐藏但可访问） */}
      {(label || description) && (
        <VisuallyHidden>
          <div role={role} aria-live={live}>
            {label && <span id="a11y-label">{label}</span>}
            {description && <span id="a11y-description">{description}</span>}
          </div>
        </VisuallyHidden>
      )}

      {/* 主内容 */}
      <div
        role={role}
        aria-label={label}
        aria-describedby={description ? 'a11y-description' : undefined}
      >
        {children}
      </div>
    </>
  );
}

/**
 * 焦点管理 Hook
 */
export function useFocusManagement() {
  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[
      (focusableElements?.length || 0) - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    containerRef.current?.addEventListener('keydown', handleTabKey);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleTabKey);
    };
  };

  return { trapFocus };
}

/**
 * 键盘导航 Hook
 */
export function useKeyboardNavigation(
  items: Array<{ id: string; element?: HTMLElement }>,
  onSelect?: (id: string) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = items.findIndex(
        item => item.element === document.activeElement
      );

      // 向上导航
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        items[currentIndex - 1].element?.focus();
      }

      // 向下导航
      if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
        e.preventDefault();
        items[currentIndex + 1].element?.focus();
      }

      // 选择
      if ((e.key === 'Enter' || e.key === ' ') && currentIndex >= 0) {
        e.preventDefault();
        onSelect?.(items[currentIndex].id);
      }

      // Home 键
      if (e.key === 'Home' && items.length > 0) {
        e.preventDefault();
        items[0].element?.focus();
      }

      // End 键
      if (e.key === 'End' && items.length > 0) {
        e.preventDefault();
        items[items.length - 1].element?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, onSelect]);
}

/**
 * 跳转到主内容链接
 */
export function SkipToContent({ mainId = 'main-content' }: { mainId?: string }) {
  return (
    <a
      href={`#${mainId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:absolute focus:top-4 focus:left-4',
        'focus:z-[9999] focus:px-4 focus:py-2',
        'focus:bg-white focus:text-black',
        'focus:rounded-lg focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500'
      )}
    >
      跳转到主内容
    </a>
  );
}

/**
 * 高对比度模式检测
 */
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
}

/**
 * 减少动画模式检测
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
