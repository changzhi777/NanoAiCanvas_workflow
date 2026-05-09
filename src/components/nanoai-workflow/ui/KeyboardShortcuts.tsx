import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['Cmd', 'S'], description: '保存工作流', category: '工作流操作' },
  { keys: ['Cmd', 'E'], description: '执行工作流', category: '工作流操作' },
  { keys: ['Cmd', 'Shift', 'E'], description: '导出工作流', category: '工作流操作' },
  { keys: ['Cmd', 'T'], description: '添加节点', category: '节点操作' },
  { keys: ['Cmd', 'D'], description: '复制节点', category: '节点操作' },
  { keys: ['Delete'], description: '删除节点', category: '节点操作' },
  { keys: ['Cmd', 'A'], description: '全选节点', category: '节点操作' },
  { keys: ['Cmd', '\\'], description: '禅模式', category: '视图操作' },
  { keys: ['Cmd', '0'], description: '适应视图', category: '视图操作' },
  { keys: ['Cmd', 'F'], description: '搜索节点', category: '视图操作' },
  { keys: ['Cmd', 'Z'], description: '撤销', category: '编辑操作' },
  { keys: ['Cmd', 'Shift', 'Z'], description: '重做', category: '编辑操作' },
  { keys: ['Cmd', 'Shift', 'D'], description: '开发者工具', category: '调试' },
];

interface KeyboardShortcutsProps {
  show: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ show, onClose }: KeyboardShortcutsProps) {
  const { isDark } = useTheme();

  if (!show) return null;

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className={cn(
        'relative w-full max-w-md rounded-xl backdrop-blur-xl border',
        'animate-in zoom-in-95 fade-in duration-200',
        isDark
          ? 'bg-slate-900/60 border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-white/90 border-gray-100 shadow-lg shadow-black/5'
      )}>
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5 border-b',
          isDark ? 'border-white/[0.04]' : 'border-gray-50'
        )}>
          <div className="flex items-center gap-2">
            <Keyboard className={cn('w-3.5 h-3.5', isDark ? 'text-blue-400' : 'text-blue-600')} />
            <h3 className={cn('text-xs font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>键盘快捷键</h3>
          </div>
          <button onClick={onClose}
            className={cn('p-1 rounded transition-colors', isDark ? 'hover:bg-white/[0.06] text-slate-500' : 'hover:bg-gray-50 text-gray-400')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {categories.map(category => (
            <div key={category}>
              <h3 className={cn('text-[10px] font-semibold uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>
                {category}
              </h3>
              <div className="space-y-0.5">
                {shortcuts.filter(s => s.category === category).map((s, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between py-1.5 px-2 rounded-lg',
                    isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
                  )}>
                    <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-gray-600')}>{s.description}</span>
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((key, ki) => (
                        <div key={ki} className="flex items-center gap-0.5">
                          <kbd className={cn(
                            'px-1.5 py-0.5 text-[10px] font-mono rounded',
                            isDark
                              ? 'bg-white/[0.06] border border-white/[0.08] text-slate-400'
                              : 'bg-gray-100 border border-gray-200 text-gray-600'
                          )}>
                            {key}
                          </kbd>
                          {ki < s.keys.length - 1 && (
                            <span className={cn('text-[10px]', isDark ? 'text-slate-600' : 'text-gray-300')}>+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className={cn('px-3 py-2 border-t', isDark ? 'border-white/[0.04]' : 'border-gray-50')}>
          <p className={cn('text-[10px] text-center', isDark ? 'text-slate-500' : 'text-gray-400')}>
            按 <kbd className={cn('px-1 py-0.5 rounded font-mono text-[10px]', isDark ? 'bg-white/[0.06] border border-white/[0.08] text-slate-400' : 'bg-gray-100 border border-gray-200 text-gray-600')}>?</kbd> 随时打开
          </p>
        </div>
      </div>
    </div>
  );
}

KeyboardShortcuts.displayName = 'KeyboardShortcuts';
