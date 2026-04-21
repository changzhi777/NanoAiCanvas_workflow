/**
 * StoryboardPanel.tsx - 场景卡片组件
 *
 * 功能：展示单个场景的图片和信息
 * - 场景图片展示（16:9比例）
 * - 图片加载状态和淡入动画
 * - 悬停操作按钮（放大、下载）
 * - 场景信息展示（镜头类型、时长、运镜）
 * - 对白摘要和旁白
 *
 * 核心特性：
 * - 图片懒加载和onLoad事件
 * - 悬停时显示操作按钮
 * - 支持图片放大查看和下载
 * - 响应式布局（2/3/4列网格）
 *
 * 使用场景：StoryboardChartTab、StoryboardAssetPreview
 * 样式主题：深色卡片 + 紫色强调
 *
 * @author BB小子 🤙
 * @created 2026-04-20
 */

'use client'

import { Download, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import type { StoryboardScene } from '@/stores/storyboardStore'

interface StoryboardPanelProps {
  scene: StoryboardScene
  sceneNumber: number
  imageUrl?: string
  onDownload?: (url: string, filename: string) => void
  onZoom?: (imageUrl: string) => void
  showDetails?: boolean
}

export function StoryboardPanel({
  scene,
  sceneNumber,
  imageUrl,
  onDownload,
  onZoom,
  showDetails = true,
}: StoryboardPanelProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // 生成对白摘要
  const dialogueSummary = scene.dialogues
    .slice(0, 2)
    .map((d) => `${d.characterName}：${d.text.substring(0, 20)}...`)
    .join(' | ')

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden group">
      {/* 图片区域 */}
      <div className="aspect-video bg-white/5 relative">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`场景 ${sceneNumber}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />

            {/* 悬停操作按钮 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onZoom && (
                <button
                  onClick={() => onZoom(imageUrl)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="放大查看"
                >
                  <ZoomIn className="w-5 h-5 text-white" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(imageUrl, `scene-${sceneNumber}.png`)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="下载图片"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              )}
            </div>

            {/* 加载占位 */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{sceneNumber}</div>
              <div className="text-xs">等待生成</div>
            </div>
          </div>
        )}

        {/* 场景编号徽章 */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
          镜头 {sceneNumber}
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-2">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">{scene.shotType}</span>
            <span className="text-xs text-muted-foreground">{scene.duration}</span>
          </div>
          <span className="text-xs text-muted-foreground">{scene.camera}</span>
        </div>

        {/* 画面描述 */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
          {scene.description}
        </p>

        {/* 对白摘要 */}
        {dialogueSummary && (
          <p className="text-[10px] text-muted-foreground/70 line-clamp-1 italic">
            {dialogueSummary}
          </p>
        )}

        {/* 旁白 */}
        {scene.narrator && (
          <p className="text-[10px] text-cyan-400/70 line-clamp-1 mt-1">
            【旁白】{scene.narrator}
          </p>
        )}
      </div>
    </div>
  )
}
