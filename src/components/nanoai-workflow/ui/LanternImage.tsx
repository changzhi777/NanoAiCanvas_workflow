/**
 * 灯笼图位组件 — 多层 box-shadow 悬浮灯笼视觉
 *
 * states: empty | uploading | done | failed
 * 用法：<LanternImage label="请上传人物" value={url} onChange={...} status="empty" />
 */
import { memo, useCallback, useRef } from 'react';
import { Camera, Package, X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LanternStatus = 'empty' | 'uploading' | 'done' | 'failed';

export interface LanternImageProps {
  label: string;             // 占位文案（如"请上传人物"）
  value: string | null;       // 上传后的 URL（base64 / http）
  onChange: (file: File | null) => void;  // null = 删除
  status?: LanternStatus;
  /** 主体类型图标：默认人脸；产品场景用 package 图标 */
  variant?: 'character' | 'object';
  className?: string;
}

export const LanternImage = memo(function LanternImage({
  label,
  value,
  onChange,
  status = 'empty',
  variant = 'character',
  className,
}: LanternImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => inputRef.current?.click(), []);
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = '';
  }, [onChange]);
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  }, [onChange]);

  const Icon = variant === 'character' ? Camera : Package;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'uploading'}
        className={cn(
          'group relative w-20 h-20 rounded-2xl overflow-hidden',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          // 灯笼视觉：多层阴影 + 边框
          'border-2 border-dashed',
          'shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
          'hover:shadow-[0_8px_24px_rgba(59,130,246,0.18),0_4px_8px_rgba(59,130,246,0.08)]',
          'hover:-translate-y-0.5',
          // 状态色
          status === 'done' && 'border-solid border-blue-500/40',
          status === 'failed' && 'border-red-500/60',
          status === 'empty' && 'border-white/15 hover:border-blue-400',
          status === 'uploading' && 'border-blue-500 animate-pulse',
          isDark ? 'bg-slate-800/40' : 'bg-gray-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* 删除按钮 */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
            {/* 角标：物体图加金色边框提示 */}
            {variant === 'object' && (
              <div className="absolute bottom-1 left-1 text-[9px] px-1 rounded bg-amber-500/80 text-white">
                产品
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/40">
            {status === 'uploading' ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            ) : status === 'failed' ? (
              <AlertCircle className="w-6 h-6 text-red-500" />
            ) : (
              <Icon className="w-6 h-6 group-hover:text-blue-400 transition-colors" />
            )}
          </div>
        )}

        {/* 上传中覆盖层 */}
        {status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </button>
      <span className={cn(
        'text-[10px]',
        status === 'failed' ? 'text-red-400' : isDark ? 'text-slate-400' : 'text-gray-500'
      )}>
        {label}
      </span>
    </div>
  );
});
