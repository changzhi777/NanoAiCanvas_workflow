import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useSyncStore } from '../../../stores/remoteStore';
import { assets as apiAssets, type Asset } from '../../../lib/api/client';
import { getDB } from '../../../lib/db/schema';
import { Search, Image, Video, Music, FileText } from 'lucide-react';
import { Button } from '../button';
import { Input } from '../input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../dialog';

type AssetType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT';

interface AssetSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  filterType?: AssetType;
  title?: string;
}

export default function AssetSelector({
  open,
  onClose,
  onSelect,
  filterType,
  title = '选择资产',
}: AssetSelectorProps) {
  const token = useAuthStore((s) => s.token);
  const isOnline = useSyncStore((s) => s.isOnline);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const loadAssets = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      if (isOnline) {
        const result = await apiAssets.list(token, {
          page: 1,
          page_size: 50,
          type_filter: filterType,
        });
        setAssets(result.items);
      } else {
        const db = await getDB();
        let localAssets = await db.getAll('assets');
        if (filterType) {
          localAssets = localAssets.filter((a) => a.type === filterType);
        }
        setAssets(localAssets as Asset[]);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isOnline, filterType]);

  useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, loadAssets]);

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeIcons: Record<string, React.ReactNode> = {
    IMAGE: <Image className="h-5 w-5" />,
    VIDEO: <Video className="h-5 w-5" />,
    AUDIO: <Music className="h-5 w-5" />,
    TEXT: <FileText className="h-5 w-5" />,
  };

  const handleConfirm = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索资产..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p>暂无资产</p>
              <p className="text-sm">运行工作流生成内容后，这里会显示可用资产</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`relative aspect-square bg-card rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    selectedAsset?.id === asset.id
                      ? 'border-primary ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset.type === 'IMAGE' ? (
                    <img
                      src={asset.thumbnail_url || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      {typeIcons[asset.type]}
                    </div>
                  )}

                  {selectedAsset?.id === asset.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAsset}>
            确认选择
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}