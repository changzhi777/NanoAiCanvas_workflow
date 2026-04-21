import React from 'react';
import { Plus, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useToast } from '@/hooks/useToast';

interface EmptyStateProps {
  onAddNode?: () => void;
  onCreateTemplate?: () => void;
  className?: string;
}

export function EmptyState({
  onAddNode,
  onCreateTemplate,
  className
}: EmptyStateProps) {
  const { isDark } = useTheme();
  const { toast } = useToast();

  const quickActions = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: '从脚本开始',
      description: '生成故事脚本',
      color: 'from-[#3ecf8e]-500 to-[#00c573]-600',
      glowColor: 'shadow-emerald-500/50',
      onClick: () => {
        onAddNode?.();
        toast.success('已添加脚本生成节点');
      },
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: '生成分镜',
      description: '生成分镜图片',
      color: 'from-teal-500 to-cyan-600',
      glowColor: 'shadow-teal-500/50',
      onClick: () => {
        onAddNode?.();
        toast.success('已添加分镜头生成节点');
      },
    },
    {
      icon: <Plus className="w-5 h-5" />,
      title: '浏览模板',
      description: '使用预设模板快速开始',
      color: 'from-cyan-500 to-emerald-600',
      glowColor: 'shadow-cyan-500/50',
      onClick: () => {
        onCreateTemplate?.();
        toast.success('已加载完整工作流模板');
      },
    },
  ];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center h-full w-full',
      isDark
        ? 'bg-gradient-to-br from-blue-950/40 via-cyan-950/30 to-blue-950/40'
        : 'bg-gradient-to-br from-blue-50/30 via-cyan-50/20 to-blue-50/30',
      className
    )}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 点阵网格 */}
        <div className={cn(
          'absolute inset-0',
          isDark ? 'opacity-30' : 'opacity-20'
        )}>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1" fill="currentColor" className={isDark ? 'text-blue-500' : 'text-blue-300'} />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </defs>
          </svg>
        </div>

        {/* 浮动圆圈装饰 */}
        <div className={cn(
          'absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl animate-pulse',
          isDark ? 'bg-blue-500/20' : 'bg-blue-300/20'
        )} />
        <div className={cn(
          'absolute bottom-20 right-20 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000',
          isDark ? 'bg-cyan-500/20' : 'bg-cyan-300/20'
        )} />
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl',
          isDark ? 'bg-blue-500/10' : 'bg-blue-300/10'
        )} />
      </div>

        {/* 主内容 */}
        <div className="relative z-10 text-center space-y-8 max-w-2xl px-8">
          {/* 标题 */}
          <div className="space-y-4">
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border backdrop-blur-sm',
              'animate-in fade-in slide-in-from-top-2 duration-500',
              isDark
                ? 'bg-[#3ecf8e]-900/80 border-[#3ecf8e]-500/30'
                : 'bg-[#3ecf8e]-50/80 border-[#3ecf8e]-200'
            )}>
              <Sparkles className={cn(
                'w-5 h-5',
                isDark ? 'text-[#3ecf8e]-400' : 'text-[#3ecf8e]-600'
              )} />
              <span className={cn(
                'text-sm font-medium',
                isDark ? 'text-[#3ecf8e]-200' : 'text-[#3ecf8e]-700'
              )}>工作流</span>
            </div>

            <h1 className={cn(
              'text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
              'animate-gradient-x animate-in fade-in slide-in-from-bottom-4 duration-700',
              'drop-shadow-lg',
              isDark
                ? 'from-[#3ecf8e]-400 via-teal-400 to-cyan-400'
                : 'from-[#3ecf8e]-600 via-teal-600 to-cyan-600'
            )}>
              开始创建工作流
            </h1>

            <p className={cn(
              'text-lg max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100',
              'font-medium tracking-wide',
              isDark ? 'text-[#3ecf8e]-300/90' : 'text-[#3ecf8e]-700/90'
            )}>
              通过拖拽节点、设置参数、连接流程，构建工作流
            </p>
          </div>

        {/* 快速操作卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'group relative p-6 backdrop-blur-xl rounded-2xl',
                'border-2 hover:border-current',
                'shadow-lg hover:shadow-2xl',
                'transition-all duration-300',
                'hover:-translate-y-2 hover:scale-105',
                'text-left',
                'animate-in fade-in slide-in-from-bottom-4',
                isDark
                  ? 'bg-white/5 border-white/10 hover:border-[#3ecf8e]-500/50'
                  : 'bg-white/80 border-gray-200 hover:border-[#3ecf8e]-500/50'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* 发光效果 */}
              <div className={cn(
                'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                'blur-xl',
                action.glowColor || 'shadow-emerald-500/50'
              )} />

              <div className="flex items-start gap-4 relative z-10">
                <div className={cn(
                  'p-3 rounded-xl bg-gradient-to-br transition-all duration-300',
                  'group-hover:scale-110 group-hover:rotate-12',
                  'shadow-md group-hover:shadow-xl',
                  action.color,
                  'text-white'
                )}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    'font-semibold mb-1 transition-colors duration-300',
                    isDark
                      ? 'text-slate-200 group-hover:text-[#3ecf8e]-400'
                      : 'text-gray-800 group-hover:text-[#3ecf8e]-600'
                  )}>
                    {action.title}
                  </h3>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    {action.description}
                  </p>
                </div>
              </div>

              {/* 悬停装饰 */}
              <div className={cn(
                'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0',
                'group-hover:opacity-20 transition-opacity duration-500',
                action.color
              )} />
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="pt-8 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className={cn(
            'flex items-center justify-center gap-4 text-sm',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#3ecf8e]-500" />
              <span>从左侧添加节点</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span>连接节点创建流程</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>点击执行生成内容</span>
            </div>
          </div>

          {/* 快捷键提示 */}
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-xl',
              'transition-all duration-200 hover:scale-105',
              isDark
                ? 'bg-white/5 border-[#3ecf8e]-500/30 hover:border-[#3ecf8e]-500/50'
                : 'bg-white/60 border-[#3ecf8e]-200 hover:border-[#3ecf8e]-400'
            )}>
              <kbd className={cn(
                'px-2 py-0.5 text-xs font-mono rounded',
                isDark
                  ? 'bg-[#3ecf8e]-500/20 text-[#3ecf8e]-300'
                  : 'bg-[#3ecf8e]-100 text-[#3ecf8e]-700'
              )}>Cmd</kbd>
              <span className={cn(
                'text-xs',
                isDark ? 'text-[#3ecf8e]-400' : 'text-[#3ecf8e]-600'
              )}>+</span>
              <kbd className={cn(
                'px-2 py-0.5 text-xs font-mono rounded',
                isDark
                  ? 'bg-[#3ecf8e]-500/20 text-[#3ecf8e]-300'
                  : 'bg-[#3ecf8e]-100 text-[#3ecf8e]-700'
              )}>S</kbd>
              <span className={cn(
                'text-xs ml-1',
                isDark ? 'text-[#3ecf8e]-400' : 'text-[#3ecf8e]-600'
              )}>保存</span>
            </div>
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-xl',
              'transition-all duration-200 hover:scale-105',
              isDark
                ? 'bg-white/5 border-teal-500/30 hover:border-teal-500/50'
                : 'bg-white/60 border-teal-200 hover:border-teal-400'
            )}>
              <kbd className={cn(
                'px-2 py-0.5 text-xs font-mono rounded',
                isDark
                  ? 'bg-teal-500/20 text-teal-300'
                  : 'bg-teal-100 text-teal-700'
              )}>Cmd</kbd>
              <span className={cn(
                'text-xs',
                isDark ? 'text-teal-400' : 'text-teal-600'
              )}>+</span>
              <kbd className={cn(
                'px-2 py-0.5 text-xs font-mono rounded',
                isDark
                  ? 'bg-teal-500/20 text-teal-300'
                  : 'bg-teal-100 text-teal-700'
              )}>E</kbd>
              <span className={cn(
                'text-xs ml-1',
                isDark ? 'text-teal-400' : 'text-teal-600'
              )}>执行</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 小型空状态 ====================

interface MiniEmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function MiniEmptyState({
  message = '暂无内容',
  icon = <Sparkles className="w-8 h-8" />,
  action
}: MiniEmptyStateProps) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={cn(
        'mb-3',
        isDark ? 'text-blue-400' : 'text-blue-400'
      )}>
        {icon}
      </div>
      <p className={cn(
        'text-sm mb-4',
        isDark ? 'text-slate-300' : 'text-gray-600'
      )}>{message}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={isDark ? 'secondary' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ==================== 加载状态 ====================

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = '加载中...' }: LoadingStateProps) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="relative">
        <div className={cn(
          'w-12 h-12 border-4 rounded-full animate-spin',
          isDark
            ? 'border-blue-900 border-t-blue-500'
            : 'border-blue-200 border-t-blue-600'
        )} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className={cn(
            'w-5 h-5 animate-pulse',
            isDark ? 'text-blue-500' : 'text-blue-600'
          )} />
        </div>
      </div>
      <p className={cn(
        'text-sm mt-4',
        isDark ? 'text-slate-300' : 'text-gray-600'
      )}>{message}</p>
    </div>
  );
}

// ==================== 错误状态 ====================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = '出错了',
  message = '遇到一些问题，请稍后重试',
  onRetry
}: ErrorStateProps) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center mb-4',
        isDark
          ? 'bg-red-900/30'
          : 'bg-red-100'
      )}>
        <svg className={cn(
          'w-8 h-8',
          isDark ? 'text-red-400' : 'text-red-600'
        )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        isDark ? 'text-red-300' : 'text-gray-800'
      )}>{title}</h3>
      <p className={cn(
        'text-sm mb-4 max-w-md',
        isDark ? 'text-red-400' : 'text-gray-600'
      )}>{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant={isDark ? 'secondary' : 'outline'}
          className="gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001.0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重试
        </Button>
      )}
    </div>
  );
}
