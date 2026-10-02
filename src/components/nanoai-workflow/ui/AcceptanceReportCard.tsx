/**
 * AcceptanceReportCard — 验收审查报告卡（挂 TvcScriptNode 完成态）
 *
 * 环形百分比 + veto 徽标 + 冲突点列表（标准原文 vs 实际）+ 接受 / 单步重做 / 导出客户版
 */
import { memo, useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronRight,
  Check, RotateCcw, Download, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useToast } from '@/hooks/useToast';
import { tvcAcceptanceApi, type AcceptanceReport } from '@/lib/api/tvc-acceptance-api';

export interface AcceptanceReportCardProps {
  taskId: string;
  /** 模板名（用于显示依据标准） */
  templateName?: string;
  className?: string;
}

const STATUS_META = {
  passed: { icon: ShieldCheck, label: '符合标准', color: 'text-emerald-400' },
  failed: { icon: ShieldAlert, label: '需修改', color: 'text-red-400' },
  unverified: { icon: ShieldQuestion, label: '待复核', color: 'text-amber-400' },
} as const;

function scoreColor(score: number, hasVeto: boolean): string {
  if (hasVeto) return '#ef4444';
  if (score >= 85) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

export const AcceptanceReportCard = memo(function AcceptanceReportCard({
  taskId, templateName, className,
}: AcceptanceReportCardProps) {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [reports, setReports] = useState<AcceptanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [redoMenu, setRedoMenu] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await tvcAcceptanceApi.getReports(taskId);
      setReports(res.items || []);
      const final = (res.items || []).find((r) => r.gate === 'final');
      if (final?.decision === 'accepted') setAccepted(true);
    } catch {
      // 报告接口失败静默（可能无模板任务）
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) load();
  }, [taskId, load]);

  const handleRedo = useCallback(async (step: 'images' | 'video') => {
    setRedoMenu(false);
    setRedoing(true);
    try {
      await tvcAcceptanceApi.redo(taskId, step);
      toast.success(`已提交重做（${step === 'images' ? '参考图' : '视频'}），按生成步骤正常计费`);
      // 轮询刷新（重做需要几分钟）
      setTimeout(load, 8000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '重做失败');
    } finally {
      setRedoing(false);
    }
  }, [taskId, toast, load]);

  const handleAccept = useCallback(async (report: AcceptanceReport) => {
    try {
      await tvcAcceptanceApi.decide(report.id, 'accept');
      setAccepted(true);
      toast.success('已标记接受');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  }, [toast]);

  const handleExport = useCallback(async (report: AcceptanceReport) => {
    try {
      await tvcAcceptanceApi.exportClientVersion(report.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导出失败');
    }
  }, [toast]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground', className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        加载审查报告...
      </div>
    );
  }
  if (!reports.length) return null;

  return (
    <div className={cn('px-4 pb-3 space-y-2', className)}>
      {reports.map((report) => {
        const meta = STATUS_META[report.status] || STATUS_META.unverified;
        const StatusIcon = meta.icon;
        const color = scoreColor(report.score, (report.veto_hit || []).length > 0);
        const isOpen = expanded === report.id;
        const circumference = 2 * Math.PI * 16;
        const dash = (Math.min(100, Math.max(0, report.score)) / 100) * circumference;

        return (
          <div
            key={report.id}
            className={cn(
              'rounded-xl border overflow-hidden',
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200',
              report.status === 'failed' && 'border-red-500/30',
              report.status === 'passed' && 'border-emerald-500/20',
            )}
          >
            {/* 摘要行 */}
            <div className="flex items-center gap-3 p-3">
              {/* 环形百分比 */}
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke={isDark ? '#1e293b' : '#e5e7eb'} strokeWidth="4" />
                  <circle
                    cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono" style={{ color }}>
                  {report.score}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <StatusIcon className={cn('w-3.5 h-3.5', meta.color)} />
                  <span className={cn('text-xs font-semibold', meta.color)}>
                    {report.gate === 'script' ? '剧本审查' : '成片审查'} · {meta.label}
                  </span>
                  {(report.veto_hit || []).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[9px]">
                      触发否决 {report.veto_hit.length}
                    </span>
                  )}
                  {accepted && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px]">已接受</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {templateName ? `依据：${templateName} · ` : ''}
                  重做 {report.redo_count}/3
                </div>
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : report.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {/* 冲突点摘要（未展开也显示前 2） */}
            {!isOpen && (report.conflicts_top || []).filter((c) => c.key !== '_service').slice(0, 2).map((c) => (
              <div key={c.key} className="px-3 pb-1.5 text-[10px] text-red-400/90 truncate">
                ⚠ {c.label}：{c.conflict}
              </div>
            ))}
            {!isOpen && (report.conflicts_top || []).some((c) => c.key === '_service') && (
              <div className="px-3 pb-1.5 text-[10px] text-amber-400/90">
                ⚠ 审查服务暂不可用，建议人工复核
              </div>
            )}

            {/* 展开明细 */}
            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                {(report.items || []).filter((it) => it.category !== 'archive').map((it) => (
                  <div key={it.key} className="text-[10px] space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {it.pass === true ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : it.pass === false ? (
                        <span className="w-3 text-center text-red-500 shrink-0">✕</span>
                      ) : (
                        <span className="w-3 text-center text-slate-500 shrink-0">–</span>
                      )}
                      <span className={cn('font-medium', it.pass === false && 'text-red-400')}>{it.label}</span>
                      {it.veto && <span className="text-[8px] px-1 rounded bg-red-500/10 text-red-400">否决</span>}
                      <span className="ml-auto text-muted-foreground/60">{it.weight} 分</span>
                    </div>
                    {it.pass === false && (it.conflict || it.actual) && (
                      <div className="pl-4 text-muted-foreground">
                        {it.conflict && <div>冲突：{it.conflict}</div>}
                        {it.actual && <div className="opacity-70">实际：{it.actual}</div>}
                        {it.advice && <div className="text-blue-400/80">建议：{it.advice}</div>}
                      </div>
                    )}
                  </div>
                ))}

                {/* 操作行 */}
                <div className="flex gap-1.5 pt-2">
                  <button
                    onClick={() => handleAccept(report)}
                    disabled={accepted}
                    className={cn(
                      'flex-1 h-7 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1',
                      accepted ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white',
                    )}
                  >
                    <Check className="w-3 h-3" />
                    接受
                  </button>
                  <div className="relative flex-1">
                    <button
                      onClick={() => setRedoMenu(!redoMenu)}
                      disabled={redoing || report.redo_count >= 3}
                      className={cn(
                        'w-full h-7 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1',
                        'bg-amber-600/90 hover:bg-amber-500 text-white disabled:opacity-40',
                      )}
                    >
                      {redoing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      单步重做{report.redo_count >= 3 ? '（已达上限）' : ''}
                    </button>
                    {redoMenu && (
                      <div className={cn(
                        'absolute bottom-9 right-0 w-32 rounded-lg border shadow-xl z-10 overflow-hidden',
                        isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200',
                      )}>
                        <button
                          onClick={() => handleRedo('images')}
                          className="w-full px-3 py-2 text-left text-[10px] hover:bg-white/5"
                        >
                          重做参考图（省视频费）
                        </button>
                        <button
                          onClick={() => handleRedo('video')}
                          className="w-full px-3 py-2 text-left text-[10px] hover:bg-white/5 border-t border-white/5"
                        >
                          重做视频+BGM
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleExport(report)}
                    className="flex-1 h-7 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 bg-slate-600/80 hover:bg-slate-500 text-white"
                  >
                    <Download className="w-3 h-3" />
                    客户版
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default AcceptanceReportCard;
