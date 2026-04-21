import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ProgressProps {
  progress: number;
  message: string;
  status: 'running' | 'success' | 'error' | 'idle';
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({
  progress,
  message,
  status,
  showPercentage = true,
  size = 'md'
}: ProgressProps) {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const statusConfig = {
    running: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      progressColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-800',
      icon: <Loader2 className={cn('animate-spin', iconSize[size])} />,
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      progressColor: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-green-800',
      icon: <CheckCircle2 className={iconSize[size]} />,
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      progressColor: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-red-800',
      icon: <XCircle className={iconSize[size]} />,
    },
    idle: {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      progressColor: 'bg-gradient-to-r from-gray-500 to-gray-600',
      textColor: 'text-gray-800',
      icon: <AlertCircle className={iconSize[size]} />,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all duration-200',
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('text-blue-600', config.textColor)}>
            {config.icon}
          </div>
          <span className={cn('text-sm font-medium', config.textColor)}>
            {message}
          </span>
        </div>
        {showPercentage && (
          <span className={cn('text-sm font-semibold', config.textColor)}>
            {progress}%
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            config.progressColor,
            'relative overflow-hidden'
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          {/* 动画光效 */}
          {status === 'running' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 步骤进度条 ====================

interface StepProgressProps {
  steps: Array<{
    title: string;
    description?: string;
    status: 'pending' | 'running' | 'success' | 'error';
  }>;
  currentStep: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;

        const statusColor = {
          pending: 'bg-gray-200 border-gray-300',
          running: 'bg-blue-500 border-blue-600 animate-pulse',
          success: 'bg-green-500 border-green-600',
          error: 'bg-red-500 border-red-600',
        }[step.status];

        return (
          <div key={index} className="flex items-start gap-3">
            {/* 圆圈 */}
            <div className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200',
              statusColor
            )}>
              {step.status === 'success' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              )}
              {step.status === 'error' && (
                <XCircle className="w-3.5 h-3.5 text-white" />
              )}
              {step.status === 'running' && (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              )}
              {step.status === 'pending' && (
                <span className="text-xs text-gray-500">{index + 1}</span>
              )}
            </div>

            {/* 内容 */}
            <div className={cn(
              'flex-1 pb-4',
              index === steps.length - 1 && 'pb-0'
            )}>
              <div className={cn(
                'text-sm font-medium transition-colors duration-200',
                isCurrent ? 'text-blue-600' : step.status === 'success' ? 'text-green-600' : 'text-gray-700'
              )}>
                {step.title}
              </div>
              {step.description && (
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 加载骨架屏 ====================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
        'animate-shimmer',
        variantClasses[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// ==================== 结果卡片 ====================

interface ResultCardProps {
  title: string;
  description?: string;
  status: 'success' | 'error';
  onAction?: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
}

export function ResultCard({
  title,
  description,
  status,
  onAction,
  actionLabel,
  children,
}: ResultCardProps) {
  const config = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      titleColor: 'text-green-800',
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      titleColor: 'text-red-800',
    },
  }[status];

  return (
    <div className={cn('p-4 rounded-lg border', config.bgColor, config.borderColor)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm font-semibold mb-1', config.titleColor)}>
            {title}
          </h4>
          {description && (
            <p className="text-xs text-gray-600 mb-2">{description}</p>
          )}
          {children}
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className={cn(
                'mt-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200',
                status === 'success'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              )}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 添加自定义动画到 Tailwind 配置
// shimmer: { animation: 'shimmer 2s linear infinite', }
