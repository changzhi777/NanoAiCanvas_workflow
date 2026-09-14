'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wifi, WifiOff, Send, Radio, Trash2, RefreshCw, Plus } from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useMqttClient, type UseMqttClientOptions } from '@/hooks/useMqttClient'

// MQTT 配置 - EMQX Cloud
const MQTT_CONFIG: UseMqttClientOptions = {
  broker: 'rd133da1.ala.cn-hangzhou.emqxsl.cn',
  port: 8084,
  // EMQX Cloud App ID 和 App Secret
  username: 'tf901df5',
  password: 'Jgb!1Gs!e6M8YlpF',
  topics: [
    'nanoai/notify',      // 通知主题
    'nanoai/system',      // 系统主题
    'nanoai/team/#',      // 团队主题 (通配符)
  ],
  clientId: `nanoai_admin_${Date.now()}`,
}

export default function CommunicationsPage() {
  const {
    connected,
    messages,
    connect,
    disconnect,
    subscribe,
    publish,
    clearMessages,
    reconnect,
  } = useMqttClient(MQTT_CONFIG)

  const [customTopic, setCustomTopic] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  const handleConnect = useCallback(async () => {
    try {
      const success = await connect()
      if (success) {
        toast.success('MQTT 连接成功')
      } else {
        toast.error('MQTT 连接失败')
      }
    } catch (error) {
      toast.error('MQTT 连接异常')
    }
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
    toast.info('MQTT 已断开')
  }, [disconnect])

  const handleSubscribe = useCallback((topic: string) => {
    if (!topic.trim()) return
    subscribe(topic)
    toast.success(`已订阅: ${topic}`)
  }, [subscribe])

  const handlePublish = useCallback(() => {
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
  }, [customTopic, customMessage, publish])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="通信管理"
        subtitle="MQTT 和 WebSocket 通信监控"
        action={
          connected ? (
            <Button variant="outline" onClick={handleDisconnect}>
              <WifiOff className="w-4 h-4 mr-2" />
              断开
            </Button>
          ) : (
            <Button onClick={handleConnect}>
              <Wifi className="w-4 h-4 mr-2" />
              连接
            </Button>
          )
        }
      />

      {/* 连接状态 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {connected ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                已连接
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                未连接
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Broker: {MQTT_CONFIG.broker}:{MQTT_CONFIG.port}</span>
            <Badge variant={connected ? 'default' : 'secondary'}>
              {connected ? '在线' : '离线'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={reconnect} disabled={connected}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重连
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 通信内容 */}
      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">消息日志</TabsTrigger>
          <TabsTrigger value="topics">主题管理</TabsTrigger>
          <TabsTrigger value="publish">发布消息</TabsTrigger>
        </TabsList>

        {/* 消息日志 */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">消息日志 ({messages.length})</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  清空
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无消息
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>主题</TableHead>
                      <TableHead>内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {msg.topic}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-[300px] truncate">
                          {msg.payload}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 主题管理 */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">已订阅主题</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="输入主题 (如: nanoai/notify)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTopic.trim()) {
                      handleSubscribe(customTopic)
                      setCustomTopic('')
                    }
                  }}
                />
                <Button onClick={() => { handleSubscribe(customTopic); setCustomTopic('') }}>
                  <Plus className="w-4 h-4 mr-1" />
                  订阅
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {MQTT_CONFIG.topics?.map((topic) => (
                  <Badge key={topic} variant="secondary" className="cursor-pointer hover:bg-primary/20">
                    <Radio className="w-3 h-3 mr-1" />
                    {topic}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                支持通配符: * 匹配单级, # 匹配多级
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发布消息 */}
        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">发布消息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm">目标主题</label>
                <Input
                  placeholder="输入主题 (如: nanoai/notify)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">消息内容</label>
                <textarea
                  className="w-full p-2 border rounded-md min-h-[100px]"
                  placeholder="输入 JSON 消息..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
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