import { useMemo } from 'react';
import { History, RotateCcw, Trash2, Clock, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore, type WorkflowVersion } from '@/stores/nanoaiWorkflowStore';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(iso: string): { relative: string; absolute: string } {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let relative: string;
  if (diffMin < 1) relative = '刚刚';
  else if (diffMin < 60) relative = `${diffMin} 分钟前`;
  else if (diffHr < 24) relative = `${diffHr} 小时前`;
  else relative = `${diffDay} 天前`;

  const pad = (n: number) => String(n).padStart(2, '0');
  const absolute = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return { relative, absolute };
}

export function VersionHistoryDialog({ open, onOpenChange }: VersionHistoryDialogProps) {
  const { isDark } = useTheme();
  const versions = useNanoaiWorkflowStore(s => s.versions);
  const restoreVersion = useNanoaiWorkflowStore(s => s.restoreVersion);
  const deleteVersion = useNanoaiWorkflowStore(s => s.deleteVersion);
  const autoSaveEnabled = useNanoaiWorkflowStore(s => s.autoSaveEnabled);
  const toggleAutoSave = useNanoaiWorkflowStore(s => s.toggleAutoSave);
  const saveVersion = useNanoaiWorkflowStore(s => s.saveVersion);

  const sorted = useMemo(() => [...versions].reverse(), [versions]);

  const handleRestore = (v: WorkflowVersion) => {
    restoreVersion(v.id);
    onOpenChange(false);
  };

  const handleDelete = (v: WorkflowVersion) => {
    deleteVersion(v.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-lg max-h-[80vh] flex flex-col',
        isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-gray-200'
      )}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className={cn('w-5 h-5', isDark ? 'text-blue-400' : 'text-blue-600')} />
              <DialogTitle className={isDark ? 'text-slate-200' : ''}>版本历史</DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {versions.length} 个版本
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveVersion('手动保存')}
                className={cn(
                  'h-7 text-xs',
                  isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''
                )}
              >
                立即保存
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 自动保存开关 */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
        )}>
          <div className="flex items-center gap-2">
            <Zap className={cn('w-4 h-4', autoSaveEnabled ? 'text-amber-500' : 'text-muted-foreground')} />
            <div>
              <Label className={cn('text-xs font-medium', isDark ? 'text-slate-200' : 'text-gray-700')}>
                自动保存
              </Label>
              <p className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-gray-500')}>
                每 10 分钟自动保存一个版本快照
              </p>
            </div>
          </div>
          <Switch checked={autoSaveEnabled} onCheckedChange={toggleAutoSave} />
        </div>

        {/* 时间线 */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {sorted.length === 0 ? (
            <div className={cn(
              'flex flex-col items-center justify-center py-12 text-sm',
              isDark ? 'text-slate-500' : 'text-gray-400'
            )}>
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p>暂无版本记录</p>
              <p className="text-xs mt-1">执行工作流或手动保存后将自动记录</p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* 竖线 */}
              <div className={cn(
                'absolute left-[11px] top-2 bottom-2 w-px',
                isDark ? 'bg-white/10' : 'bg-gray-200'
              )} />

              {sorted.map((v, idx) => {
                const time = formatTime(v.createdAt);
                const isLatest = idx === 0;
                return (
                  <div key={v.id} className="relative pb-4 last:pb-0">
                    {/* 圆点 */}
                    <div className={cn(
                      'absolute left-[-20px] top-1 w-[9px] h-[9px] rounded-full border-2',
                      isLatest
                        ? 'bg-blue-500 border-blue-500'
                        : isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-300 border-gray-300'
                    )} />

                    {/* 版本卡片 */}
                    <div className={cn(
                      'rounded-lg p-3 border transition-colors',
                      isLatest
                        ? isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                        : isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-semibold',
                            isDark ? 'text-slate-200' : 'text-gray-800'
                          )}>
                            V{v.version}
                          </span>
                          <Badge variant="outline" className={cn(
                            'text-[9px] h-4 px-1.5',
                            v.autoSaved
                              ? isDark ? 'border-amber-500/30 text-amber-400' : 'border-amber-300 text-amber-600'
                              : isDark ? 'border-blue-500/30 text-blue-400' : 'border-blue-300 text-blue-600'
                          )}>
                            {v.autoSaved ? '自动' : '手动'}
                          </Badge>
                          {isLatest && (
                            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                              最新
                            </Badge>
                          )}
                        </div>
                        <span className={cn('text-[10px] font-mono', isDark ? 'text-slate-500' : 'text-gray-400')}>
                          {time.relative}
                        </span>
                      </div>

                      <div className={cn('text-[10px] mb-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        <span title={time.absolute}>{time.absolute}</span>
                        {(v.nodeCount !== undefined || v.edgeCount !== undefined) && (
                          <span className="ml-2">
                            · {v.nodeCount ?? 0} 节点 · {v.edgeCount ?? 0} 连线
                          </span>
                        )}
                      </div>

                      {v.description && (
                        <p className={cn('text-xs mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
                          {v.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(v)}
                            className={cn(
                              'h-6 text-[10px] px-2',
                              isDark ? 'border-white/10 text-slate-300 hover:bg-blue-500/10 hover:text-blue-400' : ''
                            )}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            恢复此版本
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(v)}
                          className={cn(
                            'h-6 text-[10px] px-2',
                            isDark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                          )}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

VersionHistoryDialog.displayName = 'VersionHistoryDialog';
