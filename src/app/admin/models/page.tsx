'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Server,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, Model } from '@/lib/api/admin-api'
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

interface UsageInfo {
  total_calls: number
  success_calls: number
  failed_calls: number
  avg_response_ms: number | null
  last_used_at: string | null
}

interface ModelWithUsage extends Model {
  providerName?: string
  usage?: UsageInfo
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelWithUsage[]>([])
  const [providerNames, setProviderNames] = useState<Record<number, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    setLoading(true)
    try {
      const providers = await adminApi.getProviders()
      const nameMap: Record<number, string> = {}
      const allModels: ModelWithUsage[] = []

      for (const provider of providers) {
        nameMap[provider.id] = provider.name
        try {
          const providerModels = await adminApi.getProviderModels(provider.id)
          allModels.push(...providerModels.map(m => ({ ...m, providerName: provider.name })))
        } catch {
          // 跳过加载失败的渠道商
        }
      }

      setModels(allModels)
      setProviderNames(nameMap)
      setLastRefresh(new Date())

      // 尝试加载用量数据
      try {
        const usageData = await client.get<Array<{
          model_id: number
          total_calls: number
          success_calls: number
          failed_calls: number
          avg_response_ms: number | null
          last_used_at: string | null
        }>>('/v2/admin/models/usage?days=7')
        const usageMap = new Map(usageData.map(u => [u.model_id, u]))
        setModels(prev => prev.map(m => ({
          ...m,
          usage: usageMap.get(m.id) || undefined,
        })))
      } catch {
        // 用量统计不可用，忽略
      }
    } catch {
      toast.error('加载模型数据失败')
    }
    setLoading(false)
  }

  const toggleModelStatus = async (model: ModelWithUsage) => {
    try {
      await adminApi.toggleModel(model.provider_id, model.id, !model.is_active)
      setModels(prev => prev.map(m =>
        m.id === model.id ? { ...m, is_active: !m.is_active } : m
      ))
      toast.success(`模型已${model.is_active ? '禁用' : '启用'}`)
    } catch {
      toast.error('操作失败')
    }
  }

  const deleteModel = async (model: ModelWithUsage) => {
    if (!confirm(`确定删除模型 ${model.name} 吗？`)) return
    try {
      await adminApi.deleteModel(model.provider_id, model.id)
      setModels(prev => prev.filter(m => m.id !== model.id))
      toast.success('模型已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const getPriceDisplay = (model: Model) => {
    if (model.points_per_call > 0) return `${model.points_per_call} 积分/次`
    if (model.points_per_token > 0) return `${model.points_per_token} 积分/1M Token`
    return '免费'
  }

  const formatLastRefresh = () => {
    if (!lastRefresh) return ''
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000)
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    return lastRefresh.toLocaleTimeString()
  }

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || m.model_type === filterType
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader title="模型管理" subtitle="配置和管理模型服务" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="模型管理"
        subtitle="配置模型服务、查看用量统计和健康状态"
        action={
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLastRefresh()}
              </span>
            )}
            <Button size="sm" onClick={loadModels}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        }
      />

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索模型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'text', 'image', 'video', 'audio', 'music', 'multimodal', 'coding'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? '全部' : modelTypeLabels[type] || type}
            </Button>
          ))}
        </div>
      </div>

      {/* 模型表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">模型</th>
                  <th className="text-left p-4 font-medium">渠道商</th>
                  <th className="text-left p-4 font-medium">类型</th>
                  <th className="text-left p-4 font-medium">价格</th>
                  <th className="text-left p-4 font-medium">用量(7天)</th>
                  <th className="text-left p-4 font-medium">状态</th>
                  <th className="text-right p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => {
                  const usage = model.usage
                  const successRate = usage && usage.total_calls > 0
                    ? Math.round(usage.success_calls / usage.total_calls * 100)
                    : null

                  return (
                    <tr key={model.id} className="border-b last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{model.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {model.providerName || providerNames[model.provider_id] || '未知'}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {modelTypeLabels[model.model_type] || model.model_type}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {getPriceDisplay(model)}
                      </td>
                      <td className="p-4">
                        {usage && usage.total_calls > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <Activity className="w-3 h-3" />
                              <span>{usage.total_calls} 次调用</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {successRate !== null && successRate >= 90 ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : successRate !== null && successRate >= 70 ? (
                                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                              ) : successRate !== null ? (
                                <XCircle className="w-3 h-3 text-red-500" />
                              ) : null}
                              <span className="text-xs text-muted-foreground">
                                {successRate !== null ? `${successRate}%` : '-'}
                              </span>
                              {usage.avg_response_ms !== null && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {Math.round(usage.avg_response_ms)}ms
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">暂无数据</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={model.is_active ? 'default' : 'secondary'}>
                          {model.is_active ? '启用' : '禁用'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleModelStatus(model)}>
                            {model.is_active ? (
                              <ToggleRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteModel(model)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredModels.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Server className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">没有找到模型</p>
        </div>
      )}
    </div>
  )
}
