/**
 * ImportBriefDialog — 导入飞书 Brief（验收标准审查闸入口）
 *
 * 流程：贴分享链接 → 抓取解析 → 选条目 → 预览标准集 → 确认关联模板
 */
import { memo, useCallback, useState } from 'react';
import { X, Link as LinkIcon, Loader2, FileSpreadsheet, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tvcAcceptanceApi, composeCriteria, type BriefBundle, type AcceptanceTemplate } from '@/lib/api/tvc-acceptance-api';

export interface ImportBriefDialogProps {
  open: boolean;
  onLinked: (template: AcceptanceTemplate) => void;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  rule_hard: '硬规格',
  rule_content: '信息命中',
  llm_content: '内容审查',
  llm_visual: '视觉审查',
  archive: '存档',
};

export const ImportBriefDialog = memo(function ImportBriefDialog({
  open, onLinked, onClose,
}: ImportBriefDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bundle, setBundle] = useState<BriefBundle | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true); setError(''); setBundle(null); setSelected(null);
    try {
      const b = await tvcAcceptanceApi.importFeishu(url.trim());
      if (!b.items?.length) {
        setError('未解析到视频条目（检查链接是否为 Brief 数据表）');
      } else {
        setBundle(b);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '抓取失败');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleConfirm = useCallback(async () => {
    if (!bundle || selected === null) return;
    const item = bundle.items[selected];
    setSaving(true);
    try {
      const { criteria, aspect, briefCtx } = composeCriteria(item);
      const customerCode = `kfc-${Date.now().toString(36)}`;
      const name = `${bundle.base_name || '飞书 Brief'} · ${item.theme || item.column}`;
      const res = await tvcAcceptanceApi.createTemplateFromBrief({
        customer_code: customerCode,
        name,
        aspect_ratio: aspect,
        duration_sec: 15,
        criteria,
        brief_ctx: briefCtx,
      });
      onLinked({
        id: res.id, customer_code: customerCode, name,
        aspect_ratio: aspect, duration_sec: 15, criteria,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存模板失败');
    } finally {
      setSaving(false);
    }
  }, [bundle, selected, onLinked]);

  const handleClose = useCallback(() => {
    setUrl(''); setError(''); setBundle(null); setSelected(null);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const item = bundle && selected !== null ? bundle.items[selected] : null;
  const preview = item ? composeCriteria(item) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-[720px] max-w-[92vw] max-h-[85vh] overflow-hidden rounded-2xl flex flex-col',
          'border border-white/10 bg-slate-900/95 text-slate-100 shadow-2xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">导入飞书 Brief — 验收标准</span>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: 链接 */}
        <div className="px-4 pt-3">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/50 px-2.5">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴飞书多维表格分享链接（如 https://my.feishu.cn/base/...）"
                className="flex-1 bg-transparent text-xs py-2 outline-none placeholder:text-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="px-3 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              解析
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
        </div>

        {/* Step 2: 条目选择 */}
        {bundle && (
          <div className="px-4 pt-3 flex-1 overflow-y-auto space-y-3">
            <div className="text-[11px] text-slate-400">
              {bundle.base_name} · {bundle.items.length} 条视频
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {bundle.items.map((it, i) => (
                <button
                  key={it.column}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'text-left px-2.5 py-2 rounded-lg border text-xs transition-all',
                    selected === i
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {selected === i && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span className="font-medium truncate">{it.theme || it.column}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{it.column}</div>
                </button>
              ))}
            </div>

            {/* Step 3: 标准集预览 */}
            {preview && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[11px] font-medium text-slate-300 mb-2">
                  标准集预览 · {preview.criteria.length} 项 · 画面比例 {preview.aspect}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {preview.criteria.map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5 text-[10px]">
                      <span className={cn(
                        'px-1 rounded',
                        c.category === 'rule_hard' ? 'bg-red-500/15 text-red-300'
                          : c.category === 'llm_visual' ? 'bg-purple-500/15 text-purple-300'
                          : c.category === 'archive' ? 'bg-slate-500/15 text-slate-400'
                          : 'bg-blue-500/15 text-blue-300',
                      )}>
                        {CATEGORY_LABEL[c.category] || c.category}
                      </span>
                      <span className="text-slate-300 truncate">{c.label}</span>
                      {c.veto && <span className="text-red-400 shrink-0">否决</span>}
                      <span className="ml-auto text-slate-500 shrink-0">{c.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-white/10">
          <button onClick={handleClose} className="flex-1 h-9 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected === null || saving}
            className={cn(
              'flex-1 h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              selected !== null && !saving
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            关联验收标准
          </button>
        </div>
      </div>
    </div>
  );
});

export default ImportBriefDialog;
