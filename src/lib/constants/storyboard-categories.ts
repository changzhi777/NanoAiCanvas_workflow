/**
 * 资产库分类常量
 */

import type { StoryboardAsset } from '@/types'

export interface StoryboardCategory {
  id: string
  label: string
  icon: string
  filter: (asset: StoryboardAsset) => boolean
}

// 资产类型分类
export const ASSET_TYPE_CATEGORIES: StoryboardCategory[] = [
  {
    id: 'storyboard',
    label: '故事板',
    icon: '🎬',
    filter: () => true, // 当前页面仅展示故事板，始终返回true
  },
  // 未来可扩展其他类型：
  // { id: 'character', label: '角色设计', icon: '👤', filter: (asset) => asset.type === 'character' },
  // { id: 'audio', label: '音频', icon: '🎵', filter: (asset) => asset.type === 'audio' },
]

// 状态分类
export const STATUS_CATEGORIES: StoryboardCategory[] = [
  {
    id: 'completed',
    label: '已完成',
    icon: '✅',
    filter: (asset) => asset.script && asset.storyboardImages?.length > 0,
  },
  {
    id: 'partial',
    label: '部分完成',
    icon: '🔄',
    filter: (asset) => asset.script && (!asset.storyboardImages || asset.storyboardImages.length === 0),
  },
  {
    id: 'failed',
    label: '生成失败',
    icon: '❌',
    filter: (asset) => !asset.script,
  },
]

// 风格分类（从样式选项提取）
export const STYLE_CATEGORIES: StoryboardCategory[] = [
  {
    id: 'anime',
    label: '动漫风格',
    icon: '🎨',
    filter: (asset) => asset.script?.style === 'anime',
  },
  {
    id: 'realistic',
    label: '写实风格',
    icon: '📷',
    filter: (asset) => asset.script?.style === 'realistic',
  },
  {
    id: 'chinese',
    label: '国风',
    icon: '🏮',
    filter: (asset) => asset.script?.style === 'chinese',
  },
  {
    id: 'watercolor',
    label: '水彩',
    icon: '💧',
    filter: (asset) => asset.script?.style === 'watercolor',
  },
  {
    id: 'oil_painting',
    label: '油画',
    icon: '🖼️',
    filter: (asset) => asset.script?.style === 'oil_painting',
  },
  {
    id: 'cyberpunk',
    label: '赛博朋克',
    icon: '🌆',
    filter: (asset) => asset.script?.style === 'cyberpunk',
  },
  {
    id: 'sketch',
    label: '素描',
    icon: '✏️',
    filter: (asset) => asset.script?.style === 'sketch',
  },
  {
    id: '3d',
    label: '3D渲染',
    icon: '🎮',
    filter: (asset) => asset.script?.style === '3d',
  },
]

// 场景数量分类
export const SCENE_COUNT_CATEGORIES: StoryboardCategory[] = [
  {
    id: 'short',
    label: '短篇 (1-3镜)',
    icon: '📄',
    filter: (asset) => asset.script?.scenes?.length >= 1 && asset.script?.scenes?.length <= 3,
  },
  {
    id: 'medium',
    label: '中篇 (4-6镜)',
    icon: '📑',
    filter: (asset) => asset.script?.scenes?.length >= 4 && asset.script?.scenes?.length <= 6,
  },
  {
    id: 'long',
    label: '长篇 (7+镜)',
    icon: '📚',
    filter: (asset) => asset.script?.scenes?.length >= 7,
  },
]

// 是否有音频
export const AUDIO_CATEGORIES: StoryboardCategory[] = [
  {
    id: 'with_audio',
    label: '含音频',
    icon: '🔊',
    filter: (asset) => Boolean(asset.dialogueAudios && asset.dialogueAudios.length > 0),
  },
  {
    id: 'no_audio',
    label: '无音频',
    icon: '🔇',
    filter: (asset) => !asset.dialogueAudios || asset.dialogueAudios.length === 0,
  },
]

// 获取资产适用的分类
export function getCategoriesForAsset(asset: StoryboardAsset): StoryboardCategory[] {
  const categories: StoryboardCategory[] = []

  // 状态分类
  STATUS_CATEGORIES.forEach(cat => {
    if (cat.filter(asset)) categories.push(cat)
  })

  // 风格分类
  STYLE_CATEGORIES.forEach(cat => {
    if (cat.filter(asset)) categories.push(cat)
  })

  // 场景数量分类
  SCENE_COUNT_CATEGORIES.forEach(cat => {
    if (cat.filter(asset)) categories.push(cat)
  })

  // 音频分类
  AUDIO_CATEGORIES.forEach(cat => {
    if (cat.filter(asset)) categories.push(cat)
  })

  return categories
}

// 获取所有分类组
export function getAllCategoryGroups() {
  return [
    { title: '资产类型', categories: ASSET_TYPE_CATEGORIES },
    { title: '生成状态', categories: STATUS_CATEGORIES },
    { title: '艺术风格', categories: STYLE_CATEGORIES },
    { title: '内容规模', categories: SCENE_COUNT_CATEGORIES },
    { title: '音频状态', categories: AUDIO_CATEGORIES },
  ]
}
