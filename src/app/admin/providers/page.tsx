'use client'

import { useState, useEffect, useCallback } from 'react'
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
  RefreshCw,
  ToggleLeft,
  ToggleRight,
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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [expandedProviders, setExpandedProviders] = useState<Record<number, boolean>>({})
  const [models, setModels] = useState<Record<number, Model[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)

  // 渠道商对话框
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

  // 模型对话框
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [modelForm, setModelForm] = useState({
    name: '',
    code: '',
    model_type: 'text',
    category: '',
    points_per_call: 0,
    points_per_token: 0,
  })
  const [modelProviderId, setModelProviderId] = useState<number>(0)

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

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
      toast.error('加载渠道商失败，API 未连接')
      setProviders([])
      setUseMock(true)
    }
    setLoading(false)
  }

  const loadModels = useCallback(async (providerId: number) => {
    try {
      const data = await adminApi.getProviderModels(providerId)
      setModels(prev => {
        if (prev[providerId]) return prev
        return { ...prev, [providerId]: data }
      })
    } catch {
      setModels(prev => {
        if (prev[providerId]) return prev
        return { ...prev, [providerId]: [] }
      })
    }
  }, [])

  const toggleProvider = async (provider: Provider) => {
    try {
      await adminApi.toggleProvider(provider.id, !provider.is_active)
      setProviders(prev => prev.map(p =>
        p.id === provider.id ? { ...p, is_active: !p.is_active } : p
      ))
      toast.success(`渠道商已${provider.is_active ? '禁用' : '启用'}`)
    } catch {
      toast.error('操作失败')
    }
  }

  const expandProvider = (providerId: number) => {
    const isExpanded = expandedProviders[providerId]
    setExpandedProviders(prev => ({ ...prev, [providerId]: !prev[providerId] }))
    if (!isExpanded) loadModels(providerId)
  }

  // ---- 渠道商 CRUD ----

  const openAddProviderDialog = () => {
    setEditingProvider(null)
    setProviderForm({ name: '', code: '', description: '', website: '' })
    setConfigJson('')
    setUseJsonMode(false)
    setProviderDialogOpen(true)
  }

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

  const saveProvider = async () => {
    if (useJsonMode) {
      if (!configJson.trim()) { toast.error('请输入 JSON 配置'); return }
      try {
        const jsonData = JSON.parse(configJson)
        if (!jsonData.name || !jsonData.code) { toast.error('JSON 必须包含 name 和 code 字段'); return }
        setSubmitting(true)
        if (editingProvider) {
          const updated = await adminApi.updateProvider(editingProvider.id, jsonData)
          setProviders(prev => prev.map(p => p.id === updated.id ? updated : p))
          toast.success('渠道商已更新')
        } else {
          const created = await adminApi.createProvider(jsonData)
          setProviders(prev => [...prev, created])
          toast.success('渠道商已创建')
        }
        setProviderDialogOpen(false)
      } catch (e: any) {
        toast.error(e.message || 'JSON 格式错误')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!providerForm.name.trim() || !providerForm.code.trim()) {
      toast.error('请填写名称和代码')
      return
    }

    setSubmitting(true)
    try {
      if (editingProvider) {
        const updated = await adminApi.updateProvider(editingProvider.id, providerForm)
        setProviders(prev => prev.map(p => p.id === updated.id ? updated : p))
        toast.success('渠道商已更新')
      } else {
        const created = await adminApi.createProvider(providerForm)
        setProviders(prev => [...prev, created])
        toast.success('渠道商已创建')
      }
      setProviderDialogOpen(false)
    } catch (e: any) {
      toast.error(editingProvider ? '更新失败' : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteProvider = async (providerId: number) => {
    if (!confirm('确定要删除这个渠道商吗？关联的模型和密钥也会被删除。')) return
    try {
      await adminApi.deleteProvider(providerId)
      setProviders(prev => prev.filter(p => p.id !== providerId))
      setModels(prev => { const n = { ...prev }; delete n[providerId]; return n })
      toast.success('渠道商已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  // ---- 模型 CRUD ----

  const openAddModelDialog = (providerId: number) => {
    setModelProviderId(providerId)
    setEditingModel(null)
    setModelForm({ name: '', code: '', model_type: 'text', category: '', points_per_call: 0, points_per_token: 0 })
    setModelDialogOpen(true)
  }

  const openEditModelDialog = (model: Model) => {
    setModelProviderId(model.provider_id)
    setEditingModel(model)
    setModelForm({
      name: model.name,
      code: model.code,
      model_type: model.model_type,
      category: (model as any).category || '',
      points_per_call: model.points_per_call,
      points_per_token: model.points_per_token,
    })
    setModelDialogOpen(true)
  }

  const saveModel = async () => {
    if (!modelForm.name.trim() || !modelForm.code.trim()) {
      toast.error('请填写模型名称和代码')
      return
    }
    setSubmitting(true)
    try {
      if (editingModel) {
        const updated = await adminApi.updateModel(modelProviderId, editingModel.id, modelForm)
        setModels(prev => ({
          ...prev,
          [modelProviderId]: (prev[modelProviderId] || []).map(m =>
            m.id === updated.id ? updated : m
          ),
        }))
        toast.success('模型已更新')
      } else {
        const created = await adminApi.createModel(modelProviderId, modelForm)
        setModels(prev => ({
          ...prev,
          [modelProviderId]: [...(prev[modelProviderId] || []), created],
        }))
        toast.success('模型已创建')
      }
      setModelDialogOpen(false)
    } catch (e: any) {
      toast.error(e.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleModelStatus = async (model: Model) => {
    try {
      await adminApi.toggleModel(model.provider_id, model.id, !model.is_active)
      setModels(prev => ({
        ...prev,
        [model.provider_id]: (prev[model.provider_id] || []).map(m =>
          m.id === model.id ? { ...m, is_active: !m.is_active } : m
        ),
      }))
      toast.success(`模型已${model.is_active ? '禁用' : '启用'}`)
    } catch {
      toast.error('操作失败')
    }
  }

  const deleteModel = async (model: Model) => {
    if (!confirm(`确定删除模型 ${model.name} 吗？`)) return
    try {
      await adminApi.deleteModel(model.provider_id, model.id)
      setModels(prev => ({
        ...prev,
        [model.provider_id]: (prev[model.provider_id] || []).filter(m => m.id !== model.id),
      }))
      toast.success('模型已删除')
    } catch {
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadProviders}>
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button size="sm" onClick={openAddProviderDialog}>
              <Plus className="w-4 h-4 mr-2" />
              添加渠道商
            </Button>
          </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleProvider(provider)}
                      title={provider.is_active ? '禁用' : '启用'}
                    >
                      {provider.is_active ? (
                        <ToggleRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditProviderDialog(provider)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProvider(provider.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => expandProvider(provider.id)}>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>模型: {provider.model_count || providerModels.length || 0}</span>
                  <span>活跃密钥: {provider.active_key_count || 0}</span>
                  {provider.website && <span>{provider.website}</span>}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Server className="w-4 h-4" />
                        模型配置
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openAddModelDialog(provider.id)}>
                        <Plus className="w-3 h-3 mr-1" />
                        添加模型
                      </Button>
                    </div>

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
                          {providerModels.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">
                                暂无模型，点击"添加模型"创建
                              </td>
                            </tr>
                          )}
                          {providerModels.map((model) => (
                            <tr key={model.id} className="border-b last:border-0">
                              <td className="p-3">{model.name}</td>
                              <td className="p-3 text-muted-foreground font-mono text-xs">{model.code}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs">
                                  {modelTypeLabels[model.model_type] || model.model_type}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {model.model_type === 'image' || model.model_type === 'audio' || model.model_type === 'video' || model.model_type === 'music'
                                  ? `${model.points_per_call} 积分/次`
                                  : model.points_per_call > 0
                                  ? `${model.points_per_call} 积分/请求`
                                  : model.points_per_token > 0
                                  ? `${model.points_per_token} 积分/1M Token`
                                  : '免费'}
                              </td>
                              <td className="p-3">
                                <Badge variant={model.is_active ? 'default' : 'secondary'}>
                                  {model.is_active ? '启用' : '禁用'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => toggleModelStatus(model)}>
                                    {model.is_active ? (
                                      <ToggleRight className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <ToggleLeft className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                  <Button variant="ghost" size="icon-xs" onClick={() => openEditModelDialog(model)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon-xs" onClick={() => deleteModel(model)}>
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="w-4 h-4" />
                        <span>API 密钥</span>
                        <Badge variant="outline" className="text-xs">
                          {provider.active_key_count || 0} 个活跃
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.href = '/nanoai/admin/api-keys'}>
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

      {/* 渠道商对话框 */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? '编辑渠道商' : '添加渠道商'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 pb-2 border-b">
              <span className="text-sm font-medium">输入模式:</span>
              <div className="flex gap-2">
                <Button variant={useJsonMode ? 'outline' : 'default'} size="sm" onClick={() => setUseJsonMode(false)}>表单</Button>
                <Button variant={useJsonMode ? 'default' : 'outline'} size="sm" onClick={() => setUseJsonMode(true)}>JSON</Button>
              </div>
            </div>

            {useJsonMode ? (
              <div className="space-y-2">
                <Label htmlFor="configJson">JSON 配置 *</Label>
                <textarea
                  id="configJson"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  placeholder={'{\n  "name": "渠道商名称",\n  "code": "code",\n  "api_base_url": "https://...",\n  "description": "描述",\n  "website": "https://..."\n}'}
                  className="w-full h-48 px-3 py-2 text-sm font-mono border rounded-md bg-background resize-none"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">名称 *</Label>
                  <Input id="name" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="渠道商名称" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">代码 *</Label>
                  <Input id="code" value={providerForm.code} onChange={(e) => setProviderForm({ ...providerForm, code: e.target.value })} placeholder="渠道商代码 (如 zhipu)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input id="description" value={providerForm.description} onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })} placeholder="渠道商描述" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">网站</Label>
                  <Input id="website" value={providerForm.website} onChange={(e) => setProviderForm({ ...providerForm, website: e.target.value })} placeholder="https://..." />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>取消</Button>
            <Button onClick={saveProvider} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProvider ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模型对话框 */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? '编辑模型' : '添加模型'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>模型名称 *</Label>
              <Input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} placeholder="如 GLM-5" />
            </div>
            <div className="space-y-2">
              <Label>模型代码 *</Label>
              <Input value={modelForm.code} onChange={(e) => setModelForm({ ...modelForm, code: e.target.value })} placeholder="如 glm-5" />
            </div>
            <div className="space-y-2">
              <Label>模型类型 *</Label>
              <select
                value={modelForm.model_type}
                onChange={(e) => setModelForm({ ...modelForm, model_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="text">文本</option>
                <option value="image">图像</option>
                <option value="video">视频</option>
                <option value="audio">语音</option>
                <option value="music">音乐</option>
                <option value="multimodal">多模态</option>
                <option value="tts">语音合成</option>
                <option value="coding">编程</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>分类标签</Label>
              <Input value={modelForm.category} onChange={(e) => setModelForm({ ...modelForm, category: e.target.value })} placeholder="如 skills_task, minimax_text" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>积分/次</Label>
                <Input type="number" value={modelForm.points_per_call} onChange={(e) => setModelForm({ ...modelForm, points_per_call: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>积分/1M Token</Label>
                <Input type="number" value={modelForm.points_per_token} onChange={(e) => setModelForm({ ...modelForm, points_per_token: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>取消</Button>
            <Button onClick={saveModel} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingModel ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
