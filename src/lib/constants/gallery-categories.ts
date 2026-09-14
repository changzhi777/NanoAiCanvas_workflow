// Gallery Categories Configuration
// 智能图库分类配置

import { Palette, User, Film, Sparkles } from 'lucide-react'

export interface GalleryCategory {
  id: string
  label: string
  icon: React.ReactNode
  keywords: string[]
  color: string
}

// 风格分类
export const STYLE_CATEGORIES: GalleryCategory[] = [
  {
    id: 'realistic',
    label: '写实',
    icon: '📷',
    keywords: ['realistic', '写实', '照片级', 'photorealistic', '真实'],
    color: 'blue',
  },
  {
    id: 'anime',
    label: '动漫',
    icon: '🎨',
    keywords: ['anime', '动漫', '动画', '二次元', 'manga', 'cartoon'],
    color: 'purple',
  },
  {
    id: 'oil-painting',
    label: '油画',
    icon: '🖼️',
    keywords: ['oil', '油画', '古典', 'classical', 'painting'],
    color: 'amber',
  },
  {
    id: 'watercolor',
    label: '水彩',
    icon: '💧',
    keywords: ['watercolor', '水彩', 'water colour', '清新'],
    color: 'cyan',
  },
  {
    id: 'sketch',
    label: '素描',
    icon: '✏️',
    keywords: ['sketch', '素描', '线稿', 'draft', 'pencil'],
    color: 'gray',
  },
  {
    id: 'cyberpunk',
    label: '赛博朋克',
    icon: '🤖',
    keywords: ['cyber', 'cyberpunk', '赛博', '科幻', 'future', 'tech'],
    color: 'pink',
  },
  {
    id: 'chinese-style',
    label: '国风',
    icon: '🏯',
    keywords: ['chinese', '国风', '中国风', 'traditional chinese', '古典'],
    color: 'red',
  },
]

// 主体分类
export const SUBJECT_CATEGORIES: GalleryCategory[] = [
  {
    id: 'portrait',
    label: '人像',
    icon: '👤',
    keywords: ['portrait', '人像', '人物', 'face', 'person', '角色', 'character'],
    color: 'rose',
  },
  {
    id: 'landscape',
    label: '风景',
    icon: '🏔️',
    keywords: ['landscape', '风景', '景色', 'scenery', 'nature', '自然', 'outdoor'],
    color: 'green',
  },
  {
    id: 'architecture',
    label: '建筑',
    icon: '🏛️',
    keywords: ['architecture', '建筑', 'building', 'interior', '室内', 'exterior', '室外'],
    color: 'orange',
  },
  {
    id: 'animal',
    label: '动物',
    icon: '🐾',
    keywords: ['animal', '动物', 'pet', 'cat', 'dog', 'wildlife'],
    color: 'yellow',
  },
  {
    id: 'product',
    label: '产品',
    icon: '📦',
    keywords: ['product', '产品', '商品', 'commercial', 'item'],
    color: 'indigo',
  },
  {
    id: 'abstract',
    label: '抽象',
    icon: '✨',
    keywords: ['abstract', '抽象', '艺术', 'artistic', 'concept'],
    color: 'violet',
  },
]

// 画幅比例分类
export const SIZE_CATEGORIES: GalleryCategory[] = [
  {
    id: 'square',
    label: '方形',
    icon: '⬜',
    keywords: ['1:1', 'square'],
    color: 'slate',
  },
  {
    id: 'portrait-ratio',
    label: '竖版',
    icon: '📱',
    keywords: ['2:3', '3:4', '9:16', 'portrait'],
    color: 'zinc',
  },
  {
    id: 'landscape-ratio',
    label: '横版',
    icon: '🖥️',
    keywords: ['3:2', '4:3', '16:9', 'landscape'],
    color: 'emerald',
  },
  {
    id: 'ultrawide',
    label: '超宽',
    icon: '🎬',
    keywords: ['21:9', 'ultrawide', 'cinematic'],
    color: 'gold',
  },
]

// 获取所有分类
export function getAllCategories(): GalleryCategory[] {
  return [
    ...STYLE_CATEGORIES,
    ...SUBJECT_CATEGORIES,
    ...SIZE_CATEGORIES,
  ]
}

// 根据图片获取分类
export function getCategoriesForAsset(asset: { prompt: string; enhancedPrompt?: string; params?: { size?: string; aspectRatio?: string } }): GalleryCategory[] {
  const categories: GalleryCategory[] = []
  const prompt = (asset.prompt + ' ' + (asset.enhancedPrompt || '')).toLowerCase()

  // 检查风格分类
  for (const cat of STYLE_CATEGORIES) {
    if (cat.keywords.some(kw => prompt.includes(kw.toLowerCase()))) {
      categories.push(cat)
      break
    }
  }

  // 检查主体分类
  for (const cat of SUBJECT_CATEGORIES) {
    if (cat.keywords.some(kw => prompt.includes(kw.toLowerCase()))) {
      categories.push(cat)
      break
    }
  }

  // 检查尺寸分类
  if (asset.params?.size) {
    const size = asset.params.size.toLowerCase()
    for (const cat of SIZE_CATEGORIES) {
      if (cat.keywords.some(kw => size.includes(kw.toLowerCase()))) {
        categories.push(cat)
        break
      }
    }
  }

  return categories.length > 1 ? categories : [{ id: 'other', label: '其他', icon: '📁', keywords: [], color: 'gray' }]
}

// 获取单个主分类
export function getMainCategory(asset: { prompt: string; enhancedPrompt?: string; params?: { size?: string; aspectRatio?: string } }): GalleryCategory | null {
  const categories = getCategoriesForAsset(asset)
  // 优先返回主体分类，其次是风格分类
  return categories.find(c => SUBJECT_CATEGORIES.includes(c)) || categories.find(c => STYLE_CATEGORIES.includes(c)) || null
}
