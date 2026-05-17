'use client'

/**
 * 团队资产导入组件
 * 选择团队 → 选择个人资产 → 确认导入
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Check, Loader2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tvcProjectsApi } from '@/lib/api/tvc-projects-api'
import { useToast } from '@/hooks/useToast'
import { assets } from '@/lib/api/client'
import type { Asset } from '@/lib/api/client'

interface TeamAssetImportProps {
  teams: { id: number; name: string }[]
  onImported?: () => void
  className?: string
}

export function TeamAssetImport({ teams, onImported, className }: TeamAssetImportProps) {
  const { toast } = useToast()
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)

  const [personalAssets, setPersonalAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)

  const loadPersonalAssets = useCallback(async () => {
    setIsLoadingAssets(true)
    try {
      const token = localStorage.getItem('nanoai_token')
      if (!token) return
      const data = await assets.list(token)
      setPersonalAssets(data.items || data || [])
    } catch {
      // 静默
    } finally {
      setIsLoadingAssets(false)
    }
  }, [])

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeam(teamId)
    setSelectedAssets(new Set())
    loadPersonalAssets()
  }

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  const handleImport = async () => {
    if (!selectedTeam || selectedAssets.size === 0) return
    setIsImporting(true)
    try {
      const result = await tvcProjectsApi.importToTeam(selectedTeam, Array.from(selectedAssets))
      toast.success(`成功导入 ${result.imported} 个资产${result.skipped > 0 ? `，${result.skipped} 个已存在` : ''}`)
      onImported?.()
      setSelectedAssets(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 团队选择 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />
        <span>选择团队</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {teams.map(team => (
          <button
            key={team.id}
            onClick={() => handleSelectTeam(team.id)}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors',
              selectedTeam === team.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10',
            )}
          >
            {team.name}
          </button>
        ))}
        {teams.length === 0 && (
          <span className="text-xs text-muted-foreground">暂无团队</span>
        )}
      </div>

      {/* 资产选择 */}
      {selectedTeam && (
        <>
          <div className="text-xs text-muted-foreground">选择要导入的个人资产：</div>
          {isLoadingAssets ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              加载资产中...
            </div>
          ) : personalAssets.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">暂无可导入资产</div>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {personalAssets.map(asset => (
                <label
                  key={asset.id}
                  className={cn(
                    'flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs',
                    selectedAssets.has(asset.id) ? 'bg-primary/10 text-primary' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssets.has(asset.id)}
                    onChange={() => toggleAsset(asset.id)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                    selectedAssets.has(asset.id) ? 'bg-primary border-primary' : 'border-white/20',
                  )}>
                    {selectedAssets.has(asset.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className="truncate flex-1">{asset.name || asset.url}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{asset.type}</span>
                </label>
              ))}
            </div>
          )}

          <Button
            size="sm"
            onClick={handleImport}
            disabled={isImporting || selectedAssets.size === 0}
            className="w-full h-7 text-xs gap-1"
          >
            {isImporting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            导入 {selectedAssets.size > 0 ? `(${selectedAssets.size})` : ''}
          </Button>
        </>
      )}
    </div>
  )
}
