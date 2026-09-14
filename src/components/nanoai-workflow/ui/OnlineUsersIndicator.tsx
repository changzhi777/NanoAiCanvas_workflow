import { Users } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { cn } from '@/lib/utils';

export function OnlineUsersIndicator() {
  // 使用 Zustand 选择器，自动订阅变化，避免轮询
  const isEnabled = useCollaborationStore(state => state.isEnabled);
  const isConnected = useCollaborationStore(state => state.isConnected);
  const onlineCount = useCollaborationStore(state =>
    Array.from(state.users.values()).filter(u => u.isConnected).length
  );

  if (!isEnabled) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        'cursor-pointer hover:scale-105',
        isConnected
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-600 border border-gray-300'
      )}
      title={isConnected ? '协作已连接' : '协作未连接'}
    >
      <Users className="w-3.5 h-3.5" />
      <span>{onlineCount}</span>
    </div>
  );
}
