import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTheme } from './Theme';
import { cn } from '@/lib/utils';

interface ImportConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  templateName: string;
  nodeCount: number;
  edgeCount: number;
  currentNodesCount: number;
  currentEdgesCount: number;
  isImporting?: boolean;
}

export function ImportConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  templateName,
  nodeCount,
  edgeCount,
  currentNodesCount,
  currentEdgesCount,
  isImporting = false,
}: ImportConfirmDialogProps) {
  const { isDark } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const hasExistingContent = currentNodesCount > 0 || currentEdgesCount > 0;
  const willOverwrite = hasExistingContent;

  const handleConfirm = () => {
    // 保存用户选择
    if (dontShowAgain) {
      localStorage.setItem('import-confirm-dont-show', 'true');
    }
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-md dialog-glass rounded-3xl'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            'flex items-center gap-2',
            isDark ? 'text-slate-200' : ''
          )}>
            {willOverwrite ? (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-500" />
            )}
            确认导入模板
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : ''}>
            {willOverwrite
              ? '导入此模板将覆盖当前工作流，此操作不可撤销。'
              : '导入此模板将创建新的工作流。'
            }
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          'space-y-4 py-4',
          isDark ? 'text-slate-300' : 'text-gray-700'
        )}>
          {/* 模板信息 */}
          <div className={cn(
            'p-4 rounded-2xl border',
            isDark
              ? 'bg-blue-900/30 border-blue-500/30'
              : 'bg-blue-50 border-blue-200'
          )}>
            <div className="font-medium mb-2">模板信息</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>模板名称:</span>
                <span className="font-medium">{templateName}</span>
              </div>
              <div className="flex justify-between">
                <span>节点数量:</span>
                <span className="font-medium">{nodeCount}</span>
              </div>
              <div className="flex justify-between">
                <span>连线数量:</span>
                <span className="font-medium">{edgeCount}</span>
              </div>
            </div>
          </div>

          {/* 当前状态警告 */}
          {hasExistingContent && (
            <div className={cn(
              'p-4 rounded-2xl border',
              isDark
                ? 'bg-orange-900/30 border-orange-500/30'
                : 'bg-orange-50 border-orange-200'
            )}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-700 dark:text-orange-400">
                    检测到现有内容
                  </div>
                  <div className="mt-1">
                    当前画布有 <span className="font-medium">{currentNodesCount}</span> 个节点和{' '}
                    <span className="font-medium">{currentEdgesCount}</span> 条连线，导入后将被完全替换。
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 自动布局提示 */}
          <div className={cn(
            'p-3 rounded-2xl border text-sm',
            isDark
              ? 'bg-green-900/30 border-green-500/30'
              : 'bg-green-50 border-green-200'
          )}>
            <div className="flex items-start gap-2">
              <div className="text-green-600 dark:text-green-400 mt-0.5">✓</div>
              <div>
                <div className="font-medium text-green-700 dark:text-green-400">
                  自动布局已启用
                </div>
                <div className="text-xs mt-1 opacity-80">
                  导入后将自动调整节点位置，确保不重叠
                </div>
              </div>
            </div>
          </div>

          {/* 不再提示选项 */}
          <label className={cn(
            'flex items-center gap-2 text-sm cursor-pointer',
            isDark ? 'text-slate-400' : 'text-gray-600'
          )}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded"
            />
            <span>不再显示此确认对话框（导入时自动覆盖）</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
            className={isDark ? 'border-white/10 text-slate-200 hover:bg-white/5 rounded-xl' : 'rounded-xl'}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isImporting}
            className={cn(
              'bg-gradient-to-r from-blue-500 to-cyan-500',
              'hover:from-blue-600 hover:to-cyan-600',
              'text-white',
              'rounded-xl'
            )}
          >
            {isImporting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                导入中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {willOverwrite && <AlertTriangle className="w-4 h-4" />}
                确认导入
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportConfirmDialog;
