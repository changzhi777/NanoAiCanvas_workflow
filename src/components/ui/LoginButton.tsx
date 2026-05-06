import { useState } from 'react';
import { useAuthStore } from '@/stores/remoteStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { AuthDialog } from './AuthDialog';
import { UserSettingsDialog } from './UserSettingsDialog';
import { NotificationPopover } from './NotificationPopover';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const customAvatar = typeof window !== 'undefined'
    ? localStorage.getItem('nanoai_avatar')
    : null;
  const avatarUrl = customAvatar || `https://ui-avatars.com/api/?name=${user?.username}&background=168,70%,45%&color=fff&size=128`;
  const initial = user?.username?.charAt(0).toUpperCase() || 'U';

  if (token && user) {
    return (
      <>
        <div className="flex items-center gap-1">
          <NotificationPopover />
          <Tooltip>
            <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className={cn('gap-2 px-2 h-auto py-1', className)}
            >
              {avatarError ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium border-2 border-transparent hover:border-primary transition-colors">
                  {initial}
                </div>
              ) : (
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border-2 border-transparent hover:border-primary transition-colors"
                  onError={() => setAvatarError(true)}
                />
              )}
              <span className="text-sm font-medium leading-tight">{user.username}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p className="font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground">点击设置</p>
          </TooltipContent>
        </Tooltip>
        </div>
        <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAuthDialogOpen(true)}
        className={cn('gap-2', className)}
      >
        <User className="h-4 w-4" />
        登录
      </Button>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
