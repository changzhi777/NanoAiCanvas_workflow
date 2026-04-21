import { useState, useEffect, useRef } from 'react';
import { Info, AlertCircle, CheckCircle, XCircle, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 工具提示 ====================

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', align = 'center', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const alignStyles = {
    start: side === 'top' || side === 'bottom' ? 'left-0' : '',
    center: 'left-1/2 -translate-x-1/2',
    end: side === 'top' || side === 'bottom' ? 'right-0' : '',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg',
            'shadow-lg',
            'animate-in fade-in slide-in-from-top-1 duration-200',
            positionStyles[side],
            alignStyles[align as keyof typeof alignStyles]
          )}
        >
          {typeof content === 'string' ? (
            <>
              {content}
              {/* 小箭头 */}
              <div
                className={cn(
                  'absolute w-2 h-2 bg-gray-900 rotate-45',
                  side === 'top' && 'bottom-[-5px] left-1/2 -translate-x-1/2',
                  side === 'bottom' && 'top-[-5px] left-1/2 -translate-x-1/2',
                  side === 'left' && 'right-[-5px] top-1/2 -translate-y-1/2',
                  side === 'right' && 'left-[-5px] top-1/2 -translate-y-1/2'
                )}
              />
            </>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 通知组件 ====================

interface NotificationProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Notification({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeConfig = {
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-top-2 duration-300',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('text-sm font-semibold mb-1', config.titleColor)}>
            {title}
          </h4>
        )}
        <p className="text-sm text-gray-700">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ==================== Toast 通知容器 ====================

interface Toast {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastContainer({ toasts, onRemove, position = 'top-right' }: ToastContainerProps) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 space-y-2 max-w-sm w-full',
        positionStyles[position]
      )}
    >
      {toasts.map((toast) => (
        <Notification
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

// ==================== 帮助提示 ====================

interface HelpTooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

export function HelpTooltip({ title, content, children }: HelpTooltipProps) {
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="font-semibold">{title}</div>
          <div className="text-xs opacity-90">{content}</div>
        </div>
      }
    >
      <div className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-help">
        <HelpCircle className="w-4 h-4" />
        {children}
      </div>
    </Tooltip>
  );
}

// ==================== 徽章 ====================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'md', dot }: BadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size]
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// ==================== 标签 ====================

interface TagProps {
  children: React.ReactNode;
  color?: 'blue' | 'cyan' | 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
}

export function Tag({ children, color = 'blue', size = 'md', removable, onRemove }: TagProps) {
  const colorStyles = {
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    cyan: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    red: 'bg-red-100 text-red-700 hover:bg-red-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        colorStyles[color],
        sizeStyles[size]
      )}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
