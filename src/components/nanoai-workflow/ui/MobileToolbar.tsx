import { useState } from 'react';
import { Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface MobileToolbarProps {
  onExecute?: () => void;
  onSave?: () => void;
  onClear?: () => void;
  nodeCount?: number;
}

export function MobileToolbar({
  onExecute,
  onSave,
  onClear,
  nodeCount = 0
}: MobileToolbarProps) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-inset-bottom',
      isDark
        ? 'bg-slate-900/95 backdrop-blur-xl border-t border-white/10'
        : 'bg-white/95 backdrop-blur-xl border-t border-gray-200'
    )}>
      {/* 主按钮 */}
      <div className="flex items-center justify-center gap-3">
        {/* 执行按钮 */}
        <button
          onClick={onExecute}
          disabled={nodeCount === 0}
          className={cn(
            'flex-1 max-w-[200px] px-6 py-3 rounded-xl font-medium',
            'transition-all duration-200',
            'shadow-lg active:scale-95',
            'bg-gradient-to-r from-green-500 to-emerald-500',
            'hover:from-green-600 hover:to-emerald-600',
            'text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          <span className="text-sm">执行工作流</span>
        </button>

        {/* 更多操作 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            'transition-all duration-200',
            'shadow-lg active:scale-95',
            isDark
              ? 'bg-slate-800 border border-white/10 text-slate-300'
              : 'bg-gray-100 border border-gray-200 text-gray-600'
          )}
        >
          {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* 展开的操作面板 */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* 保存 */}
          <button
            onClick={onSave}
            className={cn(
              'px-4 py-3 rounded-xl font-medium text-sm',
              'transition-all duration-200',
              'shadow-md active:scale-95',
              'flex flex-col items-center gap-1.5',
              isDark
                ? 'bg-slate-800 border border-white/10 text-slate-300'
                : 'bg-gray-100 border border-gray-200 text-gray-600'
            )}
          >
            <span>💾</span>
            <span>保存</span>
          </button>

          {/* 清空 */}
          <button
            onClick={onClear}
            className={cn(
              'px-4 py-3 rounded-xl font-medium text-sm',
              'transition-all duration-200',
              'shadow-md active:scale-95',
              'flex flex-col items-center gap-1.5',
              isDark
                ? 'bg-red-900/30 border border-red-500/50 text-red-300'
                : 'bg-red-50 border border-red-200 text-red-600'
            )}
          >
            <span>🗑️</span>
            <span>清空</span>
          </button>

          {/* 统计 */}
          <div className={cn(
            'px-4 py-3 rounded-xl text-sm',
            'flex flex-col items-center gap-1.5',
            isDark
              ? 'bg-slate-800 border border-white/10 text-slate-400'
              : 'bg-gray-100 border border-gray-200 text-gray-500'
          )}>
            <span>📊</span>
            <span className="text-xs">{nodeCount} 节点</span>
          </div>
        </div>
      )}
    </div>
  );
}

MobileToolbar.displayName = 'MobileToolbar';
