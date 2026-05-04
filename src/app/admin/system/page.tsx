'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  Save,
  RefreshCw,
  Database,
  Globe,
  Lock,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'

// 系统配置数据
const systemConfig = {
  api: {
    baseUrl: 'https://api.wuyinkeji.com',
    timeout: 30000,
    retryAttempts: 3,
  },
  database: {
    maxConnections: 100,
    poolSize: 10,
  },
  security: {
    jwtSecret: '********',
    tokenExpireMinutes: 30,
    refreshTokenExpireDays: 7,
  },
  notifications: {
    emailEnabled: true,
    webhookEnabled: false,
  },
}

export default function SystemPage() {
  const handleSave = () => {
    toast.success('系统配置已保存')
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="系统配置"
        subtitle="系统参数和功能设置"
        action={
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存配置
          </Button>
        }
      />

      {/* API 配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">API 配置</CardTitle>
          </div>
          <CardDescription>配置API服务连接参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API 基础地址</Label>
              <Input
                id="apiBaseUrl"
                defaultValue={systemConfig.api.baseUrl}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiTimeout">请求超时 (ms)</Label>
              <Input
                id="apiTimeout"
                type="number"
                defaultValue={systemConfig.api.timeout}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retryAttempts">重试次数</Label>
              <Input
                id="retryAttempts"
                type="number"
                defaultValue={systemConfig.api.retryAttempts}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据库配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">数据库配置</CardTitle>
          </div>
          <CardDescription>数据库连接池设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxConnections">最大连接数</Label>
              <Input
                id="maxConnections"
                type="number"
                defaultValue={systemConfig.database.maxConnections}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poolSize">连接池大小</Label>
              <Input
                id="poolSize"
                type="number"
                defaultValue={systemConfig.database.poolSize}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">安全配置</CardTitle>
          </div>
          <CardDescription>JWT和认证相关配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jwtSecret">JWT 密钥</Label>
              <Input
                id="jwtSecret"
                type="password"
                defaultValue={systemConfig.security.jwtSecret}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenExpire">Token 过期时间 (分钟)</Label>
              <Input
                id="tokenExpire"
                type="number"
                defaultValue={systemConfig.security.tokenExpireMinutes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refreshTokenExpire">刷新 Token 过期 (天)</Label>
              <Input
                id="refreshTokenExpire"
                type="number"
                defaultValue={systemConfig.security.refreshTokenExpireDays}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 通知配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">通知配置</CardTitle>
          </div>
          <CardDescription>系统通知和提醒设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">邮件通知</p>
              <p className="text-sm text-muted-foreground">任务完成和告警通知</p>
            </div>
            <Button variant="outline" size="sm">
              {systemConfig.notifications.emailEnabled ? '已启用' : '已禁用'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Webhook 通知</p>
              <p className="text-sm text-muted-foreground">外部系统集成通知</p>
            </div>
            <Button variant="outline" size="sm">
              {systemConfig.notifications.webhookEnabled ? '已启用' : '已禁用'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}