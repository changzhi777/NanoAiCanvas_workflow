/**
 * PromptOptimizerDialog — 优化前后对比 + 接受/拒绝
 * K5 提示词优化按钮点击后弹窗
 */
import { memo, useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tvcApi } from '@/lib/api/tvc-api';

export interface PromptOptimizerDialogProps {
  open: boolean;
  originalPrompt: string;
  onAccept: (optimized: string) => void;
  onClose: () => void;
}

export const PromptOptimizerDialog = memo(function PromptOptimizerDialog({
  open, originalPrompt, onAccept, onClose,
}: PromptOptimizerDialogProps) {
  const [optimized, setOptimized] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setOptimized(''); setError('');
    setLoading(true);
    tvcApi.optimizePrompt({ prompt: originalPrompt })
      .then((r) => setOptimized(r.optimized || ''))
      .catch((e) => setError(e instanceof Error ? e.message : '优化失败'))
      .finally(() => setLoading(false));
  }, [open, originalPrompt]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-[640px] max-w-[90vw] max-h-[80vh] overflow-hidden rounded-2xl',
          'border border-white/10 bg-slate-900/95 text-slate-100',
          'shadow-2xl flex flex-col',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">提示词优化</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2 p-4 overflow-y-auto">
          <div className="space-y-1">
            <h4 className="text-[10px] uppercase tracking-wide text-slate-400">原始</h4>
            <div className="text-xs p-3 rounded-lg bg-slate-800/50 min-h-[120px] max-h-[400px] overflow-y-auto whitespace-pre-wrap">
              {originalPrompt}
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] uppercase tracking-wide text-emerald-400">优化后</h4>
            <div className="text-xs p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 min-h-[120px] max-h-[400px] overflow-y-auto whitespace-pre-wrap">
              {loading ? <span className="text-slate-400">优化中…</span> :
               error ? <span className="text-red-400">{error}</span> :
               optimized || <span className="text-slate-500">（空）</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5"
          >
            拒绝
          </button>
          <button
            onClick={() => optimized && onAccept(optimized)}
            disabled={!optimized || loading}
            className={cn(
              'flex-1 h-9 rounded-lg text-xs font-medium transition-all',
              optimized && !loading
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
            )}
          >
            接受并替换
          </button>
        </div>
      </div>
    </div>
  );
});
