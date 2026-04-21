import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // 工作流操作
  { keys: ['Cmd', 'S'], description: '保存工作流', category: '工作流操作' },
  { keys: ['Cmd', 'E'], description: '执行工作流', category: '工作流操作' },
  { keys: ['Cmd', 'Shift', 'E'], description: '导出工作流', category: '工作流操作' },

  // 节点操作
  { keys: ['Cmd', 'D'], description: '复制节点', category: '节点操作' },
  { keys: ['Delete'], description: '删除节点', category: '节点操作' },
  { keys: ['Backspace'], description: '删除节点', category: '节点操作' },
  { keys: ['Cmd', 'A'], description: '全选节点', category: '节点操作' },

  // 视图操作
  { keys: ['Escape'], description: '取消选择', category: '视图操作' },
  { keys: ['Cmd', '0'], description: '适应视图', category: '视图操作' },
  { keys: ['Cmd', '+'], description: '放大', category: '视图操作' },
  { keys: ['Cmd', '-'], description: '缩小', category: '视图操作' },

  // 编辑操作
  { keys: ['Cmd', 'Z'], description: '撤销', category: '编辑操作' },
  { keys: ['Cmd', 'Shift', 'Z'], description: '重做', category: '编辑操作' },
];

interface KeyboardShortcutsProps {
  show: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ show, onClose }: KeyboardShortcutsProps) {
  const { isDark } = useTheme();

  if (!show) return null;

  // 按分类分组
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        className={cn(
          'relative w-full max-w-2xl rounded-2xl shadow-2xl backdrop-blur-xl border',
          'animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300',
          isDark
            ? 'bg-slate-900/95 border-white/10'
            : 'bg-white/95 border-gray-200'
        )}
      >
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between p-6 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div>
            <h2 className={cn(
              'text-xl font-bold',
              isDark ? 'text-slate-100' : 'text-gray-900'
            )}>
              键盘快捷键
            </h2>
            <p className={cn(
              'text-sm mt-1',
              isDark ? 'text-slate-400' : 'text-gray-500'
            )}>
              使用快捷键提升工作效率
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {categories.map(category => (
            <div key={category}>
              <h3 className={cn(
                'text-sm font-semibold uppercase tracking-wide mb-3',
                isDark ? 'text-blue-400' : 'text-blue-600'
              )}>
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        'transition-colors',
                        isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-slate-200' : 'text-gray-700'
                      )}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center gap-1">
                            <kbd className={cn(
                              'px-2.5 py-1.5 text-sm font-mono rounded-lg shadow-sm',
                              'min-w-[32px] text-center',
                              'transition-all',
                              isDark
                                ? 'bg-slate-800 border border-white/20 text-slate-300'
                                : 'bg-gray-100 border border-gray-300 text-gray-700'
                            )}>
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className={cn(
                                'text-xs',
                                isDark ? 'text-slate-500' : 'text-gray-400'
                              )}>
                                +
                              </span>
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
        <div className={cn(
          'p-4 border-t text-center',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <p className={cn(
            'text-xs',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            按 <kbd className={cn(
              'px-1.5 py-0.5 rounded font-mono text-xs',
              isDark
                ? 'bg-slate-800 border border-white/20 text-slate-300'
                : 'bg-gray-100 border border-gray-300 text-gray-700'
            )}>?</kbd> 键随时打开此帮助面板
          </p>
        </div>
      </div>
    </div>
  );
}

KeyboardShortcuts.displayName = 'KeyboardShortcuts';
