import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useSyncStore, useAssetLibStore } from '../../../stores/remoteStore';
import { assets, categories, tags, folders, type Asset, type Category } from '../../../lib/api/client';
import { assetCache } from '../../../lib/db/AssetCache';
import { getDB } from '../../../lib/db/schema';
import {
  Search, Grid3X3, List, Star, Trash2, RefreshCw, FolderPlus, Tag, ChevronRight, ChevronDown,
  FolderOpen, Folder, Plus, Check, Upload, MoreHorizontal, Trash, Move, X, Download
} from 'lucide-react';
import { Button } from '../button';
import { Input } from '../input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal } from '../dialog';
import AssetPreview from './AssetPreview';
import CategoryWizard from './CategoryWizard';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../dropdown-menu';

type ViewMode = 'grid' | 'list';
type AssetType = 'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT';

// 预设分类
const SYSTEM_CATEGORIES: Category[] = [
  { id: 'CHARACTER', name: '角色', is_system: true, created_at: '' },
  { id: 'SCENE', name: '场景', is_system: true, created_at: '' },
  { id: 'STORYBOARD', name: '分镜', is_system: true, created_at: '' },
  { id: 'GENERAL', name: '通用', is_system: true, created_at: '' },
  { id: 'PROP', name: '道具', is_system: true, created_at: '' },
  { id: 'MUSIC', name: '音乐', is_system: true, created_at: '' },
  { id: 'SCRIPT', name: '文案', is_system: true, created_at: '' },
  { id: 'EFFECT', name: '特效', is_system: true, created_at: '' },
  { id: 'BACKGROUND', name: '背景图', is_system: true, created_at: '' },
  { id: 'REFERENCE', name: '参考图', is_system: true, created_at: '' },
];

const TYPE_ICONS: Record<string, string> = { IMAGE: '🖼️', VIDEO: '🎬', AUDIO: '🎵', TEXT: '📝' };

interface AssetLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: Asset) => void;
  selectionMode?: boolean;
}

// 创建自定义 DialogContent（不带默认关闭按钮）
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

export default function AssetLibraryPanel({
  open,
  onClose,
  onSelectAsset,
  selectionMode = false,
}: AssetLibraryPanelProps) {
  const token = useAuthStore((s) => s.token);
  const isOnline = useSyncStore((s) => s.isOnline);
  const { categories: customCategories, folders: folderList, setCategories, setFolders, setTags } = useAssetLibStore();

  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [typeFilter, setTypeFilter] = useState<AssetType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 多选模式
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 新建分类/文件夹弹窗
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // 拖拽上传
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  const loadAssets = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      if (isOnline) {
        const result = await assets.list(token, {
          page,
          page_size: pageSize,
          type_filter: typeFilter === 'ALL' ? undefined : typeFilter,
          category: folderFilter || categoryFilter === 'ALL' ? undefined : categoryFilter,
          starred: starredOnly || undefined,
          search: searchQuery || undefined,
        });
        setAssetsList(result.items);
        setTotal(result.total);

        // 缓存
        for (const asset of result.items) {
          const cached = await assetCache.get(asset.id);
          if (!cached) {
            try {
              const response = await fetch(asset.url);
              if (response.ok) {
                const blob = await response.blob();
                await assetCache.cache(asset, blob);
              }
            } catch { /* ignore */ }
          }
        }
      } else {
        const db = await getDB();
        let localAssets = await db.getAll('assets');
        if (typeFilter !== 'ALL') localAssets = localAssets.filter((a: Asset) => a.type === typeFilter);
        if (folderFilter) localAssets = localAssets.filter((a: Asset) => a.folder_id === folderFilter);
        if (starredOnly) localAssets = localAssets.filter((a: Asset) => a.is_starred);
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          localAssets = localAssets.filter((a: Asset) => a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
        }
        setAssetsList(localAssets as Asset[]);
        setTotal(localAssets.length);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isOnline, page, pageSize, typeFilter, categoryFilter, folderFilter, starredOnly, searchQuery]);

  const loadMetaData = useCallback(async () => {
    if (!token || !isOnline) return;
    try {
      const [cats, flds, tg] = await Promise.all([
        categories.list(token),
        folders.list(token),
        tags.list(token),
      ]);
      setCategories(cats);
      setFolders(flds);
      setTags(tg);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  }, [token, isOnline, setCategories, setFolders, setTags]);

  useEffect(() => {
    if (open && token) {
      loadAssets();
      loadMetaData();
    }
  }, [open, token, loadAssets, loadMetaData]);

  // 文件夹树构建
  const buildFolderTree = () => {
    const rootFolders = folderList.filter(f => !f.parent_id);
    return rootFolders.map(folder => ({
      ...folder,
      children: folderList.filter(f => f.parent_id === folder.id),
    }));
  };

  // 创建分类
  const handleCreateCategory = async () => {
    if (!token || !newCategoryName.trim()) return;
    try {
      await categories.create(newCategoryName.trim(), token);
      setNewCategoryName('');
      setShowNewCategory(false);
      loadMetaData();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!token || !newFolderName.trim()) return;
    try {
      await folders.create(newFolderName.trim(), folderFilter, token);
      setNewFolderName('');
      setShowNewFolder(false);
      loadMetaData();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  // 删除分类
  const handleDeleteCategory = async (id: string) => {
    if (!token) return;
    try {
      await categories.delete(id, token);
      loadMetaData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // 删除文件夹
  const handleDeleteFolder = async (id: string) => {
    if (!token) return;
    try {
      await folders.delete(id, token);
      setFolderFilter(null);
      loadMetaData();
      loadAssets();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

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

  const handleBatchMove = async (targetFolderId: string | null) => {
    if (!token || selectedIds.size === 0) return;
    try {
      await assets.batchUpdate(Array.from(selectedIds), { category: targetFolderId ?? undefined }, token);
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      loadAssets();
    } catch (error) {
      console.error('Failed to batch move:', error);
    }
  };

  const handleBatchTag = async (newTags: string[]) => {
    if (!token || selectedIds.size === 0) return;
    try {
      await assets.batchUpdate(Array.from(selectedIds), { tags: newTags }, token);
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      loadAssets();
    } catch (error) {
      console.error('Failed to batch tag:', error);
    }
  };

  // 批量导出
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

  // 导入文件
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const result = await assets.import(file, token);
      if (result.success) {
        alert(`成功导入 ${result.imported} 个资产`);
        loadAssets();
      } else if (result.errors) {
        alert(`部分导入失败: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to import:', error);
    } finally {
      e.target.value = '';
    }
  };

  // 删除资产
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

  // 收藏
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

  // 选择资产
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

  // 拖拽上传
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
        // 简单实现：实际上传需要 multipart/form-data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('type', file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : 'TEXT');

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

  // 所有分类合并
  const allCategories = [...SYSTEM_CATEGORIES, ...customCategories.filter(c => !SYSTEM_CATEGORIES.find(s => s.id === c.id))];

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
          <DialogTitle className="flex items-center justify-between">
            <span>资产库</span>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">离线模式</span>
              )}
              {uploading && <span className="text-xs text-primary">上传中...</span>}
              <Button variant="ghost" size="sm" onClick={() => { loadAssets(); loadMetaData(); }} disabled={loading}>
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

        {/* 主布局：左侧文件夹树 + 右侧内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧文件夹/分类面板 */}
          <div className="w-48 border-r flex flex-col overflow-hidden">
            {/* 文件夹区域 */}
            <div className="p-2 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">文件夹</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewCategory(true)}>
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {/* 全部资产 */}
                <button
                  className={cn(
                    "w-full text-left px-2 py-1 text-sm rounded flex items-center gap-1",
                    folderFilter === null && categoryFilter === 'ALL' && "bg-muted"
                  )}
                  onClick={() => { setFolderFilter(null); setCategoryFilter('ALL'); }}
                >
                  <FolderOpen className="h-3 w-3" /> 全部
                </button>
                {/* 文件夹列表 */}
                {buildFolderTree().map(folder => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    level={0}
                    selectedId={folderFilter}
                    onSelect={(id) => { setFolderFilter(id); setCategoryFilter('ALL'); }}
                    onDelete={handleDeleteFolder}
                  />
                ))}
              </div>
            </div>

            {/* 分类区域 */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">分类</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewCategory(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {allCategories.map(cat => (
                  <div key={cat.id} className="group flex items-center gap-1">
                    <button
                      className={cn(
                        "flex-1 text-left px-2 py-1 text-sm rounded flex items-center gap-1",
                        categoryFilter === cat.id && "bg-muted"
                      )}
                      onClick={() => { setCategoryFilter(cat.id); setFolderFilter(null); }}
                    >
                      <span>{cat.name}</span>
                    </button>
                    {!cat.is_system && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeleteCategory(cat.id)} className="text-destructive">
                            <Trash className="h-3 w-3 mr-1" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 工具栏 */}
            <div className="flex flex-wrap items-center gap-4 p-4 border-b">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索资产..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssetType)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="ALL">全部类型</option>
                <option value="IMAGE">图片</option>
                <option value="VIDEO">视频</option>
                <option value="AUDIO">音频</option>
                <option value="TEXT">文本</option>
              </select>

              <Button variant={starredOnly ? 'default' : 'outline'} size="sm" onClick={() => setStarredOnly(!starredOnly)}>
                <Star className={cn("h-4 w-4", starredOnly && "fill-current")} />
              </Button>

              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button variant={multiSelectMode ? 'default' : 'outline'} size="sm" onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedIds(new Set()); }}>
                {multiSelectMode ? '退出多选' : '多选'}
              </Button>
            </div>

            {/* 多选操作栏 */}
            {multiSelectMode && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted">
                <span className="text-sm">已选择 {selectedIds.size} 项</span>
                <Button size="sm" variant="outline" onClick={handleBatchDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> 批量删除
                </Button>
                <Button size="sm" variant="outline" onClick={handleBatchExport}>
                  <Upload className="h-4 w-4 mr-1" /> 导出
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Download className="h-4 w-4 mr-1" /> 导入
                </Button>
                <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileImport} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Move className="h-4 w-4 mr-1" /> 移动到
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBatchMove(null)}>无分类</DropdownMenuItem>
                    {folderList.map(f => (
                      <DropdownMenuItem key={f.id} onClick={() => handleBatchMove(f.id)}>{f.name}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" onClick={() => {
                  const newTag = prompt('输入标签:');
                  if (newTag) handleBatchTag([newTag]);
                }}>
                  <Tag className="h-4 w-4 mr-1" /> 添加标签
                </Button>
              </div>
            )}

            {/* 资产网格/列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : assetsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>暂无资产</p>
                  <p className="text-sm">拖拽文件到此处或点击上传</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-4 gap-4">
                  {assetsList.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      selected={selectedIds.has(asset.id)}
                      onSelect={() => handleSelectAsset(asset)}
                      onToggleStar={() => handleToggleStar(asset)}
                      onDelete={() => handleDelete(asset.id)}
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
              <div className="flex items-center justify-center gap-2 p-4 border-t">
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

        {/* 新建分类向导 */}
        <CategoryWizard
          open={showNewCategory}
          onClose={() => setShowNewCategory(false)}
          onSubmit={async (data) => {
            if (!token) return;
            const result = await categories.create(data, token);
            loadMetaData();
            setShowNewCategory(false);
          }}
          checkNameAvailable={async (name) => {
            if (!token) return false;
            const result = await categories.checkName(name, undefined, token);
            return !result.exists;
          }}
        />

        {/* 新建文件夹弹窗 */}
        {showNewFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card p-4 rounded-lg w-80 space-y-4">
              <h3 className="font-medium">新建文件夹</h3>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="文件夹名称" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewFolder(false)}>取消</Button>
                <Button size="sm" onClick={handleCreateFolder}>创建</Button>
              </div>
            </div>
          </div>
        )}
      </AssetLibraryDialogContent>
    </Dialog>
  );
}

// 文件夹树节点组件
function FolderItem({
  folder,
  level,
  selectedId,
  onSelect,
  onDelete,
}: {
  folder: { id: string; name: string; children: any[] };
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 group">
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          className={cn("flex-1 text-left px-1 py-0.5 text-sm rounded flex items-center gap-1", selectedId === folder.id && "bg-muted")}
          onClick={() => onSelect(folder.id)}
        >
          <Folder className="h-3 w-3" /> {folder.name}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDelete(folder.id)} className="text-destructive">
              <Trash className="h-3 w-3 mr-1" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && expanded && (
        <div className="ml-4">
          {folder.children.map(child => (
            <FolderItem key={child.id} folder={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// 资产卡片组件
function AssetCard({
  asset,
  selected,
  onSelect,
  onToggleStar,
  onDelete,
  multiSelectMode,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  multiSelectMode: boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "group relative aspect-square bg-card rounded-lg border overflow-hidden cursor-pointer hover:border-primary transition-colors",
        selected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      {/* 多选Checkbox */}
      {multiSelectMode && (
        <div className={cn(
          "absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center",
          selected ? "bg-primary text-primary-foreground" : "bg-black/50 border-white"
        )}>
          {selected && <Check className="h-3 w-3" />}
        </div>
      )}

      {/* 缩略图 */}
      {asset.type === 'IMAGE' && !imageError ? (
        <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-4xl">{TYPE_ICONS[asset.type] || '📄'}</div>
      )}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-sm font-medium truncate">{asset.name}</p>
          <p className="text-white/60 text-xs">{asset.category || asset.type}</p>
        </div>
      </div>

      {/* 收藏标记 */}
      {asset.is_starred && <div className="absolute top-2 right-2"><Star className="h-5 w-5 fill-yellow-500 text-yellow-500" /></div>}

      {/* 版本标签 */}
      {(asset as any).version && (
        <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/80 text-white backdrop-blur-sm">
          {(asset as any).version}
        </span>
      )}

      {/* 操作按钮 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onToggleStar(); }}>
          <Star className={cn("h-4 w-4", asset.is_starred ? "fill-yellow-500 text-yellow-500" : "text-white")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 hover:bg-red-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
}

// 资产列表视图组件
function AssetListView({
  assets,
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
      {assets.map((asset) => (
        <div
          key={asset.id}
          className={cn("flex items-center gap-4 p-3 bg-card rounded-lg border hover:border-primary cursor-pointer", selectedIds.has(asset.id) && "ring-2 ring-primary")}
          onClick={() => onSelect(asset)}
        >
          {multiSelectMode && (
            <div className={cn("w-5 h-5 rounded border flex items-center justify-center flex-shrink-0", selectedIds.has(asset.id) ? "bg-primary text-primary-foreground" : "border-muted-foreground")}>
              {selectedIds.has(asset.id) && <Check className="h-3 w-3" />}
            </div>
          )}
          <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
            {asset.type === 'IMAGE' ? (
              <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {asset.type === 'VIDEO' ? '🎬' : asset.type === 'AUDIO' ? '🎵' : '📝'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{asset.name}</p>
            <p className="text-sm text-muted-foreground">
              {asset.category || asset.type} • {new Date(asset.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onToggleStar(asset); }}>
              <Star className={cn("h-4 w-4", asset.is_starred && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}