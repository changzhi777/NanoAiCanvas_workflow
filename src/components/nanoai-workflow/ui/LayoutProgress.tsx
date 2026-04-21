import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface LayoutProgressProps {
  show: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

export function LayoutProgress({
  show,
  message = '正在智能布局...',
  duration = 2000,
  onComplete,
}: LayoutProgressProps) {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!show) {
      setProgress(0);
      setStatus('loading');
      return;
    }

    // 模拟布局进度
    const steps = [
      { progress: 20, delay: 100 },
      { progress: 40, delay: 300 },
      { progress: 60, delay: 500 },
      { progress: 80, delay: 700 },
      { progress: 95, delay: 900 },
      { progress: 100, delay: duration - 200 },
    ];

    const timers = steps.map(({ progress: p, delay }) =>
      setTimeout(() => {
        setProgress(p);
        if (p === 100) {
          setStatus('success');
          setTimeout(() => {
            onComplete?.();
          }, 500);
        }
      }, delay)
    );

    return () => timers.forEach(t => clearTimeout(t));
  }, [show, duration, onComplete]);

  if (!show) return null;

  return (
    <div className={cn(
      'fixed top-20 left-1/2 -translate-x-1/2 z-50',
      'px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border',
      'flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200',
      isDark
        ? 'bg-slate-900/95 border-white/10'
        : 'bg-white/95 border-gray-200'
    )}>
      {/* 图标 */}
      <div className="relative">
        {status === 'loading' && (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="w-6 h-6 text-green-500 animate-scale-in" />
        )}
        {status === 'error' && (
          <AlertCircle className="w-6 h-6 text-red-500" />
        )}
      </div>

      {/* 文本信息 */}
      <div className={cn(
        'flex flex-col',
        isDark ? 'text-slate-200' : 'text-gray-700'
      )}>
        <div className="font-semibold text-sm">{message}</div>
        <div className="flex items-center gap-2 mt-1">
          {/* 进度条 */}
          <div className={cn(
            'flex-1 h-1.5 rounded-full overflow-hidden',
            isDark ? 'bg-slate-700' : 'bg-gray-200'
          )}>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                status === 'success'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* 进度百分比 */}
          <span className="text-xs font-medium w-12 text-right">
            {progress}%
          </span>
        </div>
      </div>

      {/* 装饰图标 */}
      <div className={cn(
        'opacity-20',
        isDark ? 'text-slate-400' : 'text-gray-400'
      )}>
        <Layers className="w-8 h-8" />
      </div>
    </div>
  );
}

export default LayoutProgress;
