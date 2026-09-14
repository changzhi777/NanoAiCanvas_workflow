'use client'

import { Images, User, Volume2, Clock } from 'lucide-react'
import type { StoryboardAsset } from '@/types'

interface StoryboardAssetCardProps {
  asset: StoryboardAsset
  isSelected: boolean
  onClick: () => void
}

export function StoryboardAssetCard({ asset, isSelected, onClick }: StoryboardAssetCardProps) {
  // 获取第一个场景图作为封面
  const coverImage = asset.storyboardImages?.[0]

  // 统计信息
  const sceneCount = asset.script?.scenes?.length || 0
  const characterCount = asset.script?.characters?.length || 0
  const audioCount = asset.dialogueAudios?.length || 0
  const hasAudio = audioCount > 0

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-primary'
          : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      {/* 封面图 */}
      <div className="aspect-video bg-white/5 relative">
        {coverImage ? (
          <img
            src={coverImage}
            alt={asset.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Images className="w-12 h-12 text-muted-foreground opacity-30" />
          </div>
        )}

        {/* 悬停信息遮罩 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-xs text-white/90 line-clamp-1 font-medium">{asset.title}</p>
        </div>

        {/* 状态指示 */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {hasAudio && (
            <span className="p-1 bg-green-500/80 rounded text-[10px] text-white">
              <Volume2 className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* 场景数量徽章 */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 rounded text-[10px] text-white font-medium">
          {sceneCount}镜
        </div>
      </div>

      {/* 展开详情 */}
      <div className="p-2 bg-white/5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Images className="w-3 h-3" />
              {sceneCount}
            </span>
            <span className="flex items-center gap-0.5">
              <User className="w-3 h-3" />
              {characterCount}
            </span>
            {hasAudio && (
              <span className="flex items-center gap-0.5">
                <Volume2 className="w-3 h-3" />
                {audioCount}
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {new Date(asset.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* 剧本梗概 */}
        {asset.synopsis && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{asset.synopsis}</p>
        )}
      </div>
    </div>
  )
}
