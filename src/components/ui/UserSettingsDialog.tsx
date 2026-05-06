import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/remoteStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/hooks/useI18n';
import { LogOut, Users, Puzzle, Camera, Globe, Sun, Moon, Trash2, Settings, Zap } from 'lucide-react';
import { CollaborationPanel } from '@/components/nanoai-workflow/ui/CollaborationPanel';
import { PluginManagerDialog } from '@/components/nanoai-workflow/ui/PluginManagerDialog';
import { useTheme } from '@/components/nanoai-workflow/ui/Theme';
import { usePoints } from '@/hooks/usePoints';
import { Loader2 } from 'lucide-react';

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const [collaborationDialogOpen, setCollaborationDialogOpen] = useState(false);
  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('nanoai_avatar') : null
  );
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { toast } = useToast();
  const { locale, changeLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const { balance } = usePoints();

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      if (customAvatar) {
        localStorage.setItem('nanoai_avatar', customAvatar);
      }
      if (newUsername.trim()) {
        localStorage.setItem('nanoai_username', newUsername.trim());
      }
      useAuthStore.getState().setUser({
        ...user!,
        username: newUsername.trim() || user?.username || '',
      });
      toast.success('配置已保存');
      setEditingUsername(false);
    } catch (err) {
      console.error('保存配置失败:', err);
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelUsername = () => {
    setNewUsername(user?.username || '');
    setEditingUsername(false);
  };

  const avatarUrl = customAvatar || `https://ui-avatars.com/api/?name=${user?.username}&background=168,70%,45%&color=fff&size=128`;
  const initial = user?.username?.charAt(0).toUpperCase() || 'U';

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('头像图片不能超过 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomAvatar(event.target?.result as string);
        toast.success('头像已更新');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLanguageSwitch = () => {
    const newLang = locale === 'zh-CN' ? 'en-US' : 'zh-CN';
    changeLanguage(newLang);
    toast.success(`语言已切换为 ${newLang === 'zh-CN' ? '中文' : 'English'}`);
  };

  const handleClearCache = () => {
    if (confirm('确定要清除本地缓存吗？此操作不可撤销。')) {
      localStorage.clear();
      toast.success('本地缓存已清除');
      window.location.reload();
    }
  };

  const handleStartEditUsername = () => {
    setNewUsername(user?.username || '');
    setEditingUsername(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>用户设置</DialogTitle>
            <DialogDescription>
              管理您的账户信息、偏好设置和系统选项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* 用户信息区域 */}
            <div className="flex items-center gap-4">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarError ? (
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium">
                    {initial}
                  </div>
                ) : (
                  <img
                    src={avatarUrl}
                    alt={user?.username}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                    onError={() => setAvatarError(true)}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="flex-1">
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="flex-1 px-2 py-1 text-lg font-medium bg-background border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveConfig();
                        if (e.key === 'Escape') handleCancelUsername();
                      }}
                    />
                    <Button size="sm" onClick={handleSaveConfig}>保存</Button>
                    <Button size="sm" onClick={handleCancelUsername}>取消</Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1"
                    onClick={handleStartEditUsername}
                  >
                    <p className="text-lg font-medium">{user?.username}</p>
                    <span className="text-xs text-muted-foreground">点击修改</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{balance.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">积分</span>
                </div>
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false);
                  window.location.href = '/nanoaicanvas/admin';
                }}
              >
                <Settings className="h-4 w-4" />
                管理后台
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleLanguageSwitch}
              >
                <Globe className="h-4 w-4" />
                语言：{locale === 'zh-CN' ? '中文' : 'English'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={toggleTheme}
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                主题：{isDark ? '深色' : '浅色'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false);
                  setCollaborationDialogOpen(true);
                }}
              >
                <Users className="h-4 w-4" />
                协作
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onOpenChange(false);
                  setPluginDialogOpen(true);
                }}
              >
                <Puzzle className="h-4 w-4" />
                插件管理
              </Button>
            </div>

            {/* 分隔线 */}
            <div className="border-t" />

            {/* 系统操作 */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-orange-600 hover:text-orange-600 hover:bg-orange-50"
                onClick={handleClearCache}
              >
                <Trash2 className="h-4 w-4" />
                清除本地缓存
              </Button>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={handleSaveConfig}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              保存配置
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                toast.success('已退出登录');
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CollaborationPanel
        open={collaborationDialogOpen}
        onOpenChange={setCollaborationDialogOpen}
      />
      <PluginManagerDialog
        open={pluginDialogOpen}
        onOpenChange={setPluginDialogOpen}
      />
    </>
  );
}
