'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Save,
  Database,
  Globe,
  Lock,
  Bell,
  Cpu,
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { NodeExecutionConfig, DEFAULT_NODE_CONFIG } from '@/types/workflow-node-config'

// 节点配置存储键
const NODE_CONFIG_STORAGE_KEY = 'nanoai_node_config'

// 系统配置数据
const systemConfig = {
  api: {
    baseUrl: typeof window !== 'undefined'
      ? (import.meta.env.VITE_API_BASE_URL || window.location.origin + '/api')
      : '/api',
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

// 加载保存的节点配置
function loadNodeConfig(): NodeExecutionConfig {
  if (typeof window === 'undefined') return DEFAULT_NODE_CONFIG
  try {
    const saved = localStorage.getItem(NODE_CONFIG_STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_NODE_CONFIG, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('加载节点配置失败:', e)
  }
  return DEFAULT_NODE_CONFIG
}

// 保存节点配置
function saveNodeConfig(config: NodeExecutionConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NODE_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('保存节点配置失败:', e)
  }
}

export default function SystemPage() {
  // 节点配置状态
  const [nodeConfig, setNodeConfig] = useState<NodeExecutionConfig>(DEFAULT_NODE_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)

  // 加载保存的配置
  useEffect(() => {
    const config = loadNodeConfig()
    setNodeConfig(config)
    setIsLoaded(true)
  }, [])

  // 保存配置
  const handleSave = () => {
    saveNodeConfig(nodeConfig)
    toast.success('系统配置已保存')
  }

  // 更新节点配置
  const updateNodeConfig = (key: keyof NodeExecutionConfig, value: any) => {
    setNodeConfig((prev) => ({ ...prev, [key]: value }))
  }

  if (!isLoaded) {
    return <div className="p-8">加载中...</div>
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

      {/* 后台 API 节点配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">后台 API 节点配置</CardTitle>
          </div>
          <CardDescription>配置工作流中 AI 节点的执行参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 节点超时时间 */}
            <div className="space-y-2">
              <Label htmlFor="nodeTimeout">节点超时时间 (ms)</Label>
              <Input
                id="nodeTimeout"
                type="number"
                value={nodeConfig.timeout}
                onChange={(e) => updateNodeConfig('timeout', Number(e.target.value))}
                min={5000}
                max={300000}
                step={5000}
              />
              <p className="text-xs text-muted-foreground">单个节点执行的最大等待时间</p>
            </div>

            {/* 节点重试次数 */}
            <div className="space-y-2">
              <Label htmlFor="retryCount">节点重试次数</Label>
              <Input
                id="retryCount"
                type="number"
                value={nodeConfig.retryCount}
                onChange={(e) => updateNodeConfig('retryCount', Number(e.target.value))}
                min={0}
                max={10}
              />
              <p className="text-xs text-muted-foreground">节点执行失败时的重试次数</p>
            </div>

            {/* 最大并发节点数 */}
            <div className="space-y-2">
              <Label htmlFor="maxConcurrent">最大并发节点数</Label>
              <Input
                id="maxConcurrent"
                type="number"
                value={nodeConfig.maxConcurrent}
                onChange={(e) => updateNodeConfig('maxConcurrent', Number(e.target.value))}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">同时执行的节点数量上限</p>
            </div>

            {/* 节点池大小 */}
            <div className="space-y-2">
              <Label htmlFor="nodePoolSize">节点池大小</Label>
              <Input
                id="nodePoolSize"
                type="number"
                value={nodeConfig.nodePoolSize}
                onChange={(e) => updateNodeConfig('nodePoolSize', Number(e.target.value))}
                min={1}
                max={50}
              />
              <p className="text-xs text-muted-foreground">预创建的节点实例数量</p>
            </div>

            {/* 执行模式 */}
            <div className="space-y-2">
              <Label htmlFor="executionMode">执行模式</Label>
              <Select
                value={nodeConfig.executionMode}
                onValueChange={(value) => updateNodeConfig('executionMode', value as 'sync' | 'async')}
              >
                <SelectTrigger id="executionMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sync">同步执行</SelectItem>
                  <SelectItem value="async">异步执行</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">同步: 等待完成; 异步: 后台执行</p>
            </div>

            {/* 启用节点缓存 */}
            <div className="space-y-2">
              <Label>节点缓存</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={nodeConfig.nodeCacheEnabled}
                  onCheckedChange={(checked) => updateNodeConfig('nodeCacheEnabled', checked)}
                />
                <span className="ml-3 text-sm">
                  {nodeConfig.nodeCacheEnabled ? '已启用' : '已禁用'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">缓存已执行节点结果加速重复调用</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API 配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">API 配置</CardTitle>
          </div>
          <CardDescription>API 服务连接参数</CardDescription>
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