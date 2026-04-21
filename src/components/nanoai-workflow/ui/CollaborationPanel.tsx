import { useState } from 'react';
import { Users, Wifi, WifiOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useTheme } from './Theme';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

interface CollaborationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollaborationPanel({ open, onOpenChange }: CollaborationPanelProps) {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const {
    isEnabled,
    isConnected,
    sessionId,
    userName,
    enableCollaboration,
    disableCollaboration,
    getOnlineUsers,
  } = useCollaborationStore();

  const [inputSessionId, setInputSessionId] = useState('');
  const [inputUserName, setInputUserName] = useState('');
  const onlineUsers = getOnlineUsers();

  const handleJoinSession = () => {
    if (inputSessionId.trim() && inputUserName.trim()) {
      enableCollaboration(inputSessionId.trim(), inputUserName.trim());
    }
  };

  const handleLeaveSession = () => {
    if (confirm(t('collaboration.leaveConfirm'))) {
      disableCollaboration();
      setInputSessionId('');
      setInputUserName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-md dialog-glass rounded-3xl'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            'text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
            isDark ? 'from-blue-400 to-cyan-400' : 'from-blue-600 to-cyan-600'
          )}>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              {t('collaboration.title')}
            </div>
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : ''}>
            {t('collaboration.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isEnabled ? (
            // 已加入会话
            <div className="space-y-4">
              {/* 会话信息 */}
              <div className={cn(
                'p-4 rounded-lg border',
                isDark ? 'bg-slate-800/50 border-white/5' : 'bg-gray-50 border-gray-200'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <span className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-slate-200' : 'text-gray-900'
                  )}>
                    {t('collaboration.sessionStatus')}
                  </span>
                  <div className={cn(
                    'flex items-center gap-1.5 text-sm',
                    isConnected
                      ? 'text-green-500'
                      : 'text-red-500'
                  )}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-4 h-4" />
                        <span>{t('collaboration.connected')}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4" />
                        <span>{t('collaboration.disconnected')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className={cn(
                    'flex justify-between',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    <span>{t('collaboration.sessionId')}:</span>
                    <span className="font-mono">{sessionId}</span>
                  </div>
                  <div className={cn(
                    'flex justify-between',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    <span>{t('collaboration.userName')}:</span>
                    <span>{userName}</span>
                  </div>
                </div>
              </div>

              {/* 在线用户 */}
              <div className={cn(
                'p-4 rounded-lg border',
                isDark ? 'bg-slate-800/50 border-white/5' : 'bg-gray-50 border-gray-200'
              )}>
                <div className={cn(
                  'text-sm font-medium mb-3',
                  isDark ? 'text-slate-200' : 'text-gray-900'
                )}>
                  {t('collaboration.onlineUsers')} ({onlineUsers.length})
                </div>
                {onlineUsers.length === 0 ? (
                  <div className={cn(
                    'text-center py-4 text-sm',
                    isDark ? 'text-slate-500' : 'text-gray-500'
                  )}>
                    {t('collaboration.noOnlineUsers')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onlineUsers.map((user) => (
                      <div
                        key={user.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded border',
                          isDark
                            ? 'bg-slate-700/30 border-white/5'
                            : 'bg-white border-gray-200'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className={cn(
                            'text-sm font-medium',
                            isDark ? 'text-slate-200' : 'text-gray-900'
                          )}>
                            {user.name}
                          </div>
                          <div className={cn(
                            'text-xs',
                            isDark ? 'text-slate-500' : 'text-gray-500'
                          )}>
                            {user.isConnected ? t('collaboration.online') : t('collaboration.offline')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <Button
                variant="outline"
                onClick={handleLeaveSession}
                className={cn(
                  'w-full',
                  'border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600',
                  isDark && 'hover:bg-red-900/30'
                )}
              >
                {t('collaboration.leaveSession')}
              </Button>
            </div>
          ) : (
            // 未加入会话
            <div className="space-y-4">
              <div className={cn(
                'p-4 rounded-lg border text-center',
                isDark
                  ? 'bg-blue-900/20 border-blue-800 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              )}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-70" />
                <p className="text-sm">
                  {t('collaboration.joinInfo')}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={cn(
                    'text-sm font-medium mb-1.5 block',
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  )}>
                    {t('collaboration.sessionIdLabel')}
                  </label>
                  <Input
                    value={inputSessionId}
                    onChange={(e) => setInputSessionId(e.target.value)}
                    placeholder={t('collaboration.sessionIdPlaceholder')}
                    className={isDark ? 'bg-white/5 border-white/10 text-slate-100' : ''}
                  />
                </div>
                <div>
                  <label className={cn(
                    'text-sm font-medium mb-1.5 block',
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  )}>
                    {t('collaboration.userNameLabel')}
                  </label>
                  <Input
                    value={inputUserName}
                    onChange={(e) => setInputUserName(e.target.value)}
                    placeholder={t('collaboration.userNamePlaceholder')}
                    className={isDark ? 'bg-white/5 border-white/10 text-slate-100' : ''}
                  />
                </div>
              </div>

              <Button
                onClick={handleJoinSession}
                disabled={!inputSessionId.trim() || !inputUserName.trim()}
                className={cn(
                  'w-full',
                  'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                )}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t('collaboration.joinSession')}
              </Button>
            </div>
          )}
        </div>

        {/* 使用提示 */}
        <div className={cn(
          'mt-4 p-3 rounded-lg border text-xs',
          isDark
            ? 'bg-slate-800/50 border-white/5 text-slate-400'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        )}>
          <strong>💡 {t('collaboration.features')}：</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>{t('collaboration.feature1')}</li>
            <li>{t('collaboration.feature2')}</li>
            <li>{t('collaboration.feature3')}</li>
            <li>{t('collaboration.feature4')}</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
