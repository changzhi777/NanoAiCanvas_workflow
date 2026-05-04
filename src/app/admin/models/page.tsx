'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Server,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, Model } from '@/lib/api/admin-api'

// 自动刷新间隔（毫秒）
const AUTO_REFRESH_INTERVAL = 30000 // 30秒

// MiniMax Token Plan 套餐完整模型列表
const MINI_MAX_MODELS: Model[] = [
  // 文本模型（按请求计费）
  { id: 101, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
  { id: 102, name: 'MiniMax-M2.7-highspeed', code: 'MiniMax-M2.7-highspeed', provider_id: 3, model_type: 'text', points_per_call: 2, points_per_token: 0, is_active: true },
  // 语音模型（每日配额）
  { id: 103, name: 'Speech 2.8 HD', code: 'speech-2.8-hd', provider_id: 3, model_type: 'audio', points_per_call: 1, points_per_token: 0, is_active: true },
  // 图像模型（每日配额）
  { id: 104, name: 'image-01', code: 'image-01', provider_id: 3, model_type: 'image', points_per_call: 1, points_per_token: 0, is_active: true },
  // 视频模型（每日配额）
  { id: 105, name: 'Hailuo-2.3-Fast', code: 'hailuo-2.3-fast-768P', provider_id: 3, model_type: 'video', points_per_call: 1, points_per_token: 0, is_active: true },
  { id: 106, name: 'Hailuo-2.3', code: 'hailuo-2.3-768P', provider_id: 3, model_type: 'video', points_per_call: 2, points_per_token: 0, is_active: true },
  // 音乐模型（每日配额）
  { id: 107, name: 'Music-2.6', code: 'music-2.6', provider_id: 3, model_type: 'music', points_per_call: 1, points_per_token: 0, is_active: true },
]

// 模拟数据
const mockModels: Model[] = [
  { id: 1, name: 'GPT-Image-2', code: 'gpt-image-2', provider_id: 1, model_type: 'image', points_per_call: 10, points_per_token: 0, is_active: true },
  { id: 2, name: 'NanoBanana-2', code: 'nano-banana-2', provider_id: 1, model_type: 'image', points_per_call: 8, points_per_token: 0, is_active: true },
  { id: 3, name: 'GLM-5', code: 'glm-5', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 100, is_active: true },
  { id: 4, name: 'GLM-5-Turbo', code: 'glm-5-turbo', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 80, is_active: true },
  ...MINI_MAX_MODELS,
]

const providerNames: Record<number, string> = {
  1: '速创API',
  2: '智谱AI',
  3: 'MiniMax Token Plan',
}

const modelTypeLabels: Record<string, string> = {
  text: '文本',
  image: '图像',
  video: '视频',
  audio: '语音',
  music: '音乐',
  multimodal: '多模态',
  tts: '语音合成',
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  useEffect(() => {
    loadModels()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefreshEnabled) return
    const interval = setInterval(() => {
      loadModels()
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefreshEnabled])

  const loadModels = async () => {
    setLoading(true)
    try {
      // 获取所有渠道商，然后获取每个渠道商的模型
      const providers = await adminApi.getProviders()
      const allModels: Model[] = []
      for (const provider of providers) {
        const models = await adminApi.getProviderModels(provider.id)
        allModels.push(...models)
      }
      setModels(allModels)
      setUseMock(false)
      setLastRefresh(new Date())
    } catch {
      setModels(mockModels)
      setUseMock(true)
    }
    setLoading(false)
  }

  const toggleModelStatus = (model: Model) => {
    setModels(prev =>
      prev.map(m =>
        m.id === model.id ? { ...m, is_active: !m.is_active } : m
      )
    )
    toast.success(`模型已${model.is_active ? '禁用' : '启用'}`)
  }

  const getPriceDisplay = (model: Model) => {
    if (model.model_type === 'image') {
      return `${model.points_per_call} 积分/次`
    }
    return `${model.points_per_token} 积分/1M Token`
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
        <AdminHeader title="模型定价" subtitle="配置模型服务价格" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="模型定价"
        subtitle="配置和管理模型服务的价格"
        action={
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLastRefresh()}
              </span>
            )}
            <Button
              variant={autoRefreshEnabled ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefreshEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              {autoRefreshEnabled ? '自动刷新' : '已暂停'}
            </Button>
            <Button size="sm" onClick={() => loadModels()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm" onClick={() => toast.info('批量配置功能开发中')}>
              <Plus className="w-4 h-4 mr-2" />
              批量配置
            </Button>
          </div>
        }
      />

      {useMock && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <span className="text-yellow-500">⚠️ 当前使用模拟数据（API未连接）</span>
        </div>
      )}

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
          {['all', 'text', 'image', 'video', 'audio', 'music'].map((type) => (
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
                  <th className="text-left p-4 font-medium">状态</th>
                  <th className="text-right p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => (
                  <tr key={model.id} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {model.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {providerNames[model.provider_id] || '未知'}
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
                      <Badge variant={model.is_active ? 'default' : 'secondary'}>
                        {model.is_active ? '启用' : '禁用'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleModelStatus(model)}
                        >
                          {model.is_active ? (
                            <ToggleRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toast.info('计算器功能开发中')}>
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toast.info('编辑功能开发中')}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toast.info('删除功能开发中')}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 空状态 */}
      {filteredModels.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Server className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">没有找到模型</p>
        </div>
      )}
    </div>
  )
}