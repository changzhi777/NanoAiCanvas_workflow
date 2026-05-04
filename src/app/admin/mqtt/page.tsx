'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  TestTube,
  Loader2,
} from 'lucide-react'

interface MqttConfig {
  enabled: boolean
  qos: number
  broker_address: string
  port: number
  username: string
  password: string
  tls_enabled: boolean
  ca_cert_path: string
  topic_prefix: string
  storyboard_topic: string
  health_check_topic: string
  client_id: string
  keepalive: number
}

const defaultConfig: MqttConfig = {
  enabled: false,
  qos: 1,
  broker_address: 'mqtt.example.com',
  port: 1883,
  username: 'changzhi',
  password: '',
  tls_enabled: false,
  ca_cert_path: '../CA/emqxsl-ca.crt',
  topic_prefix: '',
  storyboard_topic: 'storyboard',
  health_check_topic: 'health',
  client_id: '',
  keepalive: 60,
}

export default function MqttPage() {
  const [config, setConfig] = useState<MqttConfig>(defaultConfig)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // 模拟保存
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('MQTT 配置已保存')
    } catch {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 1500))
      setConnectionStatus('connected')
      toast.success('MQTT 连接测试成功')
    } catch {
      setConnectionStatus('disconnected')
      toast.error('MQTT 连接测试失败')
    }
    setTesting(false)
  }

  const handleRefreshStatus = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.info('状态已刷新')
    }, 500)
  }

  const updateConfig = (key: keyof MqttConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="MQTT 配置"
        subtitle="配置 MQTT Broker 连接参数，管理消息通讯"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshStatus} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              刷新状态
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
              测试连接
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              保存配置
            </Button>
          </div>
        }
      />

      {/* 连接状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">连接状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">已连接</span>
                </>
              ) : connectionStatus === 'disconnected' ? (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-500 font-medium">未连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">未知</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Broker 地址</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">{config.broker_address}:{config.port}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TLS 加密</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={config.tls_enabled ? 'default' : 'secondary'}>
              {config.tls_enabled ? '已启用' : '未启用'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">启用状态</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? '启用' : '禁用'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* MQTT 配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle>MQTT 配置</CardTitle>
          <CardDescription>配置 MQTT Broker 连接参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">基本设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>启用 MQTT</Label>
                  <p className="text-xs text-muted-foreground">开启后将自动连接 MQTT Broker</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => updateConfig('enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qos">QoS 等级</Label>
                <Select value={String(config.qos)} onValueChange={(v) => updateConfig('qos', Number(v))}>
                  <SelectTrigger id="qos">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - 最多一次</SelectItem>
                    <SelectItem value="1">1 - 至少一次</SelectItem>
                    <SelectItem value="2">2 - 恰好一次</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 连接设置 */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">连接设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="broker_address">Broker 地址</Label>
                <Input
                  id="broker_address"
                  value={config.broker_address}
                  onChange={(e) => updateConfig('broker_address', e.target.value)}
                  placeholder="mqtt.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) => updateConfig('port', Number(e.target.value))}
                  placeholder="1883"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) => updateConfig('username', e.target.value)}
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={config.password}
                  onChange={(e) => updateConfig('password', e.target.value)}
                  placeholder="•••••••••"
                />
              </div>
            </div>
          </div>

          {/* TLS 设置 */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">TLS/SSL 设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>TLS/SSL</Label>
                  <p className="text-xs text-muted-foreground">启用 TLS 加密连接</p>
                </div>
                <Switch
                  checked={config.tls_enabled}
                  onCheckedChange={(checked) => updateConfig('tls_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ca_cert_path">CA 证书路径</Label>
                <Input
                  id="ca_cert_path"
                  value={config.ca_cert_path}
                  onChange={(e) => updateConfig('ca_cert_path', e.target.value)}
                  placeholder="相对路径，如 ../CA/emqxsl-ca.crt"
                />
              </div>
            </div>
          </div>

          {/* Topic 设置 */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Topic 设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic_prefix">Topic 前缀</Label>
                <Input
                  id="topic_prefix"
                  value={config.topic_prefix}
                  onChange={(e) => updateConfig('topic_prefix', e.target.value)}
                  placeholder="可选前缀"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storyboard_topic">故事板主题</Label>
                <Input
                  id="storyboard_topic"
                  value={config.storyboard_topic}
                  onChange={(e) => updateConfig('storyboard_topic', e.target.value)}
                  placeholder="storyboard"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_check_topic">健康检查主题</Label>
                <Input
                  id="health_check_topic"
                  value={config.health_check_topic}
                  onChange={(e) => updateConfig('health_check_topic', e.target.value)}
                  placeholder="health"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_id">客户端 ID</Label>
                <Input
                  id="client_id"
                  value={config.client_id}
                  onChange={(e) => updateConfig('client_id', e.target.value)}
                  placeholder="自动生成"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keepalive">Keepalive (秒)</Label>
                <Input
                  id="keepalive"
                  type="number"
                  value={config.keepalive}
                  onChange={(e) => updateConfig('keepalive', Number(e.target.value))}
                  placeholder="60"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}