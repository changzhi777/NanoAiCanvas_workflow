import { useState, useEffect } from 'react'

interface LayoutConfig {
  columns: number
  nodeWidth: number
  gap: number
  padding: number
}

export const useWindowSizeAdaptive = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // 添加防抖
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 200)
    }

    window.addEventListener('resize', debouncedResize)
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])

  const layoutConfig: LayoutConfig = (() => {
    if (windowSize.width < 768) {
      // 移动端：单列布局
      return {
        columns: 1,
        nodeWidth: 280,
        gap: 16,
        padding: 12,
      }
    } else if (windowSize.width < 1024) {
      // 平板：2列布局
      return {
        columns: 2,
        nodeWidth: 320,
        gap: 20,
        padding: 16,
      }
    } else if (windowSize.width < 1440) {
      // 桌面：3列布局
      return {
        columns: 3,
        nodeWidth: 360,
        gap: 24,
        padding: 20,
      }
    } else {
      // 大屏：4列布局
      return {
        columns: 4,
        nodeWidth: 400,
        gap: 32,
        padding: 24,
      }
    }
  })()

  return {
    windowSize,
    layoutConfig,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
  }
}
