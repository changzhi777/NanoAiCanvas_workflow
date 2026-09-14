'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Key, Copy, Trash2, RefreshCw, TestTube2, Loader2, Heart, Activity, Radar } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import {
  getAPIKeys,
  createAPIKey,
  deleteAPIKey,
  updateAPIKey,
  testAPIKey,
  heartbeatAPIKey,
  scanKeyModels,
  scanAllKeyModels,
  getHealthSummary,
  getProviders,
  type APIKey,
  type APIKeyCreate,
  type Provider,
} from '@/lib/api/admin-api'

type HealthSummary = {
  total: number
  active: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}

const HEALTH_DOT: Record<string, { color: string; label: string }> = {
  healthy: { color: 'bg-green-500', label: '健康' },
  degraded: { color: 'bg-yellow-500', label: '降级' },
  down: { color: 'bg-red-500', label: '离线' },
  unknown: { color: 'bg-gray-400', label: '未知' },
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 60000) return '刚刚'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ApiKeyPoolPage() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [scanningAll, setScanningAll] = useState(false)
  const [testResult, setTestResult] = useState<{
    keyId: number
    keyName: string
    result: {
      is_success: boolean
      response_time_ms: number
      error_message?: string
      health_status: string
      tested_at: string
    }
  } | null>(null)

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
      const [keyList, providerList, healthData] = await Promise.all([
        getAPIKeys(),
        getProviders(),
        getHealthSummary().catch(() => null),
      ])
      setKeys(keyList)
      setProviders(providerList)
      setHealth(healthData)
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

  const handleTest = async (id: number, name: string) => {
    setActionLoading(id)
    try {
      const result = await testAPIKey(id)
      if (result.is_success) {
        toast.success(`${name} 测试通过 (${result.response_time_ms}ms)`)
      } else {
        toast.error(`${name} 测试失败: ${result.error_message || '未知错误'}`)
      }
      setTestResult({ keyId: id, keyName: name, result })
      loadData()
    } catch {
      toast.error('测试请求失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleHeartbeat = async (id: number) => {
    try {
      await heartbeatAPIKey(id)
      toast.success('心跳已发送')
      loadData()
    } catch {
      toast.error('心跳发送失败')
    }
  }

  const handleScanModels = async (id: number, name: string) => {
    setActionLoading(id)
    try {
      const result = await scanKeyModels(id)
      toast.success(`${name}：检测到 ${result.detected_models.length} 个模型`)
      setKeys(prev => prev.map(k => k.id === id ? { ...k, detected_models: result.detected_models, last_scan_at: result.scanned_at } : k))
    } catch {
      toast.error('扫描失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleScanAll = async () => {
    setScanningAll(true)
    try {
      const result = await scanAllKeyModels()
      toast.success(`扫描完成：${result.total_scanned} 个 Key`)
      loadData()
    } catch {
      toast.error('批量扫描失败')
    } finally {
      setScanningAll(false)
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

      {/* 健康概览 */}
      {health && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '总计', value: health.total, icon: Key, color: 'text-foreground' },
            { label: '健康', value: health.healthy, icon: Activity, color: 'text-green-500' },
            { label: '降级', value: health.degraded, icon: Activity, color: 'text-yellow-500' },
            { label: '离线', value: health.down, icon: Activity, color: 'text-red-500' },
            { label: '未知', value: health.unknown, icon: Activity, color: 'text-gray-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="py-3">
              <CardContent className="flex items-center gap-3 px-4 py-0">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索 Key 名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          刷新
        </Button>
        <Button variant="outline" onClick={handleScanAll} disabled={scanningAll}>
          {scanningAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
          {scanningAll ? '扫描中...' : '扫描全部'}
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
                  <TableHead>可用模型</TableHead>
                  <TableHead>健康</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>今日用量</TableHead>
                  <TableHead>最近测试</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((key) => {
                  const h = HEALTH_DOT[key.health_status] || HEALTH_DOT.unknown
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>{getProviderName(key.provider_id)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {(key.detected_models || []).length > 0 ? (
                            key.detected_models.map((m: string) => (
                              <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                {m}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">未扫描</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5" title={h.label}>
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${h.color}`} />
                          <span className="text-xs text-muted-foreground">{h.label}</span>
                          {key.last_response_ms != null && (
                            <span className="text-xs text-muted-foreground">({key.last_response_ms}ms)</span>
                          )}
                        </div>
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
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(key.last_test_at)}
                          {key.last_test_at && (
                            <span className={key.last_test_success ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                              {key.last_test_success ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(key.key_preview || '')} title="复制">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleScanModels(key.id, key.name)} disabled={actionLoading === key.id} title="扫描模型">
                            {actionLoading === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleTest(key.id, key.name)} disabled={actionLoading === key.id} title="测试">
                            {actionLoading === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleHeartbeat(key.id)} title="心跳保活">
                            <Heart className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)} title="删除">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      {/* 测试结果弹窗 */}
      <Dialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube2 className="w-5 h-5" />
              测试结果 — {testResult?.keyName}
            </DialogTitle>
          </DialogHeader>
          {testResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">状态</span>
                <Badge variant={testResult.result.is_success ? 'default' : 'destructive'}>
                  {testResult.result.is_success ? '通过' : '失败'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">健康状态</span>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${(HEALTH_DOT[testResult.result.health_status] || HEALTH_DOT.unknown).color}`} />
                  <span className="text-sm">{(HEALTH_DOT[testResult.result.health_status] || HEALTH_DOT.unknown).label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">响应时间</span>
                <span className="text-sm font-mono">{testResult.result.response_time_ms}ms</span>
              </div>
              {testResult.result.error_message && (
                <div>
                  <span className="text-sm text-muted-foreground">错误信息</span>
                  <p className="text-sm text-destructive mt-1 bg-destructive/10 px-3 py-2 rounded">{testResult.result.error_message}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">测试时间</span>
                <span className="text-sm">{new Date(testResult.result.tested_at).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(' ')
}
