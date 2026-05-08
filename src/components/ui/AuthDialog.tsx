import { useState } from 'react';
import { useAuthStore } from '@/stores/remoteStore';
import { auth, type AuthErrorType, setApiKey } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { User, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, ChevronDown } from 'lucide-react';

export const AUTH_ERROR_MESSAGES: Record<AuthErrorType | 'unknown' | 'rate_limited', { title: string; description: string }> = {
  invalid_credentials: {
    title: '账号或密码错误',
    description: '请检查邮箱和密码是否正确，注意大小写',
  },
  user_not_found: {
    title: '账号不存在',
    description: '请检查邮箱是否正确，或先注册账号',
  },
  account_disabled: {
    title: '账号已被禁用',
    description: '请联系客服了解详情',
  },
  rate_limited: {
    title: '登录尝试过多',
    description: '账号已被临时锁定，请稍后再试',
  },
  network_error: {
    title: '网络连接失败',
    description: '请检查网络后重试',
  },
  server_error: {
    title: '服务暂不可用',
    description: '请稍后重试',
  },
  unknown: {
    title: '操作失败',
    description: '请稍后重试',
  },
};

const EMAIL_DOMAINS = ['caohua.com', 'nanoai.fun', 'qq.com'];

const STATUS_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  pending: {
    title: '账号待审核',
    description: '您的注册申请已提交，请等待管理员审核通过后再登录',
  },
  rejected: {
    title: '注册申请被拒绝',
    description: '您的注册申请未通过审核，请联系管理员了解详情',
  },
};

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = 'login' | 'register' | 'register-success' | 'forgot-password' | 'reset-password';

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<DialogMode>('login');
  const [loading, setLoading] = useState(false);

  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState(EMAIL_DOMAINS[0]);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot / Reset password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const { toast } = useToast();

  const fullEmail = `${emailPrefix}@${emailDomain}`;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await auth.login(fullEmail, password, rememberMe);
      setToken(result.access_token, result.refresh_token);

      const u = result.user;
      setUser({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role as 'admin' | 'user' | undefined,
        avatarUrl: u.avatar_url,
      });

      if (u.api_key) {
        setApiKey(u.api_key);
      }

      toast.success('登录成功');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      handleAuthError(err, 'login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await auth.register({ username, email: fullEmail, password });
      setMode('register-success');
    } catch (err: any) {
      handleAuthError(err, 'register');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await auth.forgotPassword(forgotEmail);
      setForgotSent(true);
      toast.success('重置链接已发送到您的邮箱');
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(resetToken, newPassword);
      toast.success('密码重置成功，请登录');
      setMode('login');
      resetForm();
    } catch (err: any) {
      toast.error(err.message || '重置失败，链接可能已过期');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') handleLogin();
    else if (mode === 'register') handleRegister();
    else if (mode === 'forgot-password') handleForgotPassword();
    else if (mode === 'reset-password') handleResetPassword();
  };

  const handleAuthError = (err: any, action: 'login' | 'register') => {
    const errorType = err.errorType as AuthErrorType | undefined;
    if (errorType && AUTH_ERROR_MESSAGES[errorType]) {
      const msg = AUTH_ERROR_MESSAGES[errorType];
      toast.error(`${msg.title}：${msg.description}`);
    } else if (err.status === 429) {
      toast.error('登录尝试过多，账号已被临时锁定，请稍后再试');
    } else if (err.status === 403) {
      const detail = err.message || '';
      let statusKey = 'pending';
      if (detail.includes('reject') || detail.includes('拒绝')) statusKey = 'rejected';
      const statusMsg = STATUS_ERROR_MESSAGES[statusKey];
      toast.error(`${statusMsg.title}：${statusMsg.description}`);
    } else if (err.status === 401) {
      const msg = AUTH_ERROR_MESSAGES.invalid_credentials;
      toast.error(`${msg.title}：${msg.description}`);
    } else if (err.status === 0 || err.message?.includes('fetch') || err.message?.includes('network')) {
      const msg = AUTH_ERROR_MESSAGES.network_error;
      toast.error(`${msg.title}：${msg.description}`);
    } else {
      toast.error(err instanceof Error ? err.message : (action === 'login' ? '登录失败' : '注册失败'));
    }
  };

  const resetForm = () => {
    setEmailPrefix('');
    setEmailDomain(EMAIL_DOMAINS[0]);
    setPassword('');
    setUsername('');
    setForgotEmail('');
    setResetToken('');
    setNewPassword('');
    setForgotSent(false);
  };

  const switchMode = (newMode: DialogMode) => {
    resetForm();
    setMode(newMode);
  };

  // Title and description based on mode
  const getTitle = () => {
    switch (mode) {
      case 'login': return '登录';
      case 'register': return '注册';
      case 'register-success': return '注册成功';
      case 'forgot-password': return '忘记密码';
      case 'reset-password': return '重置密码';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return '登录以同步您的数据和资产到云端';
      case 'register': return '创建账号开始使用云同步功能';
      case 'register-success': return '请等待管理员审核';
      case 'forgot-password': return '输入注册邮箱，我们将发送重置链接';
      case 'reset-password': return '输入新密码完成重置';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {/* Register success */}
        {mode === 'register-success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">注册申请已提交</p>
              <p className="text-xs text-muted-foreground">
                您的账号 <span className="font-medium text-foreground">{fullEmail}</span> 正在等待管理员审核
              </p>
              <p className="text-xs text-muted-foreground">审核通过后即可登录使用</p>
            </div>
            <Button variant="outline" onClick={() => { resetForm(); setMode('login'); }} className="w-full">
              我知道了，去登录
            </Button>
          </div>
        )}

        {mode !== 'register-success' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Register: Username */}
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          )}

          {/* Email input: prefix + domain selector (login & register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="group relative flex">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="邮箱前缀"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                required
                className="pl-9 rounded-r-none border-r-0 flex-1 min-w-0 focus-visible:z-[1] focus-visible:rounded-r-md"
              />
              <div className="flex items-center border-y border-l bg-muted/40 text-muted-foreground text-sm px-1.5 select-none">
                @
              </div>
              <Select value={emailDomain} onValueChange={setEmailDomain}>
                <SelectTrigger className="w-[140px] rounded-l-none border-l-0 gap-0 focus:z-[1] focus:rounded-l-md [&>svg]:opacity-60">
                  <SelectValue />
                  <ChevronDown className="h-3.5 w-3.5 ml-auto shrink-0" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Forgot password: full email input */}
          {mode === 'forgot-password' && !forgotSent && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="注册时使用的邮箱"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          )}

          {/* Forgot password: sent confirmation */}
          {mode === 'forgot-password' && forgotSent && (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">重置链接已发送到您的邮箱</p>
              <p className="text-xs text-muted-foreground">请查收邮件并点击链接重置密码</p>
            </div>
          )}

          {/* Reset password: token + new password */}
          {mode === 'reset-password' && (
            <>
              <Input
                type="text"
                placeholder="重置令牌（从邮件链接获取）"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </>
          )}

          {/* Password (login & register) */}
          {(mode === 'login' || mode === 'register') && (
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
          )}

          {/* Remember me (login only) */}
          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/50"
                />
                <span>保持登录（30天）</span>
              </label>
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-sm text-primary hover:underline"
              >
                忘记密码？
              </button>
            </div>
          )}

          {/* Submit button */}
          {!(mode === 'forgot-password' && forgotSent) && (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  处理中...
                </>
              ) : mode === 'login' ? '登录' : mode === 'register' ? '注册' : mode === 'forgot-password' ? '发送重置链接' : '重置密码'}
            </Button>
          )}
        </form>
        )}

        {/* Mode switch */}
        {(mode === 'login' || mode === 'register') && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或者</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {mode === 'login' && (
            <Button variant="outline" onClick={() => switchMode('register')} className="w-full">
              没有账号？立即注册
            </Button>
          )}
          {mode === 'register' && (
            <Button variant="outline" onClick={() => switchMode('login')} className="w-full">
              已有账号？登录
            </Button>
          )}
          {mode === 'forgot-password' && (
            <Button variant="outline" onClick={() => switchMode('login')} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回登录
            </Button>
          )}
          {mode === 'reset-password' && (
            <Button variant="outline" onClick={() => switchMode('login')} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回登录
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
