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
  Key,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, APIKey } from '@/lib/api/admin-api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// 模拟数据
const mockAPIKeys: APIKey[] = [
  {
    id: 1,
    provider_id: 1,
    name: '速创主密钥',
    status: 'active',
    daily_limit: 1000,
    monthly_limit: 30000,
    used_today: 156,
    used_this_month: 4520,
    total_used: 45678,
    priority: 100,
    weight: 100,
    max_concurrent: 10,
    expires_at: '2027-12-31T23:59:59Z',
    last_used_at: '2026-05-03T10:30:00Z',
    last_test_at: '2026-05-03T10:00:00Z',
    last_test_success: true,
    last_heartbeat_at: '2026-05-03T10:30:00Z',
    health_status: 'healthy',
    last_response_ms: 230,
    last_error: null,
    created_at: '2026-01-15T10:00:00Z',
    key_preview: 'sk-****1234',
  },
  {
    id: 2,
    provider_id: 1,
    name: '速创备用密钥',
    status: 'active',
    daily_limit: 500,
    monthly_limit: 15000,
    used_today: 45,
    used_this_month: 1200,
    total_used: 12340,
    priority: 50,
    weight: 50,
    max_concurrent: 5,
    expires_at: '2026-06-30T23:59:59Z',
    last_used_at: '2026-05-02T18:20:00Z',
    last_test_at: '2026-05-02T18:00:00Z',
    last_test_success: true,
    last_heartbeat_at: '2026-05-02T18:20:00Z',
    health_status: 'healthy',
    last_response_ms: 450,
    last_error: null,
    created_at: '2026-02-01T10:00:00Z',
    key_preview: 'sk-****5678',
  },
  {
    id: 3,
    provider_id: 2,
    name: '智谱主密钥',
    status: 'active',
    daily_limit: 2000,
    monthly_limit: 60000,
    used_today: 320,
    used_this_month: 8900,
    total_used: 89000,
    priority: 100,
    weight: 100,
    max_concurrent: 20,
    expires_at: '2026-12-31T23:59:59Z',
    last_used_at: '2026-05-03T11:00:00Z',
    last_test_at: '2026-05-03T11:00:00Z',
    last_test_success: true,
    last_heartbeat_at: '2026-05-03T11:00:00Z',
    health_status: 'healthy',
    last_response_ms: 180,
    last_error: null,
    created_at: '2026-01-10T10:00:00Z',
    key_preview: 'sk-****abcd',
  },
]

const providerNames: Record<number, string> = {
  1: '速创API',
  2: '智谱AI',
}

const statusConfig = {
  active: { label: '活跃', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  inactive: { label: '禁用', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  expired: { label: '过期', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

export default function APIKeysPage() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([])
  const [providers, setProviders] = useState<{id: number, name: string}[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})
  const [testingKeys, setTestingKeys] = useState<Record<number, boolean>>({})
  const [keyTestResults, setKeyTestResults] = useState<Record<number, 'valid' | 'invalid' | 'error'>>({})
  const [useMock, setUseMock] = useState(false)

  // 创建/编辑密钥对话框状态
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<APIKey | null>(null)
  const [keyForm, setKeyForm] = useState({
    provider_id: 1,
    name: '',
    api_key: '',
    daily_limit: 1000,
    monthly_limit: 30000,
    priority: 100,
    expires_at: '',
  })

  useEffect(() => {
    loadAPIKeys()
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const data = await adminApi.getProviders()
      setProviders(data.map(p => ({ id: p.id, name: p.name })))
    } catch {
      setProviders([
        { id: 1, name: '速创API' },
        { id: 2, name: '智谱AI' },
      ])
    }
  }

  const loadAPIKeys = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getAPIKeys()
      setAPIKeys(data)
      setUseMock(false)
    } catch {
      setAPIKeys(mockAPIKeys)
      setUseMock(true)
    }
    setLoading(false)
  }

  const toggleKeyVisibility = (keyId: number) => {
    setVisibleKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('已复制到剪贴板')
  }

  const testAPIKey = async (keyId: number) => {
    if (useMock) {
      setTestingKeys(prev => ({ ...prev, [keyId]: true }))
      await new Promise(resolve => setTimeout(resolve, 1500))
      const isValid = Math.random() > 0.3
      setKeyTestResults(prev => ({ ...prev, [keyId]: isValid ? 'valid' : 'invalid' }))
      setTestingKeys(prev => ({ ...prev, [keyId]: false }))
      toast.success(isValid ? 'API Key 验证成功' : 'API Key 验证失败')
      return
    }

    setTestingKeys(prev => ({ ...prev, [keyId]: true }))
    setKeyTestResults(prev => ({ ...prev, [keyId]: undefined as any }))
    try {
      const result = await adminApi.testAPIKey(keyId)
      setKeyTestResults(prev => ({ ...prev, [keyId]: result.is_success ? 'valid' : 'invalid' }))
      toast.success(result.is_success ? 'API Key 验证成功' : 'API Key 验证失败')
    } catch (e) {
      setKeyTestResults(prev => ({ ...prev, [keyId]: 'error' }))
      toast.error('测试失败')
    }
    setTestingKeys(prev => ({ ...prev, [keyId]: false }))
  }

  const toggleKeyStatus = (key: APIKey) => {
    setAPIKeys(prev =>
      prev.map(k =>
        k.id === key.id
          ? { ...k, status: k.status === 'active' ? 'inactive' : 'active' }
          : k
      )
    )
    toast.success(`密钥已${key.status === 'active' ? '禁用' : '启用'}`)
  }

  // 打开添加密钥对话框
  const openAddKeyDialog = () => {
    setEditingKey(null)
    setKeyForm({
      provider_id: 1,
      name: '',
      api_key: '',
      daily_limit: 1000,
      monthly_limit: 30000,
      priority: 100,
      expires_at: '',
    })
    setKeyDialogOpen(true)
  }

  // 打开编辑密钥对话框
  const openEditKeyDialog = (key: APIKey) => {
    setEditingKey(key)
    setKeyForm({
      provider_id: key.provider_id,
      name: key.name,
      api_key: '',  // 不显示真实密钥
      daily_limit: key.daily_limit,
      monthly_limit: key.monthly_limit,
      priority: key.priority,
      expires_at: key.expires_at || '',
    })
    setKeyDialogOpen(true)
  }

  // 保存密钥（创建或更新）
  const saveKey = async () => {
    if (!keyForm.name.trim() || !keyForm.api_key.trim()) {
      toast.error('请填写名称和API密钥')
      return
    }

    try {
      if (editingKey) {
        // 更新
        const updated = await adminApi.updateAPIKey(editingKey.id, {
          name: keyForm.name,
          daily_limit: keyForm.daily_limit,
          monthly_limit: keyForm.monthly_limit,
          priority: keyForm.priority,
          expires_at: keyForm.expires_at || undefined,
        })
        setAPIKeys(prev => prev.map(k => k.id === updated.id ? updated : k))
        toast.success('密钥已更新')
      } else {
        // 创建
        const created = await adminApi.createAPIKey({
          provider_id: keyForm.provider_id,
          name: keyForm.name,
          api_key: keyForm.api_key,
          daily_limit: keyForm.daily_limit,
          monthly_limit: keyForm.monthly_limit,
          priority: keyForm.priority,
          expires_at: keyForm.expires_at || undefined,
        })
        setAPIKeys(prev => [...prev, created])
        toast.success('密钥已创建')
      }
      setKeyDialogOpen(false)
    } catch (e) {
      toast.error(editingKey ? '更新失败' : '创建失败')
    }
  }

  // 删除密钥
  const deleteKey = async (keyId: number) => {
    if (!confirm('确定要删除这个密钥吗？')) return
    try {
      await adminApi.deleteAPIKey(keyId)
      setAPIKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success('密钥已删除')
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const filteredKeys = apiKeys.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || k.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // 计算使用百分比
  const getUsagePercent = (used: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader title="API 密钥管理" subtitle="管理渠道商API密钥" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="API 密钥管理"
        subtitle="管理所有渠道商的API密钥"
        action={
          <Button size="sm" onClick={openAddKeyDialog}>
            <Plus className="w-4 h-4 mr-2" />
            添加密钥
          </Button>
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
            placeholder="搜索密钥..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'expired'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? '全部' : status === 'active' ? '活跃' : status === 'inactive' ? '禁用' : '过期'}
            </Button>
          ))}
        </div>
      </div>

      {/* 密钥列表 */}
      <div className="space-y-4">
        {filteredKeys.map((apiKey) => {
          const status = statusConfig[apiKey.status]
          const dailyPercent = getUsagePercent(apiKey.used_today, apiKey.daily_limit)
          const monthlyPercent = getUsagePercent(apiKey.used_this_month, apiKey.monthly_limit)
          const isVisible = visibleKeys[apiKey.id]
          const isTesting = testingKeys[apiKey.id]

          return (
            <Card key={apiKey.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  {/* 密钥信息 */}
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{apiKey.name}</h3>
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {providerNames[apiKey.provider_id] || '未知渠道商'}
                      </p>

                      {/* API Key 显示 */}
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-sm bg-muted px-3 py-1 rounded">
                          {isVisible ? apiKey.key_preview.replace('****', 'sk-xxxx') : apiKey.key_preview}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => copyKey(apiKey.key_preview)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAPIKey(apiKey.id)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : keyTestResults[apiKey.id] === 'valid' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : keyTestResults[apiKey.id] === 'invalid' ? (
                        <X className="w-4 h-4 text-red-500" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-2">测试</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyStatus(apiKey)}
                    >
                      {apiKey.status === 'active' ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditKeyDialog(apiKey)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKey(apiKey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* 使用统计 */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">今日使用</span>
                      <span className="font-medium">
                        {apiKey.used_today} / {apiKey.daily_limit}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          dailyPercent > 80 ? 'bg-red-500' : dailyPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${dailyPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">本月使用</span>
                      <span className="font-medium">
                        {apiKey.used_this_month} / {apiKey.monthly_limit}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          monthlyPercent > 80 ? 'bg-red-500' : monthlyPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${monthlyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 更多信息 */}
                <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
                  <span>优先级: {apiKey.priority}</span>
                  <span>总使用: {apiKey.total_used}</span>
                  {apiKey.expires_at && (
                    <span>过期: {new Date(apiKey.expires_at).toLocaleDateString('zh-CN')}</span>
                  )}
                  {apiKey.last_used_at && (
                    <span>最后使用: {new Date(apiKey.last_used_at).toLocaleDateString('zh-CN')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 空状态 */}
      {filteredKeys.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Key className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">没有找到API密钥</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAddKeyDialog}>
            <Plus className="w-4 h-4 mr-2" />
            添加密钥
          </Button>
        </div>
      )}

      {/* 创建/编辑密钥对话框 */}
      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKey ? '编辑密钥' : '添加密钥'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">渠道商 *</Label>
              <select
                id="provider"
                className="w-full h-10 px-3 bg-background border border-white/10 rounded-lg"
                value={keyForm.provider_id}
                onChange={(e) => setKeyForm({ ...keyForm, provider_id: parseInt(e.target.value) })}
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                placeholder="密钥名称"
              />
            </div>
            {!editingKey && (
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key *</Label>
                <Input
                  id="api_key"
                  value={keyForm.api_key}
                  onChange={(e) => setKeyForm({ ...keyForm, api_key: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily_limit">日限额</Label>
                <Input
                  id="daily_limit"
                  type="number"
                  value={keyForm.daily_limit}
                  onChange={(e) => setKeyForm({ ...keyForm, daily_limit: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_limit">月限额</Label>
                <Input
                  id="monthly_limit"
                  type="number"
                  value={keyForm.monthly_limit}
                  onChange={(e) => setKeyForm({ ...keyForm, monthly_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Input
                id="priority"
                type="number"
                value={keyForm.priority}
                onChange={(e) => setKeyForm({ ...keyForm, priority: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">过期时间</Label>
              <Input
                id="expires_at"
                type="date"
                value={keyForm.expires_at.split('T')[0]}
                onChange={(e) => setKeyForm({ ...keyForm, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialogOpen(false)}>取消</Button>
            <Button onClick={saveKey}>{editingKey ? '更新' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}