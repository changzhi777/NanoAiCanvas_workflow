'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Key, Copy, Trash2, RefreshCw, TestTube2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import {
  getAPIKeys,
  createAPIKey,
  deleteAPIKey,
  updateAPIKey,
  testAPIKey,
  getProviders,
  type APIKey,
  type APIKeyCreate,
  type Provider,
} from '@/lib/api/admin-api'

export default function ApiKeyPoolPage() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // 新增表单
  const [newKey, setNewKey] = useState<Partial<APIKeyCreate>>({
    provider_id: 0,
    name: '',
    api_key: '',
    daily_limit: 1000,
    priority: 0,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [keyList, providerList] = await Promise.all([getAPIKeys(), getProviders()])
      setKeys(keyList)
      setProviders(providerList)
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = async () => {
    if (!newKey.provider_id || !newKey.name || !newKey.api_key) {
      toast.error('请填写完整信息')
      return
    }
    try {
      await createAPIKey(newKey as APIKeyCreate)
      toast.success('Key 添加成功')
      setShowAdd(false)
      setNewKey({ provider_id: 0, name: '', api_key: '', daily_limit: 1000, priority: 0 })
      loadData()
    } catch {
      toast.error('添加失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此 Key？')) return
    try {
      await deleteAPIKey(id)
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success('已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleToggleStatus = async (key: APIKey) => {
    const next = key.status === 'active' ? 'inactive' : 'active'
    try {
      await updateAPIKey(key.id, { status: next })
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, status: next } : k))
    } catch {
      toast.error('操作失败')
    }
  }

  const handleTest = async (id: number) => {
    setActionLoading(id)
    try {
      const result = await testAPIKey(id)
      if (result.is_success) {
        toast.success(`测试通过 (${result.response_time_ms}ms)`)
      } else {
        toast.error(`测试失败: ${result.error_message || '未知错误'}`)
      }
      loadData()
    } catch {
      toast.error('测试请求失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCopy = (preview: string) => {
    navigator.clipboard.writeText(preview)
    toast.success('已复制')
  }

  const filtered = keys.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase())
    || k.key_preview?.toLowerCase().includes(search.toLowerCase()),
  )

  const getProviderName = (pid: number) => providers.find(p => p.id === pid)?.name || `#${pid}`

  return (
    <div className="space-y-6">
      <AdminHeader
        title="API Key 池管理"
        subtitle="管理所有渠道商的 API Keys — 仅管理员可见"
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加 Key
          </Button>
        }
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索 Key 名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Key 列表 ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无 API Key</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>渠道商</TableHead>
                  <TableHead>Key 预览</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>今日用量</TableHead>
                  <TableHead>总用量</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>{getProviderName(key.provider_id)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_preview || '***'}</code>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleStatus(key)}>
                        <Badge variant={key.status === 'active' ? 'default' : 'secondary'} className="cursor-pointer">
                          {key.status === 'active' ? '启用' : '禁用'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{key.priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              key.daily_limit > 0 && key.used_today / key.daily_limit > 0.8 ? "bg-red-500" : "bg-primary",
                            )}
                            style={{ width: `${key.daily_limit > 0 ? Math.min(100, (key.used_today / key.daily_limit) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{key.used_today}/{key.daily_limit || '∞'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{key.total_used}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(key.key_preview || '')} title="复制">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTest(key.id)} disabled={actionLoading === key.id} title="测试">
                          {actionLoading === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)} title="删除">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 添加 Key 弹窗 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加 API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">渠道商</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newKey.provider_id || ''}
                onChange={(e) => setNewKey(prev => ({ ...prev, provider_id: Number(e.target.value) }))}
              >
                <option value="">选择渠道商</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">名称</label>
              <Input value={newKey.name || ''} onChange={(e) => setNewKey(prev => ({ ...prev, name: e.target.value }))} placeholder="如：主 Key" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">API Key</label>
              <Input type="password" value={newKey.api_key || ''} onChange={(e) => setNewKey(prev => ({ ...prev, api_key: e.target.value }))} placeholder="sk-..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">每日限额</label>
                <Input type="number" value={newKey.daily_limit || 0} onChange={(e) => setNewKey(prev => ({ ...prev, daily_limit: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">优先级</label>
                <Input type="number" value={newKey.priority || 0} onChange={(e) => setNewKey(prev => ({ ...prev, priority: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
              <Button onClick={handleAdd}>添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(' ')
}
