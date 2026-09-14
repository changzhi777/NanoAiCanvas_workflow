import { useState } from 'react';
import type { Asset } from '../../../lib/api/client';
import { Dialog, DialogContent, DialogTitle } from '../dialog';
import { Button } from '../button';
import { ChevronLeft, ChevronRight, Star, Download, ExternalLink } from 'lucide-react';

interface AssetPreviewProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

export default function AssetPreview({ open, onClose, asset }: AssetPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const meta = asset.metadata || {};
  const images = meta.images || (asset.url ? [asset.url] : []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const currentUrl = images[currentIndex] || asset.url;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <DialogTitle className="text-lg font-medium truncate">{asset.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {asset.is_starred && <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />}
              <Button variant="ghost" size="icon" asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href={currentUrl} download={asset.name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center bg-black/95 relative min-h-[400px]">
            {asset.type?.toLowerCase() === 'image' ? (
              <>
                <img
                  src={currentUrl}
                  alt={asset.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={handleNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                      {currentIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : asset.type?.toLowerCase() === 'video' ? (
              <video
                src={currentUrl}
                controls
                autoPlay
                className="max-w-full max-h-[60vh]"
              />
            ) : asset.type?.toLowerCase() === 'audio' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
                  🎵
                </div>
                <audio src={currentUrl} controls autoPlay className="w-80" />
              </div>
            ) : (
              <div className="max-w-2xl p-8 bg-card rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm">{asset.url}</pre>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 border-t bg-card">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">类型：</span>
                <span className="font-medium">{asset.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">分类：</span>
                <span className="font-medium">{asset.category || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">创建时间：</span>
                <span>{new Date(asset.created_at).toLocaleString()}</span>
              </div>
              {meta.prompt && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Prompt：</span>
                  <span className="text-primary">{meta.prompt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}