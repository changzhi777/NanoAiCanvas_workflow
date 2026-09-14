import { useSyncStore, useAuthStore } from '../../../stores/remoteStore';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../tooltip';

export default function SyncStatusIndicator() {
  const status = useSyncStore((s) => s.status);
  const isOnline = useSyncStore((s) => s.isOnline);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const token = useAuthStore((s) => s.token);

  if (!token) return null;

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    idle: {
      icon: <Cloud className="h-4 w-4 text-green-500" />,
      label: '已同步',
      color: 'text-green-500',
    },
    syncing: {
      icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
      label: '同步中...',
      color: 'text-blue-500',
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      label: '同步失败',
      color: 'text-red-500',
    },
    offline: {
      icon: <CloudOff className="h-4 w-4 text-yellow-500" />,
      label: '离线',
      color: 'text-yellow-500',
    },
  };

  const config = statusConfig[isOnline ? status : 'offline'];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 ${config.color}`}>
          {config.icon}
          <span className="text-xs font-medium">{config.label}</span>
          {status === 'idle' && isOnline && (
            <Check className="h-3 w-3" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <p>状态：{config.label}</p>
          {lastSyncAt && (
            <p>上次同步：{new Date(lastSyncAt).toLocaleTimeString()}</p>
          )}
          {!isOnline && (
            <p className="text-yellow-500">网络已断开，数据将在恢复后自动同步</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}