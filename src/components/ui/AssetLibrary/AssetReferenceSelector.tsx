'use client'

import { useState, useCallback } from 'react'
import { Image, Search, X, Check, ChevronDown, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAssetLibStore } from '@/stores/remoteStore'
import { type Asset } from '@/lib/api/client'

interface AssetReferenceSelectorProps {
  selectedAssets: string[]
  onAssetsChange: (assetIds: string[]) => void
  maxSelection?: number
  acceptedTypes?: ('IMAGE' | 'VIDEO' | 'AUDIO')[]
}

const CATEGORIES = [
  { id: 'REFERENCE', name: '参考图' },
  { id: 'CHARACTER', name: '角色' },
  { id: 'SCENE', name: '场景' },
  { id: 'STORYBOARD', name: '分镜' },
  { id: 'GENERAL', name: '通用' },
]

export function AssetReferenceSelector({
  selectedAssets,
  onAssetsChange,
  maxSelection = 4,
  acceptedTypes = ['IMAGE'],
}: AssetReferenceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const { categories: customCategories } = useAssetLibStore()
  const allCategories = [...CATEGORIES, ...customCategories.filter(c => !CATEGORIES.find(s => s.id === c.id))]

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  // 加载资产
  const loadAssets = useCallback(async () => {
    setLoading(true)
    // 模拟从资产库加载
    setTimeout(() => {
      setAssets([
        { id: '1', name: '参考图1', url: '', type: 'IMAGE', category: 'REFERENCE', tags: [], is_starred: false, meta: {}, created_at: '' },
        { id: '2', name: '参考图2', url: '', type: 'IMAGE', category: 'REFERENCE', tags: [], is_starred: false, meta: {}, created_at: '' },
        { id: '3', name: '角色参考1', url: '', type: 'IMAGE', category: 'CHARACTER', tags: [], is_starred: false, meta: {}, created_at: '' },
        { id: '4', name: '场景参考1', url: '', type: 'IMAGE', category: 'SCENE', tags: [], is_starred: false, meta: {}, created_at: '' },
      ])
      setLoading(false)
    }, 300)
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      loadAssets()
    }
  }

  const toggleAsset = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      onAssetsChange(selectedAssets.filter(id => id !== assetId))
    } else if (selectedAssets.length < maxSelection) {
      onAssetsChange([...selectedAssets, assetId])
    }
  }

  const filteredAssets = assets.filter(asset => {
    const matchCategory = selectedCategory === 'ALL' || asset.category === selectedCategory
    const matchSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchType = acceptedTypes.includes(asset.type as any)
    return matchCategory && matchSearch && matchType
  })

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Image className="w-3 h-3" />
        参考图选择
        <span className="text-[10px] text-muted-foreground/60">（最多{maxSelection}张）</span>
      </label>

      {/* 已选资产 */}
      {selectedAssets.length > 0 && (
        <div className="flex gap-1 flex-wrap p-2 bg-black/20 rounded">
          {selectedAssets.map((assetId, index) => (
            <div
              key={assetId}
              className="relative w-10 h-10 rounded border border-primary/50 overflow-hidden group"
            >
              <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                {index + 1}
              </div>
              <button
                onClick={() => toggleAsset(assetId)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 选择器按钮 */}
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-between text-xs",
              selectedAssets.length > 0 && "border-primary/50"
            )}
          >
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {selectedAssets.length > 0 ? `已选择 ${selectedAssets.length} 张参考图` : '添加参考图'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-hidden flex flex-col">
          {/* 搜索框 */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="搜索资产..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            <Button
              variant={selectedCategory === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory('ALL')}
            >
              全部
            </Button>
            {allCategories.slice(0, 5).map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* 资产列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                暂无资产
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {filteredAssets.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={cn(
                      "relative aspect-square rounded border overflow-hidden transition-colors",
                      selectedAssets.includes(asset.id)
                        ? "border-primary ring-1 ring-primary"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <div className="w-full h-full bg-muted flex items-center justify-center text-lg">
                      🖼️
                    </div>
                    {selectedAssets.includes(asset.id) && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 确认按钮 */}
          <div className="p-2 border-t">
            <Button size="sm" className="w-full text-xs" onClick={() => setIsOpen(false)}>
              确定 ({selectedAssets.length}/{maxSelection})
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default AssetReferenceSelector