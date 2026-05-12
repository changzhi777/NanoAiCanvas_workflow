import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useSyncStore } from '../../../stores/remoteStore';
import { assets, teams, type Asset, type Team } from '../../../lib/api/client';
import { assetCache } from '../../../lib/db/AssetCache';
import { getDB } from '../../../lib/db/schema';
import {
  Search, Grid3X3, List, Star, Trash2, RefreshCw,
  Check, Upload, X, Download,
  Users, User, Share2, Image, Video, Music, FileText, Film, Clapperboard
} from 'lucide-react';
import { Button } from '../button';
import { Input } from '../input';
import { Dialog, DialogHeader, DialogTitle, DialogPortal } from '../dialog';
import AssetPreview from './AssetPreview';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

// 6 大类定义
const ASSET_CATEGORIES = [
  { id: 'all', label: '全部', icon: null },
  { id: 'image', label: '图片', icon: Image },
  { id: 'video', label: '视频', icon: Video },
  { id: 'audio', label: '音频', icon: Music },
  { id: 'storyboard_image', label: '分镜图', icon: Clapperboard },
  { id: 'storyboard_video', label: '分镜视频', icon: Film },
  { id: 'tvc', label: 'TVC宣传片', icon: Film },
  { id: 'text', label: '文本', icon: FileText },
] as const;

const TYPE_ICONS: Record<string, string> = {
  image: '🖼️', video: '🎬', audio: '🎵', text: '📝',
  storyboard_image: '🎬', storyboard_video: '🎞️', tvc: '📺',
};

interface AssetLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  selectionMode?: boolean;
}

const AssetLibraryDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-6xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg flex flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
AssetLibraryDialogContent.displayName = "AssetLibraryDialogContent"

// 截断提示词用于卡片展示
function truncatePrompt(text: string | undefined | null, maxLen = 60): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export default function AssetLibraryPanel({
  open,
  onClose,
  onSelectAsset,
  selectionMode = false,
}: AssetLibraryPanelProps) {
  const token = useAuthStore((s) => s.token);
  const isOnline = useSyncStore((s) => s.isOnline);

  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assetTab, setAssetTab] = useState<'personal' | 'team'>('personal');
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [shareMenuAssetId, setShareMenuAssetId] = useState<string | null>(null);

  // 加载数据
  const loadAssets = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      if (assetTab === 'team' && selectedTeamId && isOnline) {
        const result = await assets.listTeamAssets(selectedTeamId, token, {
          page,
          page_size: pageSize,
          type_filter: categoryFilter === 'all' ? undefined : categoryFilter,
        });
        setAssetsList(result.items);
        setTotal(result.total);
        setLoading(false);
        return;
      }

      if (isOnline) {
        const result = await assets.list(token, {
          page,
          page_size: pageSize,
          type_filter: categoryFilter === 'all' ? undefined : categoryFilter,
          starred: starredOnly || undefined,
          search: searchQuery || undefined,
        });
        setAssetsList(result.items);
        setTotal(result.total);

        for (const asset of result.items) {
          const cached = await assetCache.get(asset.id);
          if (!cached) {
            try {
              const response = await fetch(asset.url);
              if (response.ok) {
                const blob = await response.blob();
                await assetCache.cache(asset as any, blob);
              }
            } catch { /* ignore */ }
          }
        }
      } else {
        const db = await getDB();
        let localAssets = await db.getAll('assets');
        if (categoryFilter !== 'all') {
          localAssets = localAssets.filter((a: Asset) =>
            a.type?.toLowerCase() === categoryFilter || a.category === categoryFilter
          );
        }
        if (starredOnly) localAssets = localAssets.filter((a: Asset) => a.is_starred);
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          localAssets = localAssets.filter((a: Asset) =>
            a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q))
          );
        }
        setAssetsList(localAssets as Asset[]);
        setTotal(localAssets.length);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isOnline, page, pageSize, categoryFilter, starredOnly, searchQuery, assetTab, selectedTeamId]);

  useEffect(() => {
    if (open && token) {
      loadAssets();
      teams.list(token).then(setUserTeams).catch(() => {});
    }
  }, [open, token, loadAssets]);

  // 多选操作
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (!token || selectedIds.size === 0) return;
    try {
      await assets.batchDelete(Array.from(selectedIds), token);
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      loadAssets();
    } catch (error) {
      console.error('Failed to batch delete:', error);
    }
  };

  const handleBatchExport = async () => {
    if (!token || selectedIds.size === 0) return;
    try {
      const blob = await assets.export(Array.from(selectedIds), token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assets_export_${selectedIds.size}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!token) return;
    try {
      await assets.delete(assetId, token);
      setAssetsList(prev => prev.filter(a => a.id !== assetId));
      await assetCache.remove(assetId);
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const handleToggleStar = async (asset: Asset) => {
    if (!token) return;
    try {
      const result = await assets.toggleStar(asset.id, token);
      setAssetsList(prev =>
        prev.map(a => a.id === asset.id ? { ...a, is_starred: result.is_starred } : a)
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    if (multiSelectMode) {
      toggleSelect(asset.id);
    } else if (selectionMode && onSelectAsset) {
      onSelectAsset(asset);
      onClose();
    } else {
      setSelectedAsset(asset);
      setPreviewOpen(true);
    }
  };

  const handleShareToTeam = async (assetId: string, teamId: string) => {
    if (!token) return;
    try {
      await assets.shareToTeam(assetId, teamId, token);
      setShareMenuAssetId(null);
    } catch (e) {
      console.error('Failed to share:', e);
    }
  };

  const handleRemoveFromTeam = async (assetId: string) => {
    if (!token || !selectedTeamId) return;
    try {
      await assets.removeFromTeam(assetId, selectedTeamId, token);
      setAssetsList(prev => prev.filter(a => a.id !== assetId));
    } catch (e) {
      console.error('Failed to remove from team:', e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!token) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('type', file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'text');

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://64.118.135.134:8000/api'}/assets/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
      }
      loadAssets();
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <AssetLibraryDialogContent
        className={cn(
          "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col",
          isDragging && "ring-2 ring-primary ring-offset-2"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pl-2">
            <div className="flex items-center gap-3">
              <span>资产库</span>
              {/* 个人/团队 Tab */}
              <div className="flex items-center bg-muted rounded-md p-0.5">
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    assetTab === 'personal' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => { setAssetTab('personal'); setSelectedTeamId(null); }}
                >
                  <User className="w-3 h-3" /> 个人
                </button>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    assetTab === 'team' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setAssetTab('team')}
                >
                  <Users className="w-3 h-3" /> 团队
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">离线模式</span>
              )}
              {uploading && <span className="text-xs text-primary">上传中...</span>}
              <Button variant="ghost" size="sm" onClick={() => loadAssets()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* 主布局：左侧分类 + 右侧内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧分类面板 */}
          <div className="w-44 border-r flex flex-col overflow-hidden">
            {assetTab === 'team' ? (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="mb-2">
                  <span className="text-xs font-medium text-muted-foreground">我的团队</span>
                </div>
                {userTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无团队</p>
                ) : (
                  <div className="space-y-1">
                    {userTeams.map(team => (
                      <button
                        key={team.id}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2',
                          selectedTeamId === team.id ? 'bg-muted' : 'hover:bg-muted/50',
                        )}
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <Users className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{team.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="mb-2">
                  <span className="text-xs font-medium text-muted-foreground">资产分类</span>
                </div>
                <div className="space-y-0.5">
                  {ASSET_CATEGORIES.map(cat => {
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 text-sm rounded flex items-center gap-2 transition-colors",
                          categoryFilter === cat.id ? 'bg-muted font-medium' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => { setCategoryFilter(cat.id); setPage(1); }}
                      >
                        {IconComp ? <IconComp className="h-3.5 w-3.5 flex-shrink-0" /> : <span className="w-3.5 text-center text-xs">📋</span>}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 工具栏 */}
            <div className="flex flex-wrap items-center gap-3 p-3 border-b">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索资产名称、提示词..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8" />
              </div>

              <Button variant={starredOnly ? 'default' : 'outline'} size="sm" onClick={() => setStarredOnly(!starredOnly)}>
                <Star className={cn("h-3.5 w-3.5", starredOnly && "fill-current")} />
              </Button>

              <div className="flex items-center gap-0.5 border rounded-md p-0.5">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('grid')}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('list')}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button variant={multiSelectMode ? 'default' : 'outline'} size="sm" onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedIds(new Set()); }}>
                {multiSelectMode ? '取消' : '多选'}
              </Button>
            </div>

            {/* 多选操作栏 */}
            {multiSelectMode && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted">
                <span className="text-sm">已选择 {selectedIds.size} 项</span>
                <Button size="sm" variant="outline" onClick={handleBatchDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> 删除
                </Button>
                <Button size="sm" variant="outline" onClick={handleBatchExport}>
                  <Download className="h-4 w-4 mr-1" /> 导出
                </Button>
              </div>
            )}

            {/* 资产网格/列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : assetsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>暂无资产</p>
                  <p className="text-sm mt-1">拖拽文件到此处或点击上传</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-4 gap-3">
                  {assetsList.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      selected={selectedIds.has(asset.id)}
                      onSelect={() => handleSelectAsset(asset)}
                      onToggleStar={() => handleToggleStar(asset)}
                      onDelete={() => handleDelete(asset.id)}
                      onShareToTeam={assetTab === 'personal' ? handleShareToTeam : undefined}
                      onRemoveFromTeam={assetTab === 'team' && selectedTeamId ? handleRemoveFromTeam : undefined}
                      userTeams={userTeams}
                      shareMenuAssetId={shareMenuAssetId}
                      setShareMenuAssetId={setShareMenuAssetId}
                      multiSelectMode={multiSelectMode}
                    />
                  ))}
                </div>
              ) : (
                <AssetListView
                  assets={assetsList}
                  selectedIds={selectedIds}
                  onSelect={handleSelectAsset}
                  onToggleStar={handleToggleStar}
                  onDelete={handleDelete}
                  multiSelectMode={multiSelectMode}
                />
              )}
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className="flex items-center justify-center gap-2 p-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
                <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / pageSize)}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>下一页</Button>
              </div>
            )}
          </div>
        </div>

        {/* 预览弹窗 */}
        {selectedAsset && (
          <AssetPreview open={previewOpen} onClose={() => setPreviewOpen(false)} asset={selectedAsset} />
        )}
      </AssetLibraryDialogContent>
    </Dialog>
  );
}

// 资产卡片组件 — 展示缩略图 + 提示词 + 参数标签
function AssetCard({
  asset,
  selected,
  onSelect,
  onToggleStar,
  onDelete,
  onShareToTeam,
  onRemoveFromTeam,
  userTeams,
  shareMenuAssetId,
  setShareMenuAssetId,
  multiSelectMode,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onShareToTeam?: (assetId: string, teamId: string) => void;
  onRemoveFromTeam?: (assetId: string) => void;
  userTeams?: Team[];
  shareMenuAssetId: string | null;
  setShareMenuAssetId: (id: string | null) => void;
  multiSelectMode: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const meta = (asset as any).meta || {};
  const prompt = truncatePrompt(meta.prompt || meta.enhancedPrompt);
  const modelTag = meta.params?.model || meta.params?.modelName || '';
  const sizeTag = meta.params?.width && meta.params?.height ? `${meta.params.width}×${meta.params.height}` : '';
  const isImage = ['image', 'storyboard_image'].includes(asset.type?.toLowerCase());

  return (
    <div
      className={cn(
        "group relative bg-card rounded-lg border overflow-hidden cursor-pointer hover:border-primary transition-colors",
        isImage ? "aspect-square" : "aspect-video",
        selected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      {/* 多选 */}
      {multiSelectMode && (
        <div className={cn(
          "absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center",
          selected ? "bg-primary text-primary-foreground" : "bg-black/50 border-white"
        )}>
          {selected && <Check className="h-3 w-3" />}
        </div>
      )}

      {/* 缩略图 */}
      {isImage && !imageError ? (
        <img src={asset.thumbnail_url || asset.url} alt={asset.name} loading="lazy" className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-4xl">{TYPE_ICONS[asset.type?.toLowerCase()] || '📄'}</div>
      )}

      {/* 底部信息 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-8">
        <p className="text-white text-xs font-medium truncate">{asset.name}</p>
        {prompt && <p className="text-white/60 text-[10px] truncate mt-0.5">{prompt}</p>}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className="text-[9px] px-1 py-0.5 rounded bg-white/20 text-white/80">{ASSET_CATEGORIES.find(c => c.id === asset.type?.toLowerCase())?.label || asset.type}</span>
          {modelTag && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/40 text-white/80">{modelTag}</span>}
          {sizeTag && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/40 text-white/80">{sizeTag}</span>}
          {asset.version && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/40 text-white/80">{asset.version}</span>}
        </div>
      </div>

      {/* 收藏标记 */}
      {asset.is_starred && <div className="absolute top-2 right-2"><Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /></div>}

      {/* 版本标签 */}
      {asset.version && (
        <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/80 text-white backdrop-blur-sm">
          {asset.version}
        </span>
      )}

      {/* 操作按钮 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onShareToTeam && userTeams && userTeams.length > 0 && (
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/50 hover:bg-black/70" onClick={(e) => { e.stopPropagation(); setShareMenuAssetId(shareMenuAssetId === asset.id ? null : asset.id); }}>
              <Share2 className="h-3.5 w-3.5 text-white" />
            </Button>
            {shareMenuAssetId === asset.id && (
              <div className="absolute right-0 top-9 w-36 bg-popover border rounded-md shadow-lg z-20 py-1" onClick={(e) => e.stopPropagation()}>
                <p className="px-2 py-1 text-xs text-muted-foreground">分享到团队</p>
                {userTeams.map(team => (
                  <button key={team.id} className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center gap-1.5"
                    onClick={() => { onShareToTeam(asset.id, team.id); setShareMenuAssetId(null); }}>
                    <Users className="w-3 h-3" /> {team.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {onRemoveFromTeam && (
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/50 hover:bg-orange-500" onClick={(e) => { e.stopPropagation(); onRemoveFromTeam(asset.id); }} title="从团队移除">
            <Share2 className="h-3.5 w-3.5 text-white rotate-180" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/50 hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onToggleStar(); }}>
          <Star className={cn("h-3.5 w-3.5", asset.is_starred ? "fill-yellow-500 text-yellow-500" : "text-white")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/50 hover:bg-red-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3.5 w-3.5 text-white" />
        </Button>
      </div>
    </div>
  );
}

// 资产列表视图
function AssetListView({
  assets: list,
  selectedIds,
  onSelect,
  onToggleStar,
  onDelete,
  multiSelectMode,
}: {
  assets: Asset[];
  selectedIds: Set<string>;
  onSelect: (asset: Asset) => void;
  onToggleStar: (asset: Asset) => void;
  onDelete: (id: string) => void;
  multiSelectMode: boolean;
}) {
  return (
    <div className="space-y-2">
      {list.map((asset) => {
        const meta = (asset as any).meta || {};
        const prompt = truncatePrompt(meta.prompt || meta.enhancedPrompt, 80);
        const isImage = ['image', 'storyboard_image'].includes(asset.type?.toLowerCase());
        return (
          <div
            key={asset.id}
            className={cn("flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary cursor-pointer", selectedIds.has(asset.id) && "ring-2 ring-primary")}
            onClick={() => onSelect(asset)}
          >
            {multiSelectMode && (
              <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0", selectedIds.has(asset.id) ? "bg-primary text-primary-foreground" : "border-muted-foreground")}>
                {selectedIds.has(asset.id) && <Check className="h-3 w-3" />}
              </div>
            )}
            <div className="w-14 h-14 bg-muted rounded flex-shrink-0 overflow-hidden">
              {isImage ? (
                <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">{TYPE_ICONS[asset.type?.toLowerCase()] || '📄'}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{asset.name}</p>
              {prompt && <p className="text-xs text-muted-foreground truncate mt-0.5">{prompt}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{ASSET_CATEGORIES.find(c => c.id === asset.type?.toLowerCase())?.label || asset.type}</span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">{new Date(asset.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onToggleStar(asset); }}>
                <Star className={cn("h-3.5 w-3.5", asset.is_starred && "fill-yellow-500 text-yellow-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
