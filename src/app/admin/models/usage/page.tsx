'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { client } from '@/lib/api/client'

const modelTypeLabels: Record<string, string> = {
  text: '文本',
  image: '图像',
  video: '视频',
  audio: '语音',
  music: '音乐',
  multimodal: '多模态',
  tts: '语音合成',
  coding: '编程',
}

interface UsageItem {
  model_id: number
  model_name: string
  model_code: string
  model_type: string
  provider_name: string
  total_calls: number
  success_calls: number
  failed_calls: number
  avg_response_ms: number | null
  last_used_at: string | null
}

interface HealthItem {
  model_id: number
  model_name: string
  is_active: boolean
  last_24h: {
    total_calls: number
    success_rate: number | null
    avg_response_ms: number | null
  }
  active_keys: number
  keys_health: Array<{
    key_id: number
    name: string
    status: string
    last_test_success: boolean | null
    last_test_at: string | null
    weight: number
    max_concurrent: number
  }>
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageItem[]>([])
  const [healthMap, setHealthMap] = useState<Record<number, HealthItem>>({})
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [, setLoadingHealth] = useState(false)

  useEffect(() => {
    loadUsage()
  }, [days])

  const loadUsage = async () => {
    setLoading(true)
    try {
      const data = await client.get<UsageItem[]>(`/api/v2/admin/models/usage?days=${days}`)
      setUsage(data)
    } catch {
      toast.error('加载用量数据失败')
      setUsage([])
    }
    setLoading(false)
  }

  const loadHealth = async (modelId: number) => {
    if (healthMap[modelId]) {
      setHealthMap(prev => {
        const n = { ...prev }
        delete n[modelId]
        return n
      })
      return
    }
    setLoadingHealth(true)
    try {
      const data = await client.get<HealthItem>(`/api/v2/admin/models/${modelId}/health`)
      setHealthMap(prev => ({ ...prev, [modelId]: data }))
    } catch {
      toast.error('加载健康状态失败')
    }
    setLoadingHealth(false)
  }

  const totalCalls = usage.reduce((s, u) => s + u.total_calls, 0)
  const totalSuccess = usage.reduce((s, u) => s + u.success_calls, 0)
  const totalFailed = usage.reduce((s, u) => s + u.failed_calls, 0)
  const overallRate = totalCalls > 0 ? Math.round(totalSuccess / totalCalls * 100) : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader title="用量统计" subtitle="模型调用统计和健康监控" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="用量统计"
        subtitle="模型调用统计和健康监控"
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 7, 14, 30].map(d => (
                <Button
                  key={d}
                  variant={days === d ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  {d}天
                </Button>
              ))}
            </div>
            <Button size="sm" onClick={loadUsage}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        }
      />

      {/* 概览卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">总调用量</div>
            <div className="text-2xl font-bold mt-1">{totalCalls.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">成功率</div>
            <div className="text-2xl font-bold mt-1 text-green-500">{overallRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">成功</div>
            <div className="text-2xl font-bold mt-1">{totalSuccess.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">失败</div>
            <div className="text-2xl font-bold mt-1 text-red-500">{totalFailed.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 用量表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            模型用量排行
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">模型</th>
                  <th className="text-left p-3 font-medium">渠道商</th>
                  <th className="text-left p-3 font-medium">类型</th>
                  <th className="text-left p-3 font-medium">调用量</th>
                  <th className="text-left p-3 font-medium">成功率</th>
                  <th className="text-left p-3 font-medium">平均耗时</th>
                  <th className="text-left p-3 font-medium">最后调用</th>
                  <th className="text-right p-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {usage.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      暂无用量数据
                    </td>
                  </tr>
                )}
                {usage.map((item) => {
                  const rate = item.total_calls > 0
                    ? Math.round(item.success_calls / item.total_calls * 100)
                    : 0
                  const health = healthMap[item.model_id]

                  return (
                    <>
                      <tr key={item.model_id} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="font-medium">{item.model_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.model_code}</div>
                        </td>
                        <td className="p-3 text-muted-foreground">{item.provider_name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {modelTypeLabels[item.model_type] || item.model_type}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{item.total_calls.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {rate >= 90 ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : rate >= 70 ? (
                              <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span>{rate}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.avg_response_ms !== null ? `${Math.round(item.avg_response_ms)}ms` : '-'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {item.last_used_at
                            ? new Date(item.last_used_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadHealth(item.model_id)}
                          >
                            <Activity className="w-4 h-4 mr-1" />
                            {health ? '收起' : '健康'}
                          </Button>
                        </td>
                      </tr>
                      {health && (
                        <tr key={`health-${item.model_id}`}>
                          <td colSpan={8} className="p-4 bg-muted/20">
                            <div className="space-y-3">
                              <div className="flex items-center gap-4 text-sm">
                                <span>状态: <Badge variant={health.is_active ? 'default' : 'secondary'}>{health.is_active ? '启用' : '禁用'}</Badge></span>
                                <span>24h 调用: <strong>{health.last_24h.total_calls}</strong></span>
                                <span>24h 成功率: <strong>{health.last_24h.success_rate ?? '-'}%</strong></span>
                                <span>活跃密钥: <strong>{health.active_keys}</strong></span>
                              </div>
                              {health.keys_health.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-muted-foreground">密钥健康状态:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {health.keys_health.map(key => (
                                      <div key={key.key_id} className="flex items-center gap-2 text-xs p-2 border rounded">
                                        {key.last_test_success === true ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        ) : key.last_test_success === false ? (
                                          <XCircle className="w-3 h-3 text-red-500" />
                                        ) : (
                                          <Clock className="w-3 h-3 text-muted-foreground" />
                                        )}
                                        <span>{key.name}</span>
                                        <span className="text-muted-foreground">权重: {key.weight}</span>
                                        <span className="text-muted-foreground">并发: {key.max_concurrent}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
