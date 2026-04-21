import { useState, useEffect } from 'react';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
}

interface PerformanceMonitorProps {
  show: boolean;
  onClose: () => void;
}

export function PerformanceMonitor({ show, onClose }: PerformanceMonitorProps) {
  const theme = useTheme();
  const isDark = theme.isDark;
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
  });
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!show) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps }));
        setHistory(prev => [...prev.slice(-19), fps]);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);

    // 监控内存使用
    const measureMemory = () => {
      // @ts-ignore - performance.memory is experimental
      if (performance.memory) {
        const memory = Math.round(
          // @ts-ignore
          performance.memory.usedJSHeapSize / 1048576
        );
        setMetrics(prev => ({ ...prev, memory }));
      }
    };

    const memoryInterval = setInterval(measureMemory, 2000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(memoryInterval);
    };
  }, [show]);

  useEffect(() => {
    // 监控渲染性能
    if (!show) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          const renderTime = Math.round(entry.duration);
          setMetrics(prev => ({ ...prev, renderTime }));
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [show]);

  if (!show) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryStatus = (memory: number) => {
    if (memory < 100) return { text: '良好', color: 'text-green-500' };
    if (memory < 200) return { text: '中等', color: 'text-yellow-500' };
    return { text: '偏高', color: 'text-red-500' };
  };

  const memoryStatus = getMemoryStatus(metrics.memory);
  const avgFPS = history.length > 0
    ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
    : metrics.fps;

  return (
    <div className="fixed top-20 right-4 z-50 w-72">
      <div className={cn(
        'rounded-xl backdrop-blur-xl border shadow-lg transition-all duration-300',
        'animate-in fade-in slide-in-from-right-4 duration-300',
        isDark
          ? 'bg-slate-900/95 border-white/10'
          : 'bg-white/95 border-gray-200'
      )}>
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-2">
            <Activity className={cn(
              'w-4 h-4',
              isDark ? 'text-blue-400' : 'text-blue-600'
            )} />
            <h3 className={cn(
              'text-sm font-semibold',
              isDark ? 'text-slate-200' : 'text-gray-800'
            )}>
              性能监控
            </h3>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* FPS 指标 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={cn(
                'flex items-center gap-1.5',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>
                <Zap className="w-3.5 h-3.5" />
                <span>帧率</span>
              </span>
              <span className={cn(
                'font-mono font-semibold',
                getFPSColor(metrics.fps)
              )}>
                {metrics.fps} FPS
              </span>
            </div>

            {/* FPS 历史图表 */}
            <div className={cn(
              'h-12 rounded-lg flex items-end gap-0.5 p-1',
              isDark ? 'bg-slate-800' : 'bg-gray-100'
            )}>
              {history.map((fps, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex-1 rounded-sm transition-all duration-200',
                    fps >= 55
                      ? 'bg-green-500'
                      : fps >= 30
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  )}
                  style={{ height: `${(fps / 60) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>
                平均: {avgFPS} FPS
              </span>
            </div>
          </div>

          {/* 内存使用 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={cn(
                'flex items-center gap-1.5',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>
                <Clock className="w-3.5 h-3.5" />
                <span>内存</span>
              </span>
              <span className={cn(
                'font-mono font-semibold',
                memoryStatus.color
              )}>
                {metrics.memory} MB
              </span>
            </div>

            {/* 内存进度条 */}
            <div className={cn(
              'h-2 rounded-full overflow-hidden',
              isDark ? 'bg-slate-800' : 'bg-gray-100'
            )}>
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  metrics.memory < 100
                    ? 'bg-green-500'
                    : metrics.memory < 200
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${Math.min(metrics.memory / 500 * 100, 100)}%` }}
              />
            </div>

            <div className={cn(
              'text-xs',
              memoryStatus.color
            )}>
              {memoryStatus.text}
            </div>
          </div>

          {/* 渲染时间 */}
          {metrics.renderTime > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  'flex items-center gap-1.5',
                  isDark ? 'text-slate-400' : 'text-gray-500'
                )}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>渲染时间</span>
                </span>
                <span className={cn(
                  'font-mono font-semibold',
                  metrics.renderTime < 16
                    ? 'text-green-500'
                    : metrics.renderTime < 50
                      ? 'text-yellow-500'
                      : 'text-red-500'
                )}>
                  {metrics.renderTime} ms
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

PerformanceMonitor.displayName = 'PerformanceMonitor';
