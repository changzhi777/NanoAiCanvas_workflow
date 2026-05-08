import { useState, useEffect } from 'react'
import { getAssetsApi } from '@/lib/api/assets'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/nanoai-workflow/ui/Theme'
import { Image, Film, Music, X, Loader2 } from 'lucide-react'
import type { Attachment } from '@/lib/api/chat-api'

interface AssetPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (attachment: Attachment) => void
}

const TYPE_FILTERS = [
  { key: 'all', label: '全部', icon: null },
  { key: 'image', label: '图片', icon: Image },
  { key: 'video', label: '视频', icon: Film },
  { key: 'audio', label: '音频', icon: Music },
] as const

export function AssetPicker({ open, onClose, onSelect }: AssetPickerProps) {
  const { isDark } = useTheme()
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getAssetsApi()
      .then((res: any) => {
        const list = res.assets || []
        setAssets(list)
      })
      .catch(() => setAssets([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = filter === 'all'
    ? assets
    : assets.filter((a) => a.type === filter)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={cn(
          'w-[420px] max-h-[400px] rounded-xl shadow-xl flex flex-col overflow-hidden',
          isDark ? 'bg-slate-800' : 'bg-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-4 py-3 border-b', isDark ? 'border-white/10' : 'border-gray-200')}>
          <span className="text-sm font-medium">从资产库选择</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-1 px-4 py-2">
          {TYPE_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors',
                filter === key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-12">暂无资产</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    onSelect({
                      type: asset.type === 'storyboard_shot' ? 'image' : asset.type,
                      url: asset.url,
                      thumbnail_url: asset.thumbnail_url,
                      name: asset.name || '未命名',
                      prompt: asset.meta_data?.prompt || null,
                      source_asset_id: asset.id,
                    })
                    onClose()
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100',
                  )}
                >
                  {asset.type === 'image' || asset.type === 'storyboard_shot' ? (
                    <img
                      src={asset.thumbnail_url || asset.url}
                      className="w-full aspect-square rounded object-cover"
                    />
                  ) : asset.type === 'video' ? (
                    <div className="w-full aspect-square rounded bg-accent flex items-center justify-center">
                      <Film className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded bg-accent flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-[10px] truncate w-full text-center">{asset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
