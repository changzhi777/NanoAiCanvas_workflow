'use client'

import { useState, useCallback, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Send,
  Radio,
  Plus,
} from 'lucide-react'
import { useMqttClient } from '@/hooks/useMqttClient'

// MQTT Broker 配置 - EMQX Cloud
const MQTT_BROKER = 'rd133da1.ala.cn-hangzhou.emqxsl.cn'
const MQTT_PORT = 8084 // WebSocket TLS 端口
// EMQX Cloud App ID 和 App Secret (从环境变量或配置获取)
const EMQX_APP_ID = 'tf901df5'
const EMQX_APP_SECRET = 'Jgb!1Gs!e6M8YlpF'

export default function MqttPage() {
  const [config, setConfig] = useState({
    enabled: true,
    qos: 1,
    broker_address: MQTT_BROKER,
    port: MQTT_PORT,
    username: '',
    password: '',
    tls_enabled: true,
    ca_cert_path: '../CA/emqxsl-ca.crt',
    topic_prefix: 'nanoai',
    storyboard_topic: 'storyboard',
    health_check_topic: 'health',
    client_id: `nanoai_${Date.now()}`,
    keepalive: 60,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [serviceRunning, setServiceRunning] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState({
    uptime: 0,
    reconnectAttempts: 0,
    messageCount: 0,
    lastPingTime: 0,
  })
  const [customTopic, setCustomTopic] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  const {
    connected,
    messages,
    connect,
    disconnect,
    subscribe,
    publish,
    clearMessages,
    reconnect,
    startService,
    stopService,
    getConnectionInfo,
  } = useMqttClient({
    broker: MQTT_BROKER,
    port: MQTT_PORT,
    // 使用 EMQX Cloud App ID/Secret 认证 (如果用户没有单独配置用户名密码)
    username: config.username || EMQX_APP_ID,
    password: config.password || EMQX_APP_SECRET,
    topics: [
      `${config.topic_prefix}/#`,
      config.storyboard_topic,
      config.health_check_topic,
    ],
    clientId: config.client_id,
    autoConnect: false,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('mqtt_config', JSON.stringify(config))
      toast.success('MQTT 配置已保存')
    } catch {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const success = await connect()
      if (success) {
        toast.success('MQTT 连接测试成功')
      } else {
        toast.error('MQTT 连接测试失败')
      }
    } catch (error) {
      toast.error('MQTT 连接测试失败')
    }
    setTesting(false)
  }

  const handleConnect = async () => {
    try {
      await connect()
      toast.success('已连接到 MQTT Broker')
    } catch (error) {
      toast.error('连接失败')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.info('已断开 MQTT 连接')
  }

  // 更新连接信息
  useEffect(() => {
    if (!serviceRunning) return
    const interval = setInterval(() => {
      const info = getConnectionInfo()
      setConnectionInfo({
        uptime: info.uptime,
        reconnectAttempts: info.reconnectAttempts,
        messageCount: info.messageCount,
        lastPingTime: info.lastPingTime,
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [serviceRunning, getConnectionInfo])

  const handleSubscribe = () => {
    if (!customTopic.trim()) return
    subscribe(customTopic)
    toast.success(`已订阅: ${customTopic}`)
    setCustomTopic('')
  }

  const handlePublish = () => {
    if (!customTopic.trim() || !customMessage.trim()) {
      toast.error('请填写主题和消息')
      return
    }
    const success = publish(customTopic, customMessage)
    if (success) {
      toast.success(`已发布到: ${customTopic}`)
      setCustomMessage('')
    } else {
      toast.error('发布失败，请检查连接')
    }
  }

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="MQTT 配置"
        subtitle="配置 MQTT Broker 连接参数，管理消息通讯"
        action={
          <div className="flex gap-2">
            {serviceRunning ? (
              <>
                <Badge variant="default" className="bg-green-500">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  服务运行中
                </Badge>
                <Button variant="outline" onClick={() => { stopService(); setServiceRunning(false) }}>
                  <WifiOff className="w-4 h-4 mr-2" />
                  停止服务
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                onClick={async () => {
                  const success = await startService()
                  setServiceRunning(success)
                  toast.success(success ? 'MQTT 服务已启动' : '服务启动失败')
                }}
              >
                <Radio className="w-4 h-4 mr-2" />
                启动服务
              </Button>
            )}
            {connected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                <WifiOff className="w-4 h-4 mr-2" />
                断开
              </Button>
            ) : (
              <Button variant="outline" onClick={handleConnect}>
                <Wifi className="w-4 h-4 mr-2" />
                连接
              </Button>
            )}
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || connected}>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">连接状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">已连接</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-500 font-medium">未连接</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">服务状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {serviceRunning ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-500 font-medium">运行中</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-500 font-medium">已停止</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">运行时长</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-sm">
              {serviceRunning && connected
                ? `${Math.floor(connectionInfo.uptime / 1000 / 60)}分${Math.floor((connectionInfo.uptime / 1000) % 60)}秒`
                : '--'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">消息数</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-sm">{messages.length}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">重连次数</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-sm">{connectionInfo.reconnectAttempts}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">MQTT over WS</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">心跳间隔</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">30秒</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">配置</TabsTrigger>
          <TabsTrigger value="messages">消息日志 ({messages.length})</TabsTrigger>
          <TabsTrigger value="publish">发布消息</TabsTrigger>
        </TabsList>

        {/* 配置Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>MQTT 配置</CardTitle>
              <CardDescription>配置 MQTT Broker 连接参数 (MQTT over WebSocket)</CardDescription>
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
                      placeholder="rd133da1.ala.cn-hangzhou.emqxsl.cn"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">WebSocket 端口</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.port}
                      onChange={(e) => updateConfig('port', Number(e.target.value))}
                      placeholder="8084"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">用户名 (可选)</Label>
                    <Input
                      id="username"
                      value={config.username}
                      onChange={(e) => updateConfig('username', e.target.value)}
                      placeholder="留空表示匿名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">密码 (可选)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={config.password}
                      onChange={(e) => updateConfig('password', e.target.value)}
                      placeholder="留空表示匿名"
                    />
                  </div>
                </div>
              </div>

              {/* TLS 设置 */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">安全设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>TLS/SSL</Label>
                      <p className="text-xs text-muted-foreground">启用 TLS 加密连接 (wss://)</p>
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
                      placeholder="../CA/emqxsl-ca.crt"
                    />
                  </div>
                </div>
              </div>

              {/* Topic 设置 */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Topic 设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic_prefix">全局前缀</Label>
                    <Input
                      id="topic_prefix"
                      value={config.topic_prefix}
                      onChange={(e) => updateConfig('topic_prefix', e.target.value)}
                      placeholder="nanoai"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storyboard_topic">故事板主题</Label>
                    <Input
                      id="storyboard_topic"
                      value={config.storyboard_topic}
                      onChange={(e) => updateConfig('storyboard_topic', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="health_check_topic">健康检查主题</Label>
                    <Input
                      id="health_check_topic"
                      value={config.health_check_topic}
                      onChange={(e) => updateConfig('health_check_topic', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keepalive">Keepalive (秒)</Label>
                    <Input
                      id="keepalive"
                      type="number"
                      value={config.keepalive}
                      onChange={(e) => updateConfig('keepalive', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 消息日志Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>消息日志 ({messages.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reconnect} disabled={connected}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    重连
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearMessages}>
                    清空
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无消息 {connected ? '' : '- 请先连接 MQTT'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {msg.topic}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs font-mono overflow-x-auto">{msg.payload}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发布消息Tab */}
        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle>发布消息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>主题</Label>
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="如: nanoai/notify"
                />
              </div>
              <div className="space-y-2">
                <Label>消息内容 (JSON)</Label>
                <textarea
                  className="w-full p-2 border rounded-md min-h-[100px] font-mono text-sm"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder='{"type": "notify", "content": "Hello"}'
                />
              </div>
              <Button onClick={handlePublish} disabled={!connected}>
                <Send className="w-4 h-4 mr-2" />
                发布
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}