'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Globe,
  Server,
  Key,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, Provider, Model } from '@/lib/api/admin-api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// 模拟数据 - 当API不可用时使用
const mockProviders: Provider[] = [
  {
    id: 1,
    name: '速创API',
    code: 'wuyin',
    description: '速创图像生成API服务',
    website: 'https://api.wuyinkeji.com',
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    model_count: 2,
    active_key_count: 1,
  },
  {
    id: 2,
    name: '智谱AI',
    code: 'zhipu',
    description: '智谱大语言模型API',
    website: 'https://open.bigmodel.cn',
    is_active: true,
    created_at: '2026-01-10T10:00:00Z',
    model_count: 5,
    active_key_count: 2,
  },
  {
    id: 3,
    name: 'MiniMax',
    code: 'minimax',
    description: 'MiniMax Token Plan 全模态AI服务',
    website: 'https://platform.minimaxi.com',
    is_active: true,
    created_at: '2026-05-03T00:00:00Z',
    model_count: 8,
    active_key_count: 1,
  },
]

const mockModels: Record<number, Model[]> = {
  1: [
    { id: 1, name: 'GPT-Image-2', code: 'gpt-image-2', provider_id: 1, model_type: 'image', points_per_call: 10, points_per_token: 0, is_active: true },
    { id: 2, name: 'NanoBanana-2', code: 'nano-banana-2', provider_id: 1, model_type: 'image', points_per_call: 8, points_per_token: 0, is_active: true },
  ],
  2: [
    { id: 3, name: 'GLM-5', code: 'glm-5', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 100, is_active: true },
    { id: 4, name: 'GLM-5-Turbo', code: 'glm-5-turbo', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 80, is_active: true },
  ],
  3: [
    // MiniMax Token Plan 模型 - 文本模型（按请求计费）
    { id: 5, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
    { id: 6, name: 'MiniMax-M2.7-highspeed', code: 'MiniMax-M2.7-highspeed', provider_id: 3, model_type: 'text', points_per_call: 2, points_per_token: 0, is_active: true },
    // MiniMax Token Plan 模型 - 语音模型（每日配额）
    { id: 7, name: 'Speech 2.8', code: 'speech-2.8-hd', provider_id: 3, model_type: 'audio', points_per_call: 1, points_per_token: 0, is_active: true },
    // MiniMax Token Plan 模型 - 图像模型（每日配额）
    { id: 8, name: 'image-01', code: 'image-01', provider_id: 3, model_type: 'image', points_per_call: 1, points_per_token: 0, is_active: true },
    // MiniMax Token Plan 模型 - 视频模型（每日配额）
    { id: 9, name: 'Hailuo-2.3-Fast', code: 'hailuo-2.3-fast-768P', provider_id: 3, model_type: 'video', points_per_call: 1, points_per_token: 0, is_active: true },
    { id: 10, name: 'Hailuo-2.3', code: 'hailuo-2.3-768P', provider_id: 3, model_type: 'video', points_per_call: 1, points_per_token: 0, is_active: true },
    // MiniMax Token Plan 模型 - 音乐模型（每日配额）
    { id: 11, name: 'Music-2.6', code: 'music-2.6', provider_id: 3, model_type: 'music', points_per_call: 1, points_per_token: 0, is_active: true },
  ],
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [expandedProviders, setExpandedProviders] = useState<Record<number, boolean>>({})
  const [models, setModels] = useState<Record<number, Model[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)

  // 创建/编辑渠道商对话框状态
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [providerForm, setProviderForm] = useState({
    name: '',
    code: '',
    description: '',
    website: '',
  })
  const [configJson, setConfigJson] = useState('')
  const [useJsonMode, setUseJsonMode] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getProviders()
      setProviders(data)
      setUseMock(false)
    } catch {
      // API不可用，使用模拟数据
      setProviders(mockProviders)
      setModels(mockModels)
      setUseMock(true)
    }
    setLoading(false)
  }

  const toggleProvider = (providerId: number) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  // 打开添加渠道商对话框
  const openAddProviderDialog = () => {
    setEditingProvider(null)
    setProviderForm({ name: '', code: '', description: '', website: '' })
    setConfigJson('')
    setUseJsonMode(false)
    setProviderDialogOpen(true)
  }

  // 打开编辑渠道商对话框
  const openEditProviderDialog = (provider: Provider) => {
    setEditingProvider(provider)
    setProviderForm({
      name: provider.name,
      code: provider.code,
      description: provider.description || '',
      website: provider.website || '',
    })
    setConfigJson('')
    setUseJsonMode(false)
    setProviderDialogOpen(true)
  }

  // 保存渠道商（创建或更新）
  const saveProvider = async () => {
    if (useJsonMode) {
      // JSON 模式验证和解析
      if (!configJson.trim()) {
        toast.error('请输入 JSON 配置')
        return
      }
      try {
        const jsonData = JSON.parse(configJson)
        // 验证必需字段
        if (!jsonData.name || !jsonData.code) {
          toast.error('JSON 必须包含 name 和 code 字段')
          return
        }
        const createData = {
          name: jsonData.name,
          code: jsonData.code,
          description: jsonData.description || '',
          website: jsonData.website || '',
          config: jsonData.config || {},
        }
        if (editingProvider) {
          const updated = await adminApi.updateProvider(editingProvider.id, createData)
          setProviders(prev => prev.map(p => p.id === updated.id ? updated : p))
          toast.success('渠道商已更新')
        } else {
          const created = await adminApi.createProvider(createData)
          setProviders(prev => [...prev, created])
          toast.success('渠道商已创建')
        }
        setProviderDialogOpen(false)
      } catch (e) {
        toast.error('JSON 格式错误，请检查')
        return
      }
      return
    }

    // 表单模式验证
    if (!providerForm.name.trim() || !providerForm.code.trim()) {
      toast.error('请填写名称和代码')
      return
    }

    try {
      const createData = {
        name: providerForm.name,
        code: providerForm.code,
        description: providerForm.description,
        website: providerForm.website,
      }
      if (editingProvider) {
        // 更新
        const updated = await adminApi.updateProvider(editingProvider.id, createData)
        setProviders(prev => prev.map(p => p.id === updated.id ? updated : p))
        toast.success('渠道商已更新')
      } else {
        // 创建
        const created = await adminApi.createProvider(createData)
        setProviders(prev => [...prev, created])
        toast.success('渠道商已创建')
      }
      setProviderDialogOpen(false)
    } catch (e) {
      toast.error(editingProvider ? '更新失败' : '创建失败')
    }
  }

  // 删除渠道商
  const deleteProvider = async (providerId: number) => {
    if (!confirm('确定要删除这个渠道商吗？')) return
    try {
      await adminApi.deleteProvider(providerId)
      setProviders(prev => prev.filter(p => p.id !== providerId))
      toast.success('渠道商已删除')
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const filteredProviders = providers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader title="渠道商管理" subtitle="管理API渠道商和模型配置" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="渠道商管理"
        subtitle="管理API渠道商、模型和密钥配置"
        action={
          <Button size="sm" onClick={openAddProviderDialog}>
            <Plus className="w-4 h-4 mr-2" />
            添加渠道商
          </Button>
        }
      />

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索渠道商..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-80"
        />
      </div>

      {useMock && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <span className="text-yellow-500">⚠️ 当前使用模拟数据（API未连接）</span>
        </div>
      )}

      {/* 渠道商列表 */}
      <div className="space-y-4">
        {filteredProviders.map((provider) => {
          const isExpanded = expandedProviders[provider.id]
          const providerModels = models[provider.id] || []

          return (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                      {provider.is_active ? '启用' : '禁用'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditProviderDialog(provider)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProvider(provider.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleProvider(provider.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>模型: {provider.model_count || providerModels.length || 0}</span>
                  <span>活跃密钥: {provider.active_key_count || 0}</span>
                  <span>{provider.website}</span>
                </div>
              </CardHeader>

              {/* 展开的模型列表 */}
              {isExpanded && (
                <CardContent className="border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Server className="w-4 h-4" />
                        模型配置
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toast.info('添加模型功能开发中')}>
                        <Plus className="w-3 h-3 mr-1" />
                        添加模型
                      </Button>
                    </div>

                    {/* 模型表格 */}
                    <div className="border rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">模型名称</th>
                            <th className="text-left p-3 font-medium">模型代码</th>
                            <th className="text-left p-3 font-medium">类型</th>
                            <th className="text-left p-3 font-medium">计费</th>
                            <th className="text-left p-3 font-medium">状态</th>
                            <th className="text-right p-3 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerModels.map((model) => (
                            <tr key={model.id} className="border-b last:border-0">
                              <td className="p-3">{model.name}</td>
                              <td className="p-3 text-muted-foreground font-mono text-xs">
                                {model.code}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs">
                                  {model.model_type}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {model.model_type === 'image' || model.model_type === 'audio' || model.model_type === 'video' || model.model_type === 'music'
                                  ? `${model.points_per_call} 积分/次`
                                  : model.model_type === 'text'
                                  ? `${model.points_per_call} 积分/请求`
                                  : `${model.points_per_token} 积分/1M Token`}
                              </td>
                              <td className="p-3">
                                <Badge variant={model.is_active ? 'default' : 'secondary'}>
                                  {model.is_active ? '启用' : '禁用'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon-xs" onClick={() => toast.info('编辑模型功能开发中')}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon-xs" onClick={() => toast.info('删除模型功能开发中')}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 密钥管理入口 */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="w-4 h-4" />
                        <span>API 密钥</span>
                        <Badge variant="outline" className="text-xs">
                          {provider.active_key_count || 0} 个活跃
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.href = '/admin/api-keys'}>
                        管理密钥
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* 空状态 */}
      {filteredProviders.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Globe className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">没有找到渠道商</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAddProviderDialog}>
            <Plus className="w-4 h-4 mr-2" />
            添加渠道商
          </Button>
        </div>
      )}

      {/* 创建/编辑渠道商对话框 */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? '编辑渠道商' : '添加渠道商'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 模式切换 */}
            <div className="flex items-center gap-4 pb-2 border-b">
              <span className="text-sm font-medium">输入模式:</span>
              <div className="flex gap-2">
                <Button
                  variant={useJsonMode ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setUseJsonMode(false)}
                >
                  表单
                </Button>
                <Button
                  variant={useJsonMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseJsonMode(true)}
                >
                  JSON
                </Button>
              </div>
            </div>

            {useJsonMode ? (
              // JSON 模式
              <div className="space-y-2">
                <Label htmlFor="configJson">JSON 配置 *</Label>
                <textarea
                  id="configJson"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  placeholder={'{\n  "name": "渠道商名称",\n  "code": "code",\n  "description": "描述",\n  "website": "https://...",\n  "config": {}\n}'}
                  className="w-full h-48 px-3 py-2 text-sm font-mono border rounded-md bg-background resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  输入 JSON 格式的渠道商配置，必须包含 name 和 code 字段
                </p>
              </div>
            ) : (
              // 表单模式
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">名称 *</Label>
                  <Input
                    id="name"
                    value={providerForm.name}
                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                    placeholder="渠道商名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">代码 *</Label>
                  <Input
                    id="code"
                    value={providerForm.code}
                    onChange={(e) => setProviderForm({ ...providerForm, code: e.target.value })}
                    placeholder="渠道商代码 (如 wuyin)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={providerForm.description}
                    onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })}
                    placeholder="渠道商描述"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">网站</Label>
                  <Input
                    id="website"
                    value={providerForm.website}
                    onChange={(e) => setProviderForm({ ...providerForm, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>取消</Button>
            <Button onClick={saveProvider}>{editingProvider ? '更新' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}