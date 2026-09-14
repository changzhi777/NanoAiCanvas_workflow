import { useMemo } from 'react'

interface ZoomConfig {
  showTitle: boolean
  showDescription: boolean
  showMetadata: boolean
  showTags: boolean
  showIcon: boolean
  showStatus: boolean
  padding: number
  fontSize: number
  descriptionMaxLines: number
}

export const useZoomAdaptive = (zoom: number): ZoomConfig => {
  return useMemo(() => {
    if (zoom < 0.5) {
      // 极小缩放：仅显示图标和状态
      return {
        showTitle: false,
        showDescription: false,
        showMetadata: false,
        showTags: false,
        showIcon: true,
        showStatus: true,
        padding: 6,
        fontSize: 10,
        descriptionMaxLines: 0,
      }
    } else if (zoom < 0.8) {
      // 小缩放：显示图标、标题和状态
      return {
        showTitle: true,
        showDescription: false,
        showMetadata: false,
        showTags: false,
        showIcon: true,
        showStatus: true,
        padding: 8,
        fontSize: 11,
        descriptionMaxLines: 0,
      }
    } else if (zoom < 1.2) {
      // 标准缩放：完整显示（当前）
      return {
        showTitle: true,
        showDescription: true,
        showMetadata: true,
        showTags: true,
        showIcon: true,
        showStatus: true,
        padding: 12,
        fontSize: 14,
        descriptionMaxLines: 2,
      }
    } else {
      // 大缩放：显示额外信息
      return {
        showTitle: true,
        showDescription: true,
        showMetadata: true,
        showTags: true,
        showIcon: true,
        showStatus: true,
        padding: 16,
        fontSize: 16,
        descriptionMaxLines: 3,
      }
    }
  }, [zoom])
}
