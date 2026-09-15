/**
 * 迷你视频播放器 — 内嵌 TvcScriptNode
 *
 * props.src 为 /asset-uploads/xx.mp4 或外链
 * 元数据条：时长 / 构图 / 叙事 / 种子号（右上角小图标可触发"再生成一次"）
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, RefreshCw, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MiniVideoPlayerProps {
  src: string;
  meta?: {
    duration?: number;
    composition?: string;
    narrative?: string;
    composition_seed?: string;
  };
  onRegenerate?: () => void;  // "再生成一次"
  className?: string;
}

export const MiniVideoPlayer = memo(function MiniVideoPlayer({
  src,
  meta,
  onRegenerate,
  className,
}: MiniVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);  // 默认静音，避免自动播放限制
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(meta?.duration ?? 0);

  useEffect(() => {
    setPlaying(false); setTime(0); setDuration(meta?.duration ?? 0);
  }, [src, meta?.duration]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const onTimeUpdate = useCallback(() => {
    setTime(videoRef.current?.currentTime ?? 0);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, []);

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className={cn(
      'group relative w-full rounded-xl overflow-hidden bg-black/40',
      'border border-white/10',
      'shadow-[0_4px_16px_rgba(0,0,0,0.15)]',
      className,
    )}>
      {/* 视频区 */}
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={src}
          muted={muted}
          playsInline
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onClick={togglePlay}
          className="w-full h-full object-contain bg-black cursor-pointer"
        />
        {!playing && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-7 h-7 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* 控件条 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
             onClick={(e) => {
               const v = videoRef.current;
               if (!v || duration <= 0) return;
               const rect = e.currentTarget.getBoundingClientRect();
               v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
             }}>
          <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
        </div>

        <span className="text-[10px] font-mono text-white/80 min-w-[60px] text-right">
          {fmt(time)} / {fmt(duration)}
        </span>

        <button
          onClick={toggleMute}
          className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80"
          title="下载"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </a>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80"
            title="再生成一次（复用 composition_seed）"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 元数据条 */}
      {meta && (meta.composition || meta.narrative || meta.composition_seed) && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border-t border-white/5 bg-white/[0.02]">
          <Film className="w-3 h-3 text-blue-400" />
          {meta.composition && (
            <span className="px-1.5 rounded bg-purple-500/15 text-purple-300">{meta.composition}</span>
          )}
          {meta.narrative && (
            <span className="px-1.5 rounded bg-blue-500/15 text-blue-300">{meta.narrative}</span>
          )}
          {meta.composition_seed && (
            <span className="ml-auto text-white/40">seed:{meta.composition_seed.slice(0, 6)}</span>
          )}
        </div>
      )}
    </div>
  );
});
