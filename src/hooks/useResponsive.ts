import { useState, useEffect } from 'react';

export interface Breakpoint {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
}

/**
 * 响应式断点 Hook
 */
export function useBreakpoints(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeDesktop: false,
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024 && width < 1536,
        isLargeDesktop: width >= 1536,
      });
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * 触摸设备检测 Hook
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
  }, []);

  return isTouch;
}

/**
 * 屏幕方向检测 Hook
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}

/**
 * 屏幕阅读器检测 Hook
 */
export function useScreenReader(): boolean {
  const [isScreenReader, setIsScreenReader] = useState(false);

  useEffect(() => {
    // 检测屏幕阅读器
    const checkScreenReader = () => {
      // 检测常见的屏幕阅读器
      const hasAriaHidden = document.body.getAttribute('aria-hidden') === 'true';
      const hasSrOnly = document.querySelector('.sr-only') !== null;

      setIsScreenReader(hasAriaHidden || hasSrOnly);
    };

    checkScreenReader();

    // 监听 aria-hidden 属性变化
    const observer = new MutationObserver(checkScreenReader);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
    });

    return () => observer.disconnect();
  }, []);

  return isScreenReader;
}

/**
 * 安全区域检测 Hook（用于刘海屏适配）
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseFloat(style.getPropertyValue('safe-area-inset-top')) || 0,
        right: parseFloat(style.getPropertyValue('safe-area-inset-right')) || 0,
        bottom: parseFloat(style.getPropertyValue('safe-area-inset-bottom')) || 0,
        left: parseFloat(style.getPropertyValue('safe-area-inset-left')) || 0,
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

/**
 * 设备像素比检测 Hook
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);

  useEffect(() => {
    const updateDpr = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener('resize', updateDpr);
    return () => window.removeEventListener('resize', updateDpr);
  }, []);

  return dpr;
}

/**
 * 网络状态检测 Hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<'slow-2g' | '2g' | '3g' | '4g'>('4g');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleConnectionChange = () => {
      // @ts-ignore - connection API experimental
      const connection = (navigator as any).connection;
      if (connection?.effectiveType) {
        setEffectiveType(connection.effectiveType);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // @ts-ignore - connection API experimental
    const connection = (navigator as any).connection;
    if (connection?.addEventListener) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection?.removeEventListener) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, effectiveType };
}

/**
 * 触摸手势 Hook
 */
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const deltaX = touchEnd.x - touchStart.x;
      const deltaY = touchEnd.y - touchStart.y;

      // 水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > threshold) {
          onSwipeRight?.();
        } else if (deltaX < -threshold) {
          onSwipeLeft?.();
        }
      }
      // 垂直滑动
      else {
        if (deltaY > threshold) {
          onSwipeDown?.();
        } else if (deltaY < -threshold) {
          onSwipeUp?.();
        }
      }

      setTouchStart(null);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}
