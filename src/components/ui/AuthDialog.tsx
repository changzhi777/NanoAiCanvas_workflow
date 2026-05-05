import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/remoteStore';
import { auth } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import { User, Mail, Lock, Loader2, Eye, EyeOff, LogOut, Users, Puzzle, Camera, Globe, Sun, Moon, Trash2, Settings, Zap } from 'lucide-react';
import { CollaborationPanel } from '@/components/nanoai-workflow/ui/CollaborationPanel';
import { PluginManagerDialog } from '@/components/nanoai-workflow/ui/PluginManagerDialog';
import { useTheme } from '@/components/nanoai-workflow/ui/Theme';
import { usePoints } from '@/hooks/usePoints';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await auth.login(email, password, rememberMe);
      } else {
        result = await auth.register({ username, email, password });
      }

      setToken(result.access_token, result.refresh_token);

      const userInfo = await auth.me(result.access_token);
      setUser({
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email,
        imageApiKey: userInfo.imageApiKey,
        textApiKey: userInfo.textApiKey,
      });

      toast.success(mode === 'login' ? '登录成功' : '注册成功');
      onOpenChange(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : (mode === 'login' ? '登录失败' : '注册失败');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? '登录' : '注册'}</DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? '登录以同步您的数据和资产到云端'
              : '创建账号开始使用云同步功能'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={mode === 'register'}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 保持登录状态 */}
          {mode === 'login' && (
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/50"
                />
                <span>保持登录状态（30天有效）</span>
              </label>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {mode === 'login' ? '登录中...' : '注册中...'}
              </>
            ) : mode === 'login' ? (
              '登录'
            ) : (
              '注册'
            )}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">或者</span>
          </div>
        </div>

        <Button variant="outline" onClick={toggleMode} className="w-full">
          {mode === 'login' ? '没有账号？立即注册' : '已有账号？登录'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
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
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { toast } = useToast();
  const { locale, changeLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const { balance } = usePoints();

  // 保存配置 - 头像保存到本地，用户名保存到本地
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // 1. 保存头像到本地
      if (customAvatar) {
        localStorage.setItem('nanoai_avatar', customAvatar);
      }
      // 2. 保存用户名到本地（后端 PUT /me 接口可能不可用）
      if (newUsername.trim()) {
        localStorage.setItem('nanoai_username', newUsername.trim());
      }
      // 3. 更新本地用户状态
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

  // 取消编辑用户名
  const handleCancelUsername = () => {
    setNewUsername(user?.username || '');
    setEditingUsername(false);
  };

  // 使用自定义头像或默认 UI Avatars
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

  
  if (token && user) {

    return (
      <>
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

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
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
                      alt={user.username}
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
                      <p className="text-lg font-medium">{user.username}</p>
                      <span className="text-xs text-muted-foreground">点击修改</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{user.email}</p>
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
                    setSettingsOpen(false);
                    window.location.href = '/admin';
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
                    setSettingsOpen(false);
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
                    setSettingsOpen(false);
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
                  setSettingsOpen(false);
                }}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 协作面板 */}
        <CollaborationPanel
          open={collaborationDialogOpen}
          onOpenChange={setCollaborationDialogOpen}
        />

        {/* 插件管理对话框 */}
        <PluginManagerDialog
          open={pluginDialogOpen}
          onOpenChange={setPluginDialogOpen}
        />
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

  