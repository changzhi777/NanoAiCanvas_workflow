import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

interface CompletionAnimationProps {
  show: boolean;
  onComplete?: () => void;
  nodeCount?: number;
  successCount?: number;
}

export function CompletionAnimation({
  show,
  onComplete,
  nodeCount = 0,
  successCount = 0
}: CompletionAnimationProps) {
  const { isDark } = useTheme();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // 生成粒子
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 360 - 180,
        y: Math.random() * 360 - 180,
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);

      // 3秒后自动隐藏
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* 背景遮罩 */}
      <div className={cn(
        'absolute inset-0 backdrop-blur-sm transition-opacity duration-300',
        isDark ? 'bg-black/20' : 'bg-black/10'
      )} />

      {/* 庆祝动画 */}
      <div className="relative z-10 animate-in fade-in zoom-in duration-300">
        <div className={cn(
          'p-8 rounded-2xl backdrop-blur-xl border shadow-2xl',
          'flex flex-col items-center gap-4',
          'animate-bounce-in',
          isDark
            ? 'bg-slate-900/80 border-white/10'
            : 'bg-white/90 border-gray-200'
        )}>
          {/* 成功图标 */}
          <div className="relative">
            <div className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-green-500 to-emerald-500',
              'shadow-lg shadow-green-500/50',
              'animate-pulse'
            )}>
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>

            {/* 环绕的闪光 */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0"
                style={{
                  transform: `rotate(${i * 45}deg)`,
                }}
              >
                <Sparkles
                  className={cn(
                    'w-6 h-6 text-yellow-400 absolute',
                    '-top-2 left-1/2 -translate-x-1/2',
                    'animate-sparkle'
                  )}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* 文字 */}
          <div className="text-center space-y-2">
            <h2 className={cn(
              'text-2xl font-bold',
              isDark ? 'text-slate-100' : 'text-gray-900'
            )}>
              工作流执行完成！
            </h2>
            <p className={cn(
              'text-sm',
              isDark ? 'text-slate-300' : 'text-gray-600'
            )}>
              成功完成 {successCount} / {nodeCount} 个节点
            </p>
          </div>

          {/* 粒子效果 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="particle absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: `hsl(${Math.random() * 360}, 70%, 50%)`,
                  '--tx': `${particle.x}px`,
                  '--ty': `${particle.y}px`,
                  animationDelay: `${particle.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }

        @keyframes sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.5) rotate(180deg);
            opacity: 0.5;
          }
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

CompletionAnimation.displayName = 'CompletionAnimation';
